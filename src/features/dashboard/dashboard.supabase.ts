import { requireSupabase } from "@/infrastructure/supabase/client";
import { toAppError } from "@/infrastructure/supabase/errors";
import { moneyFromDecimal } from "@/shared/lib/money";
import type { DashboardTransaction,DateRange } from "./dashboard.types";

/* Feature sin contrato: lo usa solo dashboard.queries.ts. */

type TransactionRow = {
  tipo: string;
  monto_operacion: number | string | null;
  fecha: string | null;
  estados_movimiento?: { codigo: string } | { codigo: string }[] | null;
};

/** Movimientos que no movieron plata: no cuentan en el resumen ni en el grafico. */
const NOT_SETTLED = new Set(["RECHAZADO", "CANCELADO"]);

const statusCode = (r: TransactionRow) => {
  const s = Array.isArray(r.estados_movimiento) ? r.estados_movimiento[0] : r.estados_movimiento;
  return s?.codigo?.toUpperCase() ?? "";
};

export function toDashboardTransaction(r: TransactionRow): DashboardTransaction {
  const amount = moneyFromDecimal(r.monto_operacion);
  return { kind: r.tipo, amount: { cents: Math.abs(amount.cents) }, occurredAt: r.fecha ?? "" };
}

export async function listTransactionsInRange(
  customerLegajo: string,
  range: DateRange,
  { signal }: { signal?: AbortSignal } = {},
): Promise<DashboardTransaction[]> {
  let query = requireSupabase()
    .from("transactions")
    .select("tipo, monto_operacion, fecha, estados_movimiento(codigo)")
    .eq("legajo", customerLegajo)
    .gte("fecha", range.start.toISOString())
    .lte("fecha", range.end.toISOString());
  if (signal) query = query.abortSignal(signal);
  const { data, error } = await query;
  if (error) throw toAppError(error, { feature: "dashboard", operation: "transactions" });
  return ((data ?? []) as TransactionRow[])
    .filter((r) => !NOT_SETTLED.has(statusCode(r)))
    .map(toDashboardTransaction);
}
