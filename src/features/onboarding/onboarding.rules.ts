import { CUSTOMER_STATUSES,type CustomerStatus } from "./onboarding.types";

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
