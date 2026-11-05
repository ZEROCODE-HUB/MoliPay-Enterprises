import type { ApiEnvironment,DeliveryStatus,IntegrationStatus } from "./developers.types";

type Tone = "neutral" | "success" | "warn" | "danger";

export const STATUS_LABEL: Record<IntegrationStatus, string> = {
  pending_validation: "Pendiente de validación",
  sandbox: "Sandbox",
  pending_production: "Pase a producción en revisión",
  production: "Producción",
  suspended: "Suspendida",
  revoked: "Revocada",
};

/** Texto de la pantalla de configuracion (api-config) para cada estado. */
export const STATUS_DESCRIPTION: Record<IntegrationStatus, string> = {
  pending_validation: "Tu solicitud está pendiente de validación.",
  sandbox: "Tu Sandbox está activo: podés probar la API sin mover dinero real.",
  pending_production: "Pediste el pase a producción y MoliPay lo está revisando.",
  production: "La API está habilitada en Producción para tu cuenta.",
  suspended: "La API está suspendida para tu cuenta. Consultá a soporte.",
  revoked: "Tu integración fue revocada. Podés empezar de nuevo con un Sandbox.",
};

export function statusTone(status: IntegrationStatus | undefined): Tone {
  if (status === "production") return "success";
  if (status === "suspended" || status === "revoked") return "danger";
  if (status === "pending_production" || status === "pending_validation") return "warn";
  return "neutral";
}

export const ENVIRONMENT_LABEL: Record<ApiEnvironment, string> = {
  sandbox: "Sandbox",
  production: "Producción",
};

export const DELIVERY_STATUS_LABEL: Record<DeliveryStatus, string> = {
  pending: "Pendiente",
  sending: "Enviando",
  succeeded: "Exitoso",
  retrying: "Reintentando",
  failed: "Fallido",
};

export const deliveryTone = (s: DeliveryStatus): Tone =>
  s === "succeeded" ? "success" : s === "failed" ? "danger" : "warn";

export const WEBHOOK_EVENT_LABEL: Record<string, string> = {
  "cobro.aprobado": "Cobro aprobado",
  "cobro.rechazado": "Cobro rechazado",
  "transferencia.acreditada": "Transferencia acreditada",
  "lote.acreditado": "Lote acreditado",
  "contracargo.notificado": "Contracargo notificado",
  "contracargo.resuelto": "Contracargo resuelto",
};

export const DEFAULT_WEBHOOK_EVENTS = ["cobro.aprobado"];

/** Que puede hacer el comercio en cada ambiente segun el estado de la integracion. */
export function environmentAccess(
  status: IntegrationStatus | undefined,
  environment: ApiEnvironment,
) {
  const productionEnabled = status === "production";
  const suspended = status === "suspended";
  const environmentOpen = environment === "sandbox" || productionEnabled;
  return {
    productionEnabled,
    suspended,
    canGenerateKeys: environmentOpen && !suspended,
    canConfigureWebhooks: !!status && !suspended && status !== "revoked" && environmentOpen,
    canRequestProduction: status === "sandbox",
  };
}

/** Pasos del checklist "Estado de la integracion". */
export function integrationChecklist(
  status: IntegrationStatus | undefined,
  hasWebhook: boolean,
): [string, boolean][] {
  return [
    ["Sandbox activo", !!status && status !== "pending_validation" && status !== "revoked"],
    ["Pase a producción solicitado", status === "pending_production" || status === "production"],
    ["Producción habilitada", status === "production"],
    ["Webhook configurado", hasWebhook],
  ];
}

/** El modulo esta en uso (se puede entrar a "API e integraciones" sin habilitarlo). */
export const isApiModuleEnabled = (status: IntegrationStatus | undefined) =>
  !!status && status !== "revoked" && status !== "pending_validation";

export const parseIpList = (text: string) =>
  text
    .split(/[\s,;]+/)
    .map((ip) => ip.trim())
    .filter(Boolean);

export const formatShortDateTime = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" }) : "—";
