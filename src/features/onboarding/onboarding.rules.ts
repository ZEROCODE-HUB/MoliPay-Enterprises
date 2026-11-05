import { CUSTOMER_STATUSES, type CustomerStatus } from "./onboarding.types";

// --- Catalogos del alta (se guardan tal cual en la base) ----------------------------

export const PROVINCES = [
  "Buenos Aires",
  "CABA",
  "Catamarca",
  "Chaco",
  "Chubut",
  "Córdoba",
  "Corrientes",
  "Entre Ríos",
  "Formosa",
  "Jujuy",
  "La Pampa",
  "La Rioja",
  "Mendoza",
  "Misiones",
  "Neuquén",
  "Río Negro",
  "Salta",
  "San Juan",
  "San Luis",
  "Santa Cruz",
  "Santa Fe",
  "Santiago del Estero",
  "Tierra del Fuego",
  "Tucumán",
];

export const OCCUPATIONS = [
  "Empleado en relación de dependencia",
  "Autónomo / Monotributista",
  "Empresario",
  "Profesional independiente",
  "Jubilado / Pensionado",
  "Estudiante",
  "Otro",
];

export const FUNDS_ORIGINS = [
  "Sueldo",
  "Ahorros",
  "Venta de activos",
  "Herencia",
  "Inversiones",
  "Actividad comercial",
  "Otro",
];

export const COMPANY_TYPES = [
  "Sociedad Anónima (SA)",
  "Sociedad de Responsabilidad Limitada (SRL)",
  "Sociedad por Acciones Simplificada (SAS)",
  "Sociedad Colectiva",
  "Sociedad en Comandita",
  "Cooperativa",
  "Asociación Civil",
  "Otro",
];

/** Tipo de identificacion de la empresa. Lista a confirmar con Compliance. */
export const IDENTIFICATION_TYPES = ["CUIT", "CDI"];

export const DOCUMENT_TYPES = ["DNI", "Pasaporte", "LE", "LC"];

/** Nombre que ve el usuario -> codigo ISO 3166-1 que se guarda. */
export const COUNTRIES: Record<string, string> = {
  Argentina: "AR",
  Bolivia: "BO",
  Brasil: "BR",
  Chile: "CL",
  Colombia: "CO",
  Ecuador: "EC",
  España: "ES",
  "Estados Unidos": "US",
  Italia: "IT",
  Paraguay: "PY",
  Perú: "PE",
  Uruguay: "UY",
  Venezuela: "VE",
};

export const OptionLabel = { yes: "Sí", no: "No" };

/** Caracter del integrante (AFIP F.8126, registro 04) -> valor de la base. */
export const MEMBER_ROLES: Record<string, string> = {
  Titular: "holder",
  Cotitular: "co_holder",
  Apoderado: "attorney",
  "Representante legal": "legal_representative",
  Firmante: "signatory",
};

export const CONTROL_TYPES: Record<string, string> = {
  "Participación directa": "direct_ownership",
  "Participación indirecta": "indirect_ownership",
  "Control por votos": "voting_control",
  "Control de la administración": "management_control",
  Otro: "other",
};

const labelOf = (map: Record<string, string>, value: string) =>
  Object.keys(map).find((k) => map[k] === value) ?? value;
export const memberRoleLabel = (role: string) => labelOf(MEMBER_ROLES, role);
export const controlTypeLabel = (control: string) => labelOf(CONTROL_TYPES, control);

export const COMPANY_DOCUMENTS = [
  { tipo: "estatuto", label: "Estatuto o contrato social" },
  { tipo: "acta_autoridades", label: "Acta de designación de autoridades" },
  { tipo: "constancia_afip", label: "Constancia de inscripción en AFIP" },
];

export const PERSON_DOCUMENTS = [
  { tipo: "id_frente", label: "DNI frente" },
  { tipo: "id_dorso", label: "DNI dorso" },
];

export const REVIEW_STATE_LABEL: Record<string, string> = {
  in_review: "En revisión",
  active: "Aprobado",
  ended: "Finalizado",
};

/** Lo que ve el cliente: nunca el motivo interno. */
export const CUSTOMER_MESSAGES: Record<string, string> = {
  application_not_approved: "No pudimos aprobar tu solicitud.",
  changes_requested: "Necesitamos que revises y vuelvas a enviar tu información.",
};

export const GENDERS = ["Femenino", "Masculino", "No binario", "Prefiero no responder"];

// --- Estado del cliente (maquina homologada con el admin) ------------------------

/** Valores viejos que siguen en la base. */
const LEGACY_STATUS: Record<string, CustomerStatus> = {
  activo: "activado",
  suspendido: "suspendido",
  rechazado: "deshabilitado",
};

/** Estado desconocido = registrado (alta incompleta), igual que en el admin. */
export function normalizeCustomerStatus(raw: string | null | undefined): CustomerStatus {
  const v = (raw ?? "").trim().toLowerCase();
  if ((CUSTOMER_STATUSES as readonly string[]).includes(v)) return v as CustomerStatus;
  return LEGACY_STATUS[v] ?? "registrado";
}

export const CUSTOMER_STATUS_LABEL: Record<CustomerStatus, string> = {
  pendiente_verificacion: "Pendiente de verificación de email",
  registrado: "Registrado",
  preactivado: "Preactivado",
  activado: "Activado",
  suspendido: "Suspendido",
  deshabilitado: "Deshabilitado",
  eliminado: "Eliminado",
};

export const NEXT_ONBOARDING_STEP: Record<CustomerStatus, string> = {
  pendiente_verificacion: "Verificar email para pasar a Registrado",
  registrado: "Completar onboarding y esperar aprobación de documentación",
  preactivado: "Generar CBU y cargar comisión para activar",
  activado: "Usuario operativo",
  suspendido: "Usuario suspendido temporalmente",
  deshabilitado: "Usuario deshabilitado (CBU cancelado, historial conservado)",
  eliminado: "Usuario eliminado (sin movimientos)",
};

/** Mensaje de la pantalla "en proceso" para cada estado. */
export const STATUS_MESSAGE: Record<CustomerStatus, string> = {
  pendiente_verificacion: "Verificá tu correo para pasar a Registrado.",
  registrado:
    "Tu documentación está en revisión. Permanecerás en Registrado hasta que Admin apruebe.",
  preactivado:
    "Documentación aprobada (Preactivado). Falta generar tu CBU y cargar tu comisión para activar.",
  activado: "Tu cuenta ya está Activada. Podés operar.",
  suspendido: "Tu cuenta está Suspendida temporalmente. Contactá a soporte.",
  deshabilitado:
    "Tu cuenta fue Deshabilitada. CBU cancelado, historial conservado para auditoría BCRA.",
  eliminado: "Tu cuenta fue Eliminada.",
};

// --- Varios -------------------------------------------------------------------------

/** CUIT/CUIL: 11 digitos con digito verificador correcto. */
export function isValidCuit(value: string): boolean {
  const digits = value.replace(/\D/g, "");
  if (digits.length !== 11) return false;
  const weights = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  const sum = weights.reduce((acc, w, i) => acc + w * Number(digits[i]), 0);
  const check = 11 - (sum % 11);
  if (check === 10) return false;
  return (check === 11 ? 0 : check) === Number(digits[10]);
}

/** Datos de una persona como los recibe la base. Lo vacio no se envia. */
export function personDeclared(p: {
  firstName?: string;
  lastName?: string;
  taxId?: string;
  birthDate?: string;
  gender?: string;
  nationality?: string;
  residenceCountry?: string;
  documentType?: string;
  documentNumber?: string;
  line1?: string;
  line2?: string;
  city?: string;
  province?: string;
  postalCode?: string;
  occupation?: string;
  fundsOrigin?: string;
  isPep?: boolean;
}): Record<string, unknown> {
  const nationality = p.nationality ? COUNTRIES[p.nationality] : undefined;
  const hasDocument = !!(nationality && p.documentType && p.documentNumber);
  const raw: Record<string, unknown> = {
    first_name: p.firstName?.trim(),
    last_name: p.lastName?.trim(),
    tax_id: p.taxId?.replace(/\D/g, ""),
    birth_date: p.birthDate,
    gender: p.gender,
    nationality,
    residence_country: p.residenceCountry ? COUNTRIES[p.residenceCountry] : undefined,
    document_country: hasDocument ? nationality : undefined,
    document_type: hasDocument ? p.documentType : undefined,
    document_number: hasDocument ? p.documentNumber?.trim() : undefined,
    address_line1: p.line1,
    address_line2: p.line2,
    city: p.city,
    province: p.province,
    postal_code: p.postalCode,
    occupation: p.occupation,
    funds_origin: p.fundsOrigin,
    is_pep: p.isPep,
  };
  return Object.fromEntries(Object.entries(raw).filter(([, v]) => v !== undefined && v !== ""));
}

export function companyPersonDeclared(v: {
  firstName: string;
  lastName: string;
  taxId: string;
  nationality: string;
  documentType: string;
  documentNumber: string;
  birthDate: string;
  isPep: string;
}): Record<string, unknown> {
  return personDeclared({ ...v, isPep: v.isPep === OptionLabel.yes });
}

/** Lo minimo para enviar. La aprobacion final la controla el servidor. */
export function missingOnboardingItems(
  members: { name: string; role: string; submissionId: string }[],
  owners: { name: string; submissionId: string }[],
  documents: { tipo: string; submissionId: string | null }[],
): string[] {
  const has = (tipo: string, submissionId: string | null) =>
    documents.some((d) => d.tipo === tipo && d.submissionId === submissionId);
  const out: string[] = [];
  if (!members.some((m) => m.role === "legal_representative")) out.push("El representante legal");
  for (const d of COMPANY_DOCUMENTS) if (!has(d.tipo, null)) out.push(d.label);
  for (const person of [...members, ...owners]) {
    for (const d of PERSON_DOCUMENTS) {
      if (!has(d.tipo, person.submissionId)) out.push(`${d.label} de ${person.name}`);
    }
  }
  for (const m of members) {
    if (m.role === "attorney" && !has("poder", m.submissionId)) out.push(`Poder de ${m.name}`);
  }
  return [...new Set(out)];
}

/** El alta usa CUITs provisorios que empiezan con 99: no se muestran como reales. */
export const isProvisionalCuit = (cuit: string | null | undefined) =>
  !!cuit && cuit.startsWith("99");

/** Nombre del cliente para el alta: razon social (empresa) o nombre y apellido. */
export function customerName(
  accountType: "individual" | "company",
  registration: { firstName?: string; lastName?: string },
  legalName?: string,
): string {
  if (accountType === "company") return legalName || registration.firstName || "";
  return `${registration.firstName ?? ""} ${registration.lastName ?? ""}`.trim();
}
