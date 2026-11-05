import { requireSupabase } from "@/infrastructure/supabase/client";
import { toAppError } from "@/infrastructure/supabase/errors";
import { moneyFromDecimal } from "@/shared/lib/money";
import type { DashboardTransaction,DateRange } from "./dashboard.types";

/* Feature sin contrato: lo usa solo dashboard.queries.ts. */

type TransactionRow = {
  tipo: string;
  monto_operacion: number | string | null;
  fecha: string | null;
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
    .select("tipo, monto_operacion, fecha")
    .eq("legajo", customerLegajo)
    .gte("fecha", range.start.toISOString())
    .lte("fecha", range.end.toISOString());
  if (signal) query = query.abortSignal(signal);
  const { data, error } = await query;
  if (error) throw toAppError(error, { feature: "dashboard", operation: "transactions" });
  return ((data ?? []) as TransactionRow[]).map(toDashboardTransaction);
}
