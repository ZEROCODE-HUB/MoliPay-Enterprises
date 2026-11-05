import { getSignedDocUrls } from "@/infrastructure/file-storage/signed-document-urls";
import { requireSupabase } from "@/infrastructure/supabase/client";
import { invokeEdgeFunction } from "@/infrastructure/supabase/edge-functions";
import { toAppError } from "@/infrastructure/supabase/errors";
import { AppError, isAppError } from "@/shared/lib/errors";
import { fileToBase64 } from "@/shared/lib/file";
import { controlTypeLabel, memberRoleLabel, normalizeCustomerStatus } from "./onboarding.rules";
import {
  KYC_DOCUMENTS,
  type AccountType,
  type BeneficialOwner,
  type CompanyMember,
  type KycDocument,
  type KycFiles,
  type OnboardingApplication,
  type OnboardingDocument,
  type OnboardingProfile,
  type OnboardingStatus,
  type OnboardingSubmission,
  type Registration,
} from "./onboarding.types";

/*
 * Sin contrato: lo usa solo onboarding.hooks.ts.
 * Alta, verificacion y envio del KYC: Edge Functions (registrar-cliente, verificar-correo,
 * reenviar-verificacion, crear-cliente). Precarga: tabla clientes del usuario logueado.
 */

const context = (operation: string) => ({ context: { feature: "onboarding", operation } });

/** Las Edge Functions y la tabla clientes usan "fisica" / "juridica". */
const DB_ACCOUNT_TYPE: Record<AccountType, "fisica" | "juridica"> = {
  individual: "fisica",
  company: "juridica",
};
export const toAccountType = (v: string | null | undefined): AccountType | null =>
  v === "juridica" ? "company" : v === "fisica" ? "individual" : null;

/** Documento del KYC -> nombre que espera crear-cliente / tipo en la tabla documentos. */
const DOCUMENT_FIELD: Record<KycDocument, string> = {
  idFront: "dniFrente",
  idBack: "dniDorso",
  utilityBill: "servicio",
  selfie: "selfie",
};
const DOCUMENT_BY_DB_TYPE: Record<string, KycDocument> = {
  id_frente: "idFront",
  id_dorso: "idBack",
  servicio: "utilityBill",
  selfie: "selfie",
};

// --- Alta y verificacion --------------------------------------------------------

export async function registerCustomer(
  registration: Registration & { password: string },
  accountType: AccountType,
) {
  try {
    await invokeEdgeFunction(
      "registrar-cliente",
      {
        email: registration.email,
        password: registration.password,
        nombre: registration.firstName,
        apellido: registration.lastName,
        fechaNac: registration.birthDate,
        tipoCuenta: DB_ACCOUNT_TYPE[accountType],
      },
      context("register"),
    );
  } catch (e) {
    // Por si la Edge Function devuelve el texto de Supabase Auth sin traducir.
    if (isAppError(e) && /already.*registered/i.test(e.message))
      throw new AppError("conflict", "Ya existe una cuenta con ese correo.", {
        field: "email",
        context: e.context,
        cause: e,
      });
    throw e;
  }
}

export const verifyEmail = (token: string) =>
  invokeEdgeFunction("verificar-correo", { token }, context("verify_email"));

export const resendVerification = (email: string) =>
  invokeEdgeFunction("reenviar-verificacion", { email }, context("resend_verification"));

export async function submitOnboarding(s: OnboardingSubmission): Promise<void> {
  const kyc: Record<string, Awaited<ReturnType<typeof fileToBase64>> | null> = {};
  for (const doc of KYC_DOCUMENTS) {
    const file = s.documents[doc]?.file;
    kyc[DOCUMENT_FIELD[doc]] = file ? await fileToBase64(file) : null;
  }
  await invokeEdgeFunction(
    "crear-cliente",
    {
      email: s.email,
      tipoCuenta: DB_ACCOUNT_TYPE[s.accountType],
      nombre: s.name,
      cuit: s.cuit,
      perfil: s.profile,
      kyc,
    },
    context("submit"),
  );
}

// --- Precarga -----------------------------------------------------------------------

type ProfileRow = {
  legajo: string;
  tipo_persona: string | null;
  genero: string | null;
  cuit_cuil: string | null;
  ocupacion: string | null;
  origen_fondos: string | null;
  es_pep: boolean | null;
  cuit: string | null;
  fecha_inscripcion: string | null;
  tipo_sociedad: string | null;
  nombre_legal: string | null;
  nombre_fantasia: string | null;
  direccion: string | null;
  direccion2: string | null;
  ciudad: string | null;
  provincia: string | null;
  cp: string | null;
};

const PROFILE_COLUMNS =
  "legajo, tipo_persona, genero, cuit_cuil, ocupacion, origen_fondos, es_pep, cuit, fecha_inscripcion, tipo_sociedad, nombre_legal, nombre_fantasia, direccion, direccion2, ciudad, provincia, cp";

const orUndefined = <T>(v: T | null) => v ?? undefined;

export const toOnboardingProfile = (r: ProfileRow): OnboardingProfile => ({
  legajo: r.legajo,
  accountType: toAccountType(r.tipo_persona),
  personal: {
    gender: orUndefined(r.genero),
    cuit: orUndefined(r.cuit_cuil),
    occupation: orUndefined(r.ocupacion),
    fundsOrigin: orUndefined(r.origen_fondos),
    isPep: r.es_pep ?? undefined,
  },
  company: {
    cuit: orUndefined(r.cuit),
    registrationDate: orUndefined(r.fecha_inscripcion),
    companyType: orUndefined(r.tipo_sociedad),
    legalName: orUndefined(r.nombre_legal),
    tradeName: orUndefined(r.nombre_fantasia),
  },
  address: {
    line1: orUndefined(r.direccion),
    line2: orUndefined(r.direccion2),
    city: orUndefined(r.ciudad),
    province: orUndefined(r.provincia),
    postalCode: orUndefined(r.cp),
  },
});

/** Lo guardado del cliente del email (null si todavia no tiene fila en clientes). */
export async function getOnboardingProfile(
  email: string,
  { signal }: { signal?: AbortSignal } = {},
) {
  let q = requireSupabase().from("clientes").select(PROFILE_COLUMNS).eq("correo", email);
  if (signal) q = q.abortSignal(signal);
  const { data, error } = await q.maybeSingle();
  if (error) throw toAppError(error, context("profile").context);
  return data ? toOnboardingProfile(data as unknown as ProfileRow) : null;
}

/** Documentos ya enviados, con URL firmada para verlos. */
export async function getKycDocuments(legajo: string): Promise<Partial<KycFiles>> {
  const { data, error } = await requireSupabase()
    .from("documentos")
    .select("tipo, url, label")
    .eq("cliente_legajo", legajo)
    .neq("status", "superseded");
  if (error) throw toAppError(error, context("documents").context);
  const docs = (data ?? []) as { tipo: string; url: string; label: string | null }[];
  if (docs.length === 0) return {};
  const signed = await getSignedDocUrls(docs.map((d) => d.url));
  const files: Partial<KycFiles> = {};
  for (const d of docs) {
    const key = DOCUMENT_BY_DB_TYPE[d.tipo];
    if (key)
      files[key] = {
        name: d.label || d.url.split("/").pop() || d.tipo,
        url: signed[d.url] ?? undefined,
      };
  }
  return files;
}

/** Estado del alta para la pantalla "en proceso". */
export async function getOnboardingStatus(
  email: string,
  { signal }: { signal?: AbortSignal } = {},
): Promise<OnboardingStatus> {
  const sb = requireSupabase();
  let q = sb.from("clientes").select("estado, legajo").eq("correo", email);
  if (signal) q = q.abortSignal(signal);
  const { data: customer, error } = await q.maybeSingle();
  if (error) throw toAppError(error, context("status").context);
  if (!customer) return { status: null, hasSubmittedDocuments: false };
  const [validation, document] = await Promise.all([
    sb
      .from("validaciones")
      .select("id")
      .eq("cliente_legajo", customer.legajo)
      .limit(1)
      .maybeSingle(),
    sb.from("documentos").select("id").eq("cliente_legajo", customer.legajo).limit(1).maybeSingle(),
  ]);
  return {
    status: customer.estado ? normalizeCustomerStatus(customer.estado as string) : null,
    hasSubmittedDocuments: !!validation.data || !!document.data,
  };
}

// --- Empresa: integrantes, beneficiarios y documentacion -----------------------------

type DeclaredRow = { declared: Record<string, unknown> };
const nameOf = (r: DeclaredRow) =>
  `${String(r.declared.first_name ?? "")} ${String(r.declared.last_name ?? "")}`.trim();

async function rpc<T>(name: string, args: Record<string, unknown> = {}): Promise<T> {
  const { data, error } = await requireSupabase().rpc(name, args);
  if (error) throw toAppError(error, context(name).context);
  return data as T;
}

export async function listCompanyMembers(): Promise<CompanyMember[]> {
  const rows =
    await rpc<
      (DeclaredRow & { id: string; submission_id: string; role: string; review_state: string })[]
    >("my_company_members");
  return (rows ?? []).map((r) => ({
    id: r.id,
    submissionId: r.submission_id,
    role: r.role,
    roleLabel: memberRoleLabel(r.role),
    reviewState: r.review_state,
    name: nameOf(r),
  }));
}

export async function listBeneficialOwners(): Promise<BeneficialOwner[]> {
  const rows = await rpc<
    (DeclaredRow & {
      id: string;
      submission_id: string;
      control_type: string;
      ownership_pct: number | null;
      review_state: string;
    })[]
  >("my_beneficial_owners");
  return (rows ?? []).map((r) => ({
    id: r.id,
    submissionId: r.submission_id,
    controlLabel: controlTypeLabel(r.control_type),
    ownershipPct: r.ownership_pct,
    reviewState: r.review_state,
    name: nameOf(r),
  }));
}

export async function listOnboardingDocuments(): Promise<OnboardingDocument[]> {
  const rows =
    await rpc<
      { id: string; submission_id: string | null; tipo: string; label: string; status: string }[]
    >("my_onboarding_documents");
  return (rows ?? []).map((r) => ({
    id: r.id,
    submissionId: r.submission_id,
    tipo: r.tipo,
    label: r.label,
    status: r.status,
  }));
}

export async function getOnboardingApplication(): Promise<OnboardingApplication | null> {
  const rows = await rpc<{ id: string; status: string; customer_message_code: string | null }[]>(
    "my_onboarding_application",
  );
  const r = rows?.[0];
  return r ? { id: r.id, status: r.status, customerMessageCode: r.customer_message_code } : null;
}

export const declareCompanyMember = (declared: Record<string, unknown>, role: string | undefined) =>
  rpc<string>("company_member_declare", { p_declared: declared, p_role: role });

export const declareBeneficialOwner = (
  declared: Record<string, unknown>,
  control: string | undefined,
  pct: number | null,
  detail: string | null,
) =>
  rpc<string>("beneficial_owner_declare", {
    p_declared: declared,
    p_control_type: control,
    p_pct: pct,
    p_detail: detail,
  });

export const endCompanyMember = (id: string) => rpc("company_member_end", { p_member: id });
export const endBeneficialOwner = (id: string) => rpc("beneficial_owner_end", { p_owner: id });
export const submitApplication = () => rpc<string>("application_submit");

export async function uploadOnboardingDocument(input: {
  tipo: string;
  submissionId: string | null;
  file: File;
}) {
  await invokeEdgeFunction(
    "subir-documento",
    { tipo: input.tipo, submissionId: input.submissionId, file: await fileToBase64(input.file) },
    context("upload_document"),
  );
}
