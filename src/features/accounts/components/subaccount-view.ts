import { STATUS_TO_DB } from "@/features/accounts/accounts.supabase";
import { TYPE_TO_DB } from "@/features/accounts/accounts.supabase";
import { toast } from "sonner";
import { formatMoneyAmount,type Money } from "@/shared/lib/money";
import type {
Subaccount,
SubaccountInput,
SubaccountMovement,
SubaccountStatus,
SubaccountType,
} from "../accounts.types";

/*
 * Modelo de vista de la pantalla de subcuentas: los codigos que muestra la UI
 * (Operativa, Activa, ...) y valores ya listos para pintar. El dominio
 * (accounts.types.ts) queda en ingles y con importes en Money.
 */

export type SubTypeCode = "Operativa" | "Recaudacion" | "Garantias" | "Sueldos";
export type SubStatusCode = "Activa" | "Pausada";

export type Sub = {
  id?: string;
  n: string;
  apellido: string;
  email: string;
  cbu: string;
  tipo: SubTypeCode;
  e: SubStatusCode;
  disp: Money;
  ret: Money;
  conc: Money;
  ing: string;
  egr: string;
  resp: string;
  lim: string;
  color: string;
  retirosHab: boolean;
};

export type Mov = {
  tipo: "ingreso" | "egreso";
  titulo: string;
  txid: string;
  cbu: string;
  entidad: string;
  fecha: string;
  hora: string;
  monto: Money;
};
const TYPE_FROM_CODE: Record<SubTypeCode, SubaccountType> = {
  Operativa: "operating",
  Recaudacion: "collection",
  Garantias: "guarantees",
  Sueldos: "payroll",
};
export const STATUS_FROM_CODE: Record<SubStatusCode, SubaccountStatus> = {
  Activa: "active",
  Pausada: "paused",
};

const PALETTE = ["#6366f1", "#0ea5e9", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

export const toSubView = (s: Subaccount, index: number): Sub => ({
  id: s.id,
  n: s.name,
  apellido: s.lastName,
  email: s.email,
  cbu: s.cvu,
  tipo: TYPE_TO_DB[s.type],
  e: STATUS_TO_DB[s.status],
  disp: s.available,
  ret: s.held,
  conc: s.reconciled,
  ing: s.incomeNote,
  egr: s.expenseNote,
  resp: s.owner,
  lim: s.limit,
  color: PALETTE[index % PALETTE.length],
  retirosHab: s.withdrawalsEnabled,
});

export type SubForm = {
  n: string;
  apellido: string;
  email: string;
  tipo: string;
  resp: string;
  lim: string;
  saldo: string;
  activar: boolean;
};

export const toSubaccountInput = (form: SubForm): SubaccountInput => ({
  name: form.n,
  lastName: form.apellido,
  email: form.email,
  type: TYPE_FROM_CODE[form.tipo as SubTypeCode] ?? "operating",
  owner: form.resp,
  limit: form.lim,
});

export const TITLE_MOV: Record<string, string> = {
  deposito: "Depósito",
  transferencia: "Transferencia",
  cobro_pct: "Cobro QR / Punto de venta",
  retiro: "Retiro",
  pago_pct: "Pago QR",
  tarjeta: "Cobro con tarjeta",
  liquidacion_lote: "Liquidación de lote",
  acreditacion_lote: "Acreditación de lote",
  adelanto: "Adelanto",
  ajuste_manual: "Ajuste de saldo",
};

export const toMovView = (m: SubaccountMovement): Mov => ({
  tipo: m.direction === "expense" ? "egreso" : "ingreso",
  titulo: TITLE_MOV[m.kind] ?? m.kind,
  txid: m.transactionId,
  cbu: m.counterpartyCvu,
  entidad: "MollyPay",
  fecha: m.occurredAt.slice(0, 10),
  hora: m.occurredAt.slice(11, 16),
  monto: m.amount,
});

/** El limite es texto libre ("50000", "50.000,00" o vacio): solo se muestra. */
const formatLimitNumber = (n: number) => "$ " + n.toLocaleString("es-AR");
export const fmtLimit = (lim: string) => {
  const t = (lim ?? "").trim();
  if (!t) return "Sin límite";
  const n = Number(t.includes(",") ? t.replace(/\./g, "").replace(",", ".") : t);
  if (Number.isNaN(n)) return t;
  return n > 0 ? formatLimitNumber(n) : "Sin límite";
};

export const fmtMov = (m: Mov) =>
  `${m.tipo === "ingreso" ? "+" : "-"}${formatMoneyAmount(m.monto)}`;

// Recaudacion es la subcuenta funcional (pool) del sistema; el resto se asigna
// a personas o areas.
export const esPool = (s: Sub) => s.tipo === "Recaudacion";
export const KIND_LABEL: Record<SubTypeCode, string> = {
  Operativa: "Operativa",
  Recaudacion: "Recaudación",
  Garantias: "Garantías",
  Sueldos: "Sueldos",
};

export const copiarCvu = async (cvu: string) => {
  if (!cvu) {
    toast.error("La subcuenta no tiene CVU asignado");
    return;
  }
  try {
    await navigator.clipboard.writeText(cvu);
    toast.success("CVU copiado");
  } catch {
    toast.error("No se pudo copiar el CVU");
  }
};
