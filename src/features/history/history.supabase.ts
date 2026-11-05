import { requireSupabase } from "@/infrastructure/supabase/client";
import { toAppError } from "@/infrastructure/supabase/errors";
import { AppError } from "@/shared/lib/errors";
import { parseEnum } from "@/shared/lib/enum";
import { moneyFromDecimal } from "@/shared/lib/money";
import { onlyDigits } from "@/shared/lib/text";
import { operationKinds,toTransactionStatus } from "./history.rules";
import {
LINE_KINDS,
type HistoryFilters,
type TransactionDetail,
type TransactionLine,
type TransactionLinePage,
} from "./history.types";

/* Feature sin contrato: lo usa solo history.queries.ts. */

type LineRow = {
  line_id: string;
  transaction_id: string;
  id_txn: string;
  legajo: string;
  tipo_operacion: string;
  tipo_linea: string;
  monto: number | string | null;
  fecha: string;
  line_no: number;
  cvu: string | null;
  email: string | null;
  nombre: string | null;
  nombre_destino: string | null;
  cuit: string | null;
  estado_codigo: string | null;
  estado_nombre: string | null;
  detalle: string | null;
};

const LINE_COLUMNS =
  "line_id, transaction_id, id_txn, legajo, tipo_operacion, tipo_linea, monto, fecha, line_no, cvu, email, nombre, nombre_destino, cuit, estado_codigo, estado_nombre, detalle";

export const toTransactionLine = (r: LineRow): TransactionLine => ({
  lineId: r.line_id,
  transactionId: r.transaction_id,
  txid: r.id_txn,
  legajo: r.legajo,
  operationKind: r.tipo_operacion,
  lineKind: parseEnum(r.tipo_linea, LINE_KINDS, "v_transaction_lines.tipo_linea"),
  amount: moneyFromDecimal(r.monto),
  occurredAt: r.fecha,
  lineNo: r.line_no,
  cvu: r.cvu,
  email: r.email,
  name: r.nombre,
  recipientName: r.nombre_destino,
  cuit: r.cuit,
  status: toTransactionStatus(r.estado_nombre ?? r.estado_codigo),
  detail: r.detalle,
});

/** `%texto%` con los comodines y separadores de PostgREST escapados. */
const like = (v: string) => `%${v.trim().replace(/[%_,()]/g, "\\$&")}%`;

export async function listTransactionLines(
  customerLegajo: string,
  f: HistoryFilters,
  { signal }: { signal?: AbortSignal } = {},
): Promise<TransactionLinePage> {
  const from = (f.page - 1) * f.pageSize;
  let q = requireSupabase()
    .from("v_transaction_lines")
    .select(LINE_COLUMNS, { count: "exact" })
    .eq("legajo", customerLegajo);

  if (f.from) q = q.gte("fecha", new Date(f.from + "T00:00:00").toISOString());
  if (f.to) q = q.lte("fecha", new Date(f.to + "T23:59:59").toISOString());
  const kinds = operationKinds(f.operation);
  if (kinds)
    q = kinds.length === 1 ? q.eq("tipo_operacion", kinds[0]) : q.in("tipo_operacion", kinds);
  if (f.lineKind !== "all") q = q.eq("tipo_linea", f.lineKind);
  if (f.subaccountId) q = q.eq("subaccount_id", f.subaccountId);
  if (f.cbu.trim()) q = q.or(`cvu.ilike.${like(f.cbu)},cvu_propio.ilike.${like(f.cbu)}`);
  if (f.txid.trim()) q = q.ilike("id_txn", like(f.txid));
  if (f.recipientName.trim()) q = q.ilike("nombre_destino", like(f.recipientName));
  const cuit = onlyDigits(f.cuit);
  if (cuit) q = q.ilike("cuit", like(cuit));

  // Mas reciente primero; dentro de una operacion, en el orden de sus lineas.
  let ordered = q
    .order("fecha", { ascending: false })
    .order("id_txn", { ascending: true })
    .order("line_no", { ascending: true })
    .range(from, from + f.pageSize - 1);
  if (signal) ordered = ordered.abortSignal(signal);
  const { data, count, error } = await ordered;
  if (error) throw toAppError(error, { feature: "history", operation: "lines" });
  return { rows: ((data ?? []) as unknown as LineRow[]).map(toTransactionLine), total: count ?? 0 };
}

type DetailRow = {
  id_txn: string;
  tipo: string;
  cvu: string | null;
  monto_operacion: number | string | null;
  comision: number | string | null;
  impuesto: number | string | null;
  fecha: string | null;
  legajo: string;
  destinatario_nombre: string | null;
  destinatario_cuit: string | null;
  destinatario_banco: string | null;
  subcuentas: { cbu: string | null } | { cbu: string | null }[] | null;
  estados_movimiento: { codigo: string | null; nombre: string | null } | null;
};

const DETAIL_COLUMNS =
  "id_txn, tipo, cvu, monto_operacion, comision, impuesto, fecha, legajo, destinatario_nombre, destinatario_cuit, destinatario_banco, subcuentas:subaccounts(cbu), estados_movimiento(codigo, nombre)";

const INCOME_KINDS = /cobro|deposito|ingreso|liquidacion|acreditacion|adelanto/;

export function toTransactionDetail(r: DetailRow): TransactionDetail {
  const income = INCOME_KINDS.test(r.tipo);
  const cvu = r.cvu ?? "";
  const counterparty = {
    name: r.destinatario_nombre ?? "",
    cuit: r.destinatario_cuit ?? "",
    bank: r.destinatario_banco ?? "",
  };
  const subaccount = Array.isArray(r.subcuentas) ? r.subcuentas[0] : r.subcuentas;
  return {
    txid: r.id_txn,
    kind: r.tipo,
    direction: income ? "income" : "expense",
    amount: moneyFromDecimal(r.monto_operacion),
    fee: moneyFromDecimal(r.comision),
    tax: moneyFromDecimal(r.impuesto),
    status: toTransactionStatus(r.estados_movimiento?.nombre ?? r.estados_movimiento?.codigo),
    occurredAt: r.fecha ?? "",
    // Lo que se mostraba antes del refactor (la operacion no guarda el CUIT/CBU del origen).
    from: { name: income ? r.legajo : "MoliPay", cuit: "—", cbu: cvu || "—", bank: "" },
    to: income
      ? { name: "MoliPay", cuit: "—", cbu: cvu || "—", bank: "" }
      : {
          name: counterparty.name,
          cuit: counterparty.cuit,
          cbu: cvu || "—",
          bank: counterparty.bank,
        },
    counterparty,
    counterpartyCbu: cvu,
    ownAccountCbu: subaccount?.cbu ?? "",
  };
}

export async function getTransactionDetail(
  transactionId: string,
  { signal }: { signal?: AbortSignal } = {},
): Promise<TransactionDetail> {
  let q = requireSupabase().from("transactions").select(DETAIL_COLUMNS).eq("id", transactionId);
  if (signal) q = q.abortSignal(signal);
  const { data, error } = await q.maybeSingle();
  if (error) throw toAppError(error, { feature: "history", operation: "detail" });
  if (!data)
    throw new AppError("not_found", "No encontramos la operación.", {
      context: { feature: "history", operation: "detail" },
    });
  return toTransactionDetail(data as unknown as DetailRow);
}
