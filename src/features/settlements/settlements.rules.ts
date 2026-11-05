import { type Ticket,type TicketStatus } from "./settlements.types";

export const STATUS_TICKET_LABEL: Record<TicketStatus, string> = {
  pendiente: "Solicitado",
  aprobado: "Oferta recibida",
  aceptado: "Aceptado",
  cancelado: "Cancelado",
  rechazado: "Rechazado",
  acreditado: "Acreditado",
  compensado: "Compensado",
};
export const STATUS_TICKET_TONE: Record<TicketStatus, "neutral" | "success" | "warn" | "danger"> = {
  pendiente: "warn",
  aprobado: "warn",
  aceptado: "neutral",
  cancelado: "neutral",
  rechazado: "danger",
  acreditado: "success",
  compensado: "success",
};

/** Lo que falta descontar de un adelanto acreditado. */
export function pendingCompensar(t: Ticket) {
  if (t.estado !== "acreditado" && t.estado !== "compensado") return 0;
  return Math.max(0, Number(t.montoOfertado ?? t.montoSolicitado) - Number(t.compensado ?? 0));
}

export function fmtDate(iso: string) {
  if (!iso) return "—";
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" });
}
export function fmtDateFull(iso: string) {
  if (!iso) return "—";
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });
}
export function toISO(d: Date) {
  return d.toISOString().slice(0, 10);
}
export function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

// ============================================================================
// CalendarioAcreditacionesTab
// ============================================================================
// Grilla mensual 7×N con desglose del día. Mismo shape que la pantalla
// admin/calendario-acreditaciones pero filtrado al comercio del usuario
// logueado y con textos/acciones del lado commerce.
//
// Datos: consume las RPCs `calendario_acreditaciones_v2`,
// `calendario_adelantos_por_dia`, `calendario_exportar_dia` y
// `calendario_resumen_saldos` (las 4 viven en el mismo proyecto Supabase).
// ============================================================================

export const DAYS_SEMANA_CAL = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
export const MONTHS_CAL = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

export function isoLocal(d: Date) {
  const p = (x: number) => String(x).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** Para la empresa un lote es Programado (Payway todavia no pago o falta acreditar) o Acreditado. */
export function statusCompany(status: string): "Programada" | "Acreditada" {
  return status === "Acreditado" ? "Acreditada" : "Programada";
}

export function rangeDefault() {
  const h = new Date();
  const d = new Date(h);
  d.setDate(d.getDate() - 60);
  const f = new Date(h);
  f.setDate(f.getDate() + 60);
  return { desde: isoLocal(d), hasta: isoLocal(f) };
}
