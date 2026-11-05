import {
countMovementsThisMonth,
getAccountCustomer,
listAccountDocuments,
updateAccountCustomer,
} from "../account.supabase";
import { useSessionUser } from "@/features/session/session.hooks";
import { useEffect,useState } from "react";
import { useOnboardingDraft } from "@/features/onboarding/onboarding.hooks";
import {
CUSTOMER_STATUS_LABEL as ESTADO_LABEL,
normalizeCustomerStatus as normalizarEstado,
} from "@/features/onboarding/onboarding.rules";
import { toast } from "sonner";
import { Activity,Shield,TrendingUp,User } from "lucide-react";
import { type DocReal } from "@/features/account/account.types";
import { KIND_LABEL,kindOf } from "@/features/account/account.rules";

/** Estado y acciones de AccountPage: el componente solo dibuja. */
export function useAccountPage() {
  const sessionEmail = useSessionUser().user?.email ?? "";
  const [cbuPreview, setCbuPreview] = useState(false);
  const [docPreview, setDocPreview] = useState<DocReal | null>(null);
  const [kycDocs, setKycDocs] = useState<DocReal[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(true);
  const [customer, setCustomer] = useState<any | null>(null);
  const [movCount, setMovCount] = useState(0);
  const [form, setForm] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const draft = useOnboardingDraft();
  const accountType =
    draft.accountType === "company"
      ? "juridica"
      : draft.accountType === "individual"
        ? "fisica"
        : null;
  const emailValidated = draft.emailVerified;
  const record = { email: draft.registration.email, fechaNac: draft.registration.birthDate };
  const dataPersonales = {
    genero: draft.personalData.gender,
    cuitCuil: draft.personalData.cuit,
    ocupacion: draft.personalData.occupation,
    origenFondos: draft.personalData.fundsOrigin,
    esPEP: draft.personalData.isPep,
  };
  const dataCompany = {
    nombreLegal: draft.companyData.legalName,
    nombreFantasia: draft.companyData.tradeName,
    cuit: draft.companyData.cuit,
    tipoId: draft.companyData.companyType,
    fechaInscripcion: draft.companyData.registrationDate,
  };
  const kyc = {
    direccion: draft.address.line1,
    direccion2: draft.address.line2,
    ciudad: draft.address.city,
    provincia: draft.address.province,
    cp: draft.address.postalCode,
  };

  const isPJ = customer?.tipo_persona
    ? customer.tipo_persona === "juridica"
    : accountType === "juridica";
  const statusNorm = customer?.estado
    ? normalizarEstado(customer.estado as string)
    : emailValidated
      ? ("registrado" as const)
      : ("pendiente_verificacion" as const);
  const statusLabel = ESTADO_LABEL[statusNorm];
  const approved = statusNorm === "activado";

  const [userName, userApellido] = (customer?.nombre ?? "").split(" ");
  const userEmail = customer?.correo ?? record.email ?? "";
  const userNac = customer?.fecha_nacimiento ?? record.fechaNac ?? "";

  const dp = {
    genero: customer?.genero ?? dataPersonales.genero ?? "Femenino",
    cuitCuil: customer?.cuit_cuil ?? dataPersonales.cuitCuil ?? "",
    ocupacion: customer?.ocupacion ?? dataPersonales.ocupacion ?? "",
    origenFondos: customer?.origen_fondos ?? dataPersonales.origenFondos ?? "Actividad comercial",
    esPEP: customer?.es_pep ?? dataPersonales.esPEP ?? false,
  };

  const companyInfo = {
    nombreLegal: customer?.nombre_legal ?? dataCompany.nombreLegal ?? "",
    nombreFantasia: customer?.nombre_fantasia ?? dataCompany.nombreFantasia ?? "",
    cuit: customer?.cuit ?? dataCompany.cuit ?? "",
    tipoId: customer?.tipo_sociedad ?? dataCompany.tipoId ?? "Sociedad Anonima (SA)",
    fechaInscripcion: customer?.fecha_inscripcion ?? dataCompany.fechaInscripcion ?? "",
  };

  const dir = {
    direccion: customer?.direccion ?? kyc.direccion ?? "",
    ciudad: customer?.ciudad ?? kyc.ciudad ?? "",
    provincia: customer?.provincia ?? kyc.provincia ?? "",
    cp: customer?.cp ?? (isPJ ? "C1043" : "C1425"),
  };

  const cbu = {
    cbu: customer?.cbu ?? "—",
    alias: customer?.alias ?? "—",
  };

  const customerToForm = (c: any) => {
    const [n, ...rest] = (c.nombre ?? "").split(" ");
    return {
      nombre: n ?? "",
      apellido: rest.join(" "),
      nombreLegal: c.nombre_legal ?? "",
      nombreFantasia: c.nombre_fantasia ?? "",
      cuit: c.cuit ?? "",
      tipo_sociedad: c.tipo_sociedad ?? "",
      fecha_inscripcion: c.fecha_inscripcion ?? "",
      direccion: c.direccion ?? "",
      ciudad: c.ciudad ?? "",
      provincia: c.provincia ?? "",
      cp: c.cp ?? "",
      telefono: c.telefono ?? "",
      actividad: c.actividad ?? "",
      genero: c.genero ?? "",
      cuit_cuil: c.cuit_cuil ?? "",
      fecha_nacimiento: c.fecha_nacimiento ?? "",
      ocupacion: c.ocupacion ?? "",
      origen_fondos: c.origen_fondos ?? "",
      es_pep: c.es_pep ?? false,
    };
  };

  const setF = (k: string, v: any) => setForm((p: typeof form) => ({ ...p, [k]: v }));

  useEffect(() => {
    if (customer) setForm(customerToForm(customer));
  }, [customer]);

  const save = async () => {
    if (!customer) return;
    setSaving(true);
    try {
      const name = `${form.nombre ?? ""} ${form.apellido ?? ""}`.trim();
      const patch = {
        nombre: name,
        nombre_legal: form.nombreLegal || null,
        nombre_fantasia: form.nombreFantasia || null,
        cuit: form.cuit || null,
        tipo_sociedad: form.tipo_sociedad || null,
        fecha_inscripcion: form.fecha_inscripcion || null,
        direccion: form.direccion || null,
        ciudad: form.ciudad || null,
        provincia: form.provincia || null,
        cp: form.cp || null,
        telefono: form.telefono || null,
        actividad: form.actividad || null,
        genero: form.genero || null,
        cuit_cuil: form.cuit_cuil || null,
        fecha_nacimiento: form.fecha_nacimiento || null,
        ocupacion: form.ocupacion || null,
        origen_fondos: form.origen_fondos || null,
        es_pep: !!form.es_pep,
      };
      await updateAccountCustomer(customer.legajo, patch);
      setCustomer({ ...customer, ...patch });
      toast.success("Cambios guardados");
    } catch {
      toast.error("No se pudieron guardar los cambios");
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    (async () => {
      try {
        if (!sessionEmail) return;
        const cli = await getAccountCustomer(sessionEmail);
        setCustomer(cli);
        if (cli) {
          const { docs: rawDocs, signedUrls: urls } = await listAccountDocuments(cli.legajo);
          setKycDocs(
            rawDocs.map((d) => ({
              tipo: KIND_LABEL[d.tipo] ?? d.tipo,
              rawTipo: d.tipo,
              label: d.label ?? d.url,
              url: d.url,
              signedUrl: urls[d.url] ?? null,
              kind: kindOf(d.label ?? d.url, d.url),
              date: d.created_at,
            })),
          );
          setMovCount(await countMovementsThisMonth(cli.legajo));
        }
      } catch {
        // silencioso
      } finally {
        setLoadingDocs(false);
      }
    })();
  }, []);

  const antiguedad = (() => {
    const base = customer?.fecha_alta
      ? new Date(customer.fecha_alta)
      : customer?.created_at
        ? new Date(customer.created_at)
        : null;
    if (!base) return "—";
    const now = new Date();
    const months =
      (now.getFullYear() - base.getFullYear()) * 12 + (now.getMonth() - base.getMonth());
    if (months < 1) return "Reciente";
    if (months < 12) return `${months} meses`;
    const years = Math.floor(months / 12);
    const rem = months % 12;
    return rem
      ? `${years} año${years > 1 ? "s" : ""} ${rem} mes${rem > 1 ? "es" : ""}`
      : `${years} año${years > 1 ? "s" : ""}`;
  })();

  const score = (() => {
    if (!customer) return 86;
    let s = 55;
    if (approved) s += 20;
    if (customer.direccion) s += 8;
    if (customer.telefono) s += 7;
    s += Math.min(10, kycDocs.length * 2.5);
    return Math.min(100, Math.round(s));
  })();

  const stats = [
    {
      icon: Shield,
      label: "Estado KYC",
      value: approved
        ? "Validado"
        : customer?.estado_onboarding === "pendiente"
          ? "Pendiente"
          : customer?.estado_onboarding === "rechazado"
            ? "Rechazado"
            : "Pendiente",
      sub: approved ? "Verificado" : "En revisión",
    },
    { icon: Activity, label: "Transacciones mes", value: movCount.toLocaleString() },
    { icon: User, label: "Antigüedad", value: antiguedad },
    {
      icon: TrendingUp,
      label: "Score de seguridad",
      value: `${score} / 100`,
      sub: "Recomendado: 80+",
    },
  ];
  return {
    cbuPreview,
    setCbuPreview,
    docPreview,
    setDocPreview,
    kycDocs,
    loadingDocs,
    customer,
    form,
    setForm,
    saving,
    isPJ,
    statusNorm,
    statusLabel,
    userName,
    userApellido,
    userEmail,
    userNac,
    dp,
    companyInfo,
    dir,
    cbu,
    customerToForm,
    setF,
    save,
    stats,
  };
}

export type AccountPageVm = ReturnType<typeof useAccountPage>;
