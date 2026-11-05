import { useState, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, CheckCircle2, Circle, Plus, UserRound } from "lucide-react";
import { toast } from "sonner";
import { userMessage } from "@/shared/lib/errors";
import {
  AuthShell,
  Field,
  FileUpload,
  FormTitle,
  PrimaryButton,
  SecondaryButton,
  SelectField,
  Stepper,
} from "@/shared/ui/auth-kit";
import { useSessionUser } from "@/features/session/session.hooks";
import { onboardingKeys, onboardingQueries } from "../onboarding.queries";
import * as api from "../onboarding.supabase";
import {
  COMPANY_DOCUMENTS,
  CONTROL_TYPES,
  MEMBER_ROLES,
  PERSON_DOCUMENTS,
  REVIEW_STATE_LABEL,
  companyPersonDeclared,
  missingOnboardingItems,
} from "../onboarding.rules";
import type { CompanyPersonValues } from "../onboarding.schema";
import type { OnboardingDocument } from "../onboarding.types";
import { BackToLoginLink } from "./back-to-login-link";
import { CompanyPersonForm } from "./company-person-form";

const STEPS = ["Integrantes", "Beneficiarios", "Documentación", "Confirmación"];
const REPRESENTATIVE = "legal_representative";
const ATTORNEY = "attorney";

const STEP_INTRO = [
  {
    title: "Tu parte ya está lista.",
    body: "Como representante legal, tus datos son los únicos obligatorios en este paso. Las demás personas son opcionales por ahora.",
  },
  {
    title: "¿Quién es dueño o controla la empresa?",
    body: "Son las personas físicas con participación o control sobre la empresa. Podés cargarlas ahora o más adelante.",
  },
  {
    title: "Documentación de la empresa.",
    body: "Necesitamos estos tres documentos para validar la empresa. Aceptamos PDF o imagen, de hasta 8 MB.",
  },
  {
    title: "Revisá y enviá.",
    body: "Nuestro equipo revisa los datos y los documentos antes de aprobar la cuenta.",
  },
];

function Notice({ tone, children }: { tone: "error" | "info"; children: ReactNode }) {
  const styles =
    tone === "error"
      ? "border-red-200 bg-red-50 text-red-700"
      : "border-black-100 bg-black-50 text-black-500";
  return (
    <div className={`rounded-sm border p-3 text-xs leading-relaxed ${styles}`}>{children}</div>
  );
}

function SectionHeader({
  title,
  optional,
  text,
}: {
  title: string;
  optional?: boolean;
  text: string;
}) {
  return (
    <div>
      <h2 className="flex items-center gap-2 text-sm font-semibold text-black-800">
        {title}
        {optional && (
          <span className="rounded-full bg-black-50 px-2 py-0.5 text-[0.65rem] font-medium text-black-500">
            Opcional
          </span>
        )}
      </h2>
      <p className="mt-1 text-xs leading-relaxed text-black-400">{text}</p>
    </div>
  );
}

function PersonCard({
  name,
  detail,
  onRemove,
  disabled,
  children,
}: {
  name: string;
  detail: string;
  onRemove?: () => void;
  disabled?: boolean;
  children?: ReactNode;
}) {
  return (
    <div className="rounded-sm border border-black-100 p-4 text-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <UserRound size={18} className="mt-0.5 shrink-0 text-black-400" aria-hidden />
          <div>
            <p className="font-semibold text-black-800">{name}</p>
            <p className="text-xs text-black-400">{detail}</p>
          </div>
        </div>
        {onRemove && (
          <button
            type="button"
            className="text-xs font-semibold text-red-500 hover:underline disabled:opacity-50"
            disabled={disabled}
            onClick={onRemove}
          >
            Quitar
          </button>
        )}
      </div>
      {children}
    </div>
  );
}

function CheckRow({ done, label, detail }: { done: boolean; label: string; detail?: string }) {
  return (
    <li className="flex items-start gap-2.5">
      {done ? (
        <CheckCircle2
          size={18}
          className="mt-0.5 shrink-0 text-emerald-600"
          aria-label="Completo"
        />
      ) : (
        <Circle size={18} className="mt-0.5 shrink-0 text-black-300" aria-label="Sin cargar" />
      )}
      <span>
        <span className="font-medium text-black-800">{label}</span>
        {detail && <span className="block text-xs text-black-400">{detail}</span>}
      </span>
    </li>
  );
}

export function CompanyMembersPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const userId = useSessionUser().user?.id ?? "";
  const [step, setStep] = useState(0);
  const [role, setRole] = useState("");
  const [control, setControl] = useState("");
  const [pct, setPct] = useState("");
  const [detail, setDetail] = useState("");
  const [busy, setBusy] = useState(false);
  const [addingMember, setAddingMember] = useState(false);
  const [addingOwner, setAddingOwner] = useState(false);

  const members = useQuery({ ...onboardingQueries.members(userId), enabled: !!userId });
  const owners = useQuery({ ...onboardingQueries.owners(userId), enabled: !!userId });
  const documents = useQuery({
    ...onboardingQueries.onboardingDocuments(userId),
    enabled: !!userId,
  });
  const memberRows = members.data ?? [];
  const ownerRows = owners.data ?? [];
  const documentRows = documents.data ?? [];

  const representative = memberRows.find((m) => m.role === REPRESENTATIVE);
  const otherMembers = memberRows.filter((m) => m.role !== REPRESENTATIVE);
  const roleOptions = Object.keys(MEMBER_ROLES).filter((l) => MEMBER_ROLES[l] !== REPRESENTATIVE);
  const companyDocsLoaded = COMPANY_DOCUMENTS.filter((d) =>
    documentRows.some((row) => row.tipo === d.tipo && row.submissionId === null),
  ).length;
  const missing = missingOnboardingItems(memberRows, ownerRows, documentRows);

  const run = async (fn: () => Promise<unknown>, done?: string) => {
    setBusy(true);
    try {
      await fn();
      await queryClient.invalidateQueries({ queryKey: onboardingKeys.all(userId) });
      if (done) toast.success(done);
      return true;
    } catch (e) {
      toast.error(userMessage(e));
      return false;
    } finally {
      setBusy(false);
    }
  };

  const fileOf = (tipo: string, submissionId: string | null) =>
    documentRows.find(
      (d: OnboardingDocument) => d.tipo === tipo && d.submissionId === submissionId,
    );

  const upload = (tipo: string, submissionId: string | null) => (value: { file?: File } | null) => {
    const file = value?.file;
    if (file) {
      void run(
        () => api.uploadOnboardingDocument({ tipo, submissionId, file }),
        "Documento cargado",
      );
    }
  };

  const uploads = (items: { tipo: string; label: string }[], submissionId: string | null) =>
    items.map((d) => {
      const current = fileOf(d.tipo, submissionId);
      return (
        <FileUpload
          key={d.tipo}
          label={d.label}
          value={current ? { name: current.label || d.label } : null}
          onChange={upload(d.tipo, submissionId)}
        />
      );
    });

  const addMember = (values: CompanyPersonValues) =>
    run(async () => {
      await api.declareCompanyMember(companyPersonDeclared(values), MEMBER_ROLES[role]);
      setRole("");
      setAddingMember(false);
    }, "Persona agregada. Falta cargar su documento.");

  const addOwner = (values: CompanyPersonValues) =>
    run(async () => {
      await api.declareBeneficialOwner(
        companyPersonDeclared(values),
        CONTROL_TYPES[control],
        pct ? Number(pct) : null,
        detail || null,
      );
      setControl("");
      setPct("");
      setDetail("");
      setAddingOwner(false);
    }, "Beneficiario agregado. Falta cargar su documento.");

  const send = () =>
    void run(() => api.submitApplication(), "Solicitud enviada").then((ok) => {
      if (ok) void navigate({ to: "/onboarding/en-proceso" });
    });

  const nav = (next: string, nextDisabled = false) => (
    <div className="mt-2 flex flex-col gap-3 sm:flex-row">
      {step > 0 && <SecondaryButton onClick={() => setStep(step - 1)}>Atrás</SecondaryButton>}
      <div className="flex-1">
        <PrimaryButton onClick={() => setStep(step + 1)} disabled={nextDisabled}>
          {next}
        </PrimaryButton>
      </div>
    </div>
  );

  return (
    <AuthShell
      leftEyebrow="Paso 6 · Empresa"
      leftTitle={STEP_INTRO[step].title}
      leftBody={STEP_INTRO[step].body}
      step={`Paso ${step + 1} de ${STEPS.length}`}
    >
      <FormTitle eyebrow="KYB · Empresa" title="Personas y documentación" />
      <Stepper steps={STEPS} current={step} />

      {step === 0 && (
        <div className="space-y-5">
          {members.isError && (
            <Notice tone="error">
              No pudimos leer los datos de la empresa. {userMessage(members.error)}
            </Notice>
          )}

          <section className="space-y-3">
            <SectionHeader
              title="Representante legal"
              text="Es obligatorio. Son los datos que cargaste en los pasos anteriores, no hace falta repetirlos."
            />
            {members.isPending ? (
              <p className="text-xs text-black-400">Cargando…</p>
            ) : representative ? (
              <PersonCard
                name={representative.name}
                detail={`Representante legal · ${
                  REVIEW_STATE_LABEL[representative.reviewState] ?? representative.reviewState
                }`}
              />
            ) : (
              <Notice tone="error">
                <p className="flex items-center gap-1.5 font-semibold">
                  <AlertCircle size={14} aria-hidden /> Todavía no guardamos tus datos
                </p>
                <p className="mt-1">
                  Para continuar, volvé a enviar el paso de verificación de identidad.
                </p>
                <button
                  type="button"
                  className="mt-2 font-semibold underline underline-offset-2"
                  onClick={() => void navigate({ to: "/onboarding/kyc" })}
                >
                  Ir a verificación de identidad
                </button>
              </Notice>
            )}
          </section>

          <section className="space-y-3">
            <SectionHeader
              title="Otras personas de la empresa"
              optional
              text="Titulares, cotitulares, apoderados o firmantes. Si no querés cargarlos ahora, podés continuar."
            />
            {otherMembers.map((m) => (
              <PersonCard
                key={m.id}
                name={m.name}
                detail={`${m.roleLabel} · ${REVIEW_STATE_LABEL[m.reviewState] ?? m.reviewState}`}
                disabled={busy}
                onRemove={() => void run(() => api.endCompanyMember(m.id), "Persona quitada")}
              >
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {uploads(
                    [
                      ...PERSON_DOCUMENTS,
                      ...(m.role === ATTORNEY ? [{ tipo: "poder", label: "Poder" }] : []),
                    ],
                    m.submissionId,
                  )}
                </div>
              </PersonCard>
            ))}
            {addingMember ? (
              <CompanyPersonForm
                title="Nueva persona"
                submitLabel="Guardar persona"
                disabled={busy}
                canSubmit={!!role}
                onCancel={() => setAddingMember(false)}
                extra={
                  <SelectField
                    label="Carácter en la empresa"
                    value={role}
                    onChange={setRole}
                    options={roleOptions}
                  />
                }
                onSubmit={addMember}
              />
            ) : (
              <SecondaryButton onClick={() => setAddingMember(true)}>
                <span className="inline-flex items-center gap-1.5">
                  <Plus size={14} aria-hidden /> Agregar persona
                </span>
              </SecondaryButton>
            )}
          </section>

          {nav(otherMembers.length ? "Continuar" : "Continuar sin agregar", !representative)}
        </div>
      )}

      {step === 1 && (
        <div className="space-y-4">
          <SectionHeader
            title="Beneficiarios finales"
            optional
            text="Si también sos dueño de la empresa, cargate acá. Si los dejás para más adelante, nuestro equipo puede pedírtelos antes de aprobar la cuenta."
          />
          {ownerRows.map((o) => (
            <PersonCard
              key={o.id}
              name={o.name}
              detail={`${o.controlLabel}${o.ownershipPct != null ? ` · ${o.ownershipPct}%` : ""} · ${
                REVIEW_STATE_LABEL[o.reviewState] ?? o.reviewState
              }`}
              disabled={busy}
              onRemove={() => void run(() => api.endBeneficialOwner(o.id), "Beneficiario quitado")}
            >
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {uploads(PERSON_DOCUMENTS, o.submissionId)}
              </div>
            </PersonCard>
          ))}
          {addingOwner ? (
            <CompanyPersonForm
              title="Nuevo beneficiario final"
              submitLabel="Guardar beneficiario"
              disabled={busy}
              canSubmit={!!control}
              onCancel={() => setAddingOwner(false)}
              extra={
                <div className="grid gap-4 sm:grid-cols-2">
                  <SelectField
                    label="Tipo de control"
                    value={control}
                    onChange={setControl}
                    options={Object.keys(CONTROL_TYPES)}
                  />
                  <Field
                    label="Participación (%)"
                    type="number"
                    min="0.01"
                    max="100"
                    step="0.01"
                    value={pct}
                    onChange={(e) => setPct(e.target.value)}
                  />
                  {CONTROL_TYPES[control] === "other" && (
                    <Field
                      label="Detalle del control"
                      value={detail}
                      onChange={(e) => setDetail(e.target.value)}
                    />
                  )}
                </div>
              }
              onSubmit={addOwner}
            />
          ) : (
            <SecondaryButton onClick={() => setAddingOwner(true)}>
              <span className="inline-flex items-center gap-1.5">
                <Plus size={14} aria-hidden /> Agregar beneficiario
              </span>
            </SecondaryButton>
          )}
          {nav(ownerRows.length ? "Continuar" : "Continuar sin agregar")}
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <SectionHeader
            title="Documentos de la empresa"
            text="Los tres son obligatorios. Se guardan al elegir cada archivo."
          />
          {uploads(COMPANY_DOCUMENTS, null)}
          {nav("Continuar")}
        </div>
      )}

      {step === 3 && (
        <div className="space-y-5 text-sm">
          <ul className="space-y-3">
            <CheckRow
              done={!!representative}
              label="Representante legal"
              detail={representative?.name ?? "Obligatorio"}
            />
            <CheckRow
              done={otherMembers.length > 0}
              label="Otras personas"
              detail={
                otherMembers.length
                  ? `${otherMembers.length} cargada(s)`
                  : "Opcional: no cargaste ninguna"
              }
            />
            <CheckRow
              done={ownerRows.length > 0}
              label="Beneficiarios finales"
              detail={
                ownerRows.length
                  ? `${ownerRows.length} cargado(s)`
                  : "Pueden pedírtelos antes de aprobar"
              }
            />
            <CheckRow
              done={companyDocsLoaded === COMPANY_DOCUMENTS.length}
              label="Documentos de la empresa"
              detail={`${companyDocsLoaded} de ${COMPANY_DOCUMENTS.length} cargados`}
            />
          </ul>
          {missing.length > 0 ? (
            <Notice tone="error">
              <p className="mb-1 font-semibold">Para enviar, falta:</p>
              <ul className="list-disc space-y-0.5 pl-4">
                {missing.map((m) => (
                  <li key={m}>{m}</li>
                ))}
              </ul>
            </Notice>
          ) : (
            <Notice tone="info">
              Al enviar, nuestro equipo revisa la solicitud. Vas a poder seguir su estado en esta
              misma cuenta.
            </Notice>
          )}
          <div className="flex flex-col gap-3 sm:flex-row">
            <SecondaryButton onClick={() => setStep(2)}>Atrás</SecondaryButton>
            <div className="flex-1">
              <PrimaryButton onClick={send} disabled={busy || missing.length > 0}>
                Enviar solicitud
              </PrimaryButton>
            </div>
          </div>
        </div>
      )}
      <BackToLoginLink />
    </AuthShell>
  );
}
