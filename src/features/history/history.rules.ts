import { getRouteApi } from "@tanstack/react-router";
import type { DataReceipt } from "@/shared/lib/receipt/receipt";
import {
addMoney,
formatMoneyAmount,
moneyFromCents,
sumMoney,
toDecimalString,
type Money,
} from "@/shared/lib/money";
import type {
LineKind,
TransactionDetail,
TransactionLine,
TransactionStatus,
} from "./history.types";

export const STATUS_LABEL: Record<TransactionStatus, string> = {
  credited: "Acreditado",
  pending: "Pendiente",
  rejected: "Rechazado",
};

export const STATUS_TONE: Record<TransactionStatus, "success" | "warn" | "danger"> = {
  credited: "success",
  pending: "warn",
  rejected: "danger",
};

/** APROBADO = la operacion se completo (lo usan el banco y nuestras RPC): cuenta como acreditada. */
export function toTransactionStatus(nameOrCode: string | null | undefined): TransactionStatus {
  const e = (nameOrCode ?? "").toLowerCase();
  if (e.includes("acredit") || e.includes("aprob")) return "credited";
  if (e.includes("rechaz")) return "rejected";
  return "pending";
}

const OPERATION_LABEL: Record<string, string> = {
  cobro_pct: "Cobros con QR",
  cobro_link: "Cobros con Tarjeta",
  deposito: "Ingresos",
  transferencia: "Egresos",
  retiro: "Egresos",
  comision: "Comisiones",
  // Operaciones internas registradas por el ledger.
  liquidacion_lote: "Liquidación de lote",
  acreditacion_lote: "Acreditación de lote",
  adelanto: "Adelanto",
  ajuste_manual: "Ajuste de saldo",
};

export const operationLabel = (kind: string) =>
  OPERATION_LABEL[kind] ?? (kind ? kind.charAt(0).toUpperCase() + kind.slice(1) : "Movimiento");

/** Filtro "Operación": clave visible -> transactions.tipo que incluye (null = todas). */
export const OPERATION_FILTERS: Array<{ key: string; label: string; kinds: string[] | null }> = [
  { key: "all", label: "Todas", kinds: null },
  { key: "transfers", label: "Transferencias", kinds: ["transferencia"] },
  { key: "deposits", label: "Depósitos", kinds: ["deposito"] },
  { key: "withdrawals", label: "Retiros", kinds: ["retiro"] },
  { key: "card", label: "Cobros con Tarjeta", kinds: ["cobro_link", "tarjeta"] },
  { key: "qr-collections", label: "Cobros con QR", kinds: ["cobro_pct"] },
  { key: "qr-payments", label: "Pagos con QR", kinds: ["pago_pct"] },
  { key: "settlements", label: "Liquidación de lote", kinds: ["liquidacion_lote"] },
  { key: "credits", label: "Acreditación de lote", kinds: ["acreditacion_lote"] },
  { key: "advances", label: "Adelantos", kinds: ["adelanto"] },
  { key: "adjustments", label: "Ajustes de saldo", kinds: ["ajuste_manual"] },
];

export const operationKinds = (key: string) =>
  OPERATION_FILTERS.find((o) => o.key === key)?.kinds ?? null;

export const LINE_KIND_OPTIONS: Array<{ key: LineKind | "all"; label: string }> = [
  { key: "all", label: "Todos" },
  { key: "ingreso", label: "Ingreso" },
  { key: "egreso", label: "Egreso" },
  { key: "comision", label: "Comisión" },
  { key: "impuesto", label: "Impuesto" },
  { key: "interes", label: "Interés" },
  { key: "reverso", label: "Reverso" },
];

const LINE_KIND_LABEL = new Map(LINE_KIND_OPTIONS.map((t) => [t.key, t.label]));

/** Las lineas de impuesto muestran cual (IVA, DyC, IIBB) con su alicuota. */
export const lineLabel = (l: Pick<TransactionLine, "lineKind" | "detail">) =>
  l.lineKind === "impuesto" && l.detail
    ? l.detail
    : (LINE_KIND_LABEL.get(l.lineKind) ?? l.lineKind);

export const LINE_KIND_STYLE: Record<LineKind, string> = {
  ingreso: "bg-emerald-50 text-emerald-700 border-emerald-200",
  egreso: "bg-red-50 text-red-700 border-red-200",
  comision: "bg-amber-50 text-amber-700 border-amber-200",
  impuesto: "bg-violet-50 text-violet-700 border-violet-200",
  interes: "bg-sky-50 text-sky-700 border-sky-200",
  reverso: "bg-slate-100 text-slate-700 border-slate-300",
};

/** "+ $ 1.234,50" / "- $ 10,00" */
export const formatSignedMoney = (m: Money) =>
  `${m.cents >= 0 ? "+" : "-"} ${formatMoneyAmount(moneyFromCents(Math.abs(m.cents)))}`;

/** Totales de la pagina visible (en centavos). Pendientes/rechazados se cuentan por operacion. */
export function lineTotals(lines: TransactionLine[]) {
  const income = lines.filter((l) => l.amount.cents > 0);
  const expense = lines.filter((l) => l.amount.cents < 0);
  const incomeTotal = sumMoney(income.map((l) => l.amount));
  const expenseTotal = moneyFromCents(-sumMoney(expense.map((l) => l.amount)).cents);
  const pending = new Set(lines.filter((l) => l.status === "pending").map((l) => l.txid));
  const rejected = new Set(lines.filter((l) => l.status === "rejected").map((l) => l.txid));
  return {
    income: incomeTotal,
    incomeCount: income.length,
    expense: expenseTotal,
    expenseCount: expense.length,
    net: moneyFromCents(incomeTotal.cents - expenseTotal.cents),
    pendingCount: pending.size,
    rejectedCount: rejected.size,
  };
}

/** Transferencias y retiros debitan ademas comision e impuesto. */
export const chargesFees = (d: Pick<TransactionDetail, "kind">) =>
  d.kind === "transferencia" || d.kind === "retiro";

export const debitedTotal = (d: TransactionDetail) =>
  chargesFees(d) ? addMoney(addMoney(d.amount, d.fee), d.tax) : d.amount;

export type ReceiptOwner = { name: string; cuit: string; cbu: string };

/**
 * Datos del comprobante. Solo lo que realmente tenemos: lo que la operacion
 * no guarda va vacio, nunca se inventa.
 */
export function toReceipt(d: TransactionDetail, owner: ReceiptOwner): DataReceipt {
  // La cuenta propia sale de la operacion; si es vieja y no la tiene, la del cliente.
  const me = { nombre: owner.name, cuit: owner.cuit, cbu: d.ownAccountCbu || owner.cbu };
  const other = {
    nombre: d.counterparty.name,
    cuit: d.counterparty.cuit,
    cbu: d.counterpartyCbu,
    banco: d.counterparty.bank || undefined,
  };
  const isExpense = d.direction === "expense";
  return {
    fecha: d.occurredAt,
    // El comprobante trabaja en pesos (number): conversion solo en este borde.
    monto: Number(toDecimalString(d.amount)),
    comision: Number(toDecimalString(d.fee)),
    impuesto: Number(toDecimalString(d.tax)),
    estado: STATUS_LABEL[d.status],
    txid: d.txid,
    // "Yo" es el dueño de la cuenta: en un egreso soy el origen, en un ingreso el destino.
    desde: isExpense ? me : other,
    hacia: isExpense ? other : me,
  };
}

/** CBU para el comprobante: solo si todas las cuentas del cliente comparten uno. */
export function singleAccountCbu(cbus: Array<string | null | undefined>): string {
  const unique = [...new Set(cbus.filter(Boolean))];
  return unique.length === 1 ? String(unique[0]) : "";
}

export const route = getRouteApi("/app/historial");
export const PAGE_SIZE = 25;
