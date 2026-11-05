import { BALANCES_EMBED,withBalances } from "@/infrastructure/supabase/subaccount-balances";
import { requireSupabase } from "@/infrastructure/supabase/client";
import { invokeEdgeFunction } from "@/infrastructure/supabase/edge-functions";
import { toAppError } from "@/infrastructure/supabase/errors";
import { AppError } from "@/shared/lib/errors";
import { sumDecimals } from "@/shared/lib/money";

const context = { feature: "transfers", operation: "overview" };

/** Subcuentas del cliente con su saldo. Los saldos los calcula la base. */
export async function listTransferSubaccounts(legajo: string) {
  const { data, error } = await requireSupabase()
    .from("subaccounts")
    .select(`id, nombre, cbu, tipo, ${BALANCES_EMBED}`)
    .eq("cliente_legajo", legajo)
    .order("nombre", { ascending: true });
  if (error) throw toAppError(error, context);
  return (data ?? []).map(withBalances);
}

/** Lo transferido en el mes en curso. */
export async function getSentThisMonth(legajo: string) {
  const now = new Date();
  const { data, error } = await requireSupabase()
    .from("transactions")
    .select("monto_operacion, tipo")
    .eq("legajo", legajo)
    .gte("fecha", new Date(now.getFullYear(), now.getMonth(), 1).toISOString())
    .in("tipo", ["transferencia"]);
  if (error) throw toAppError(error, context);
  const rows = data ?? [];
  return { monto: sumDecimals(rows.map((m) => m.monto_operacion)), ops: rows.length };
}

export async function sendTransferOtp(): Promise<void> {
  await invokeEdgeFunction(
    "enviar-otp-transferencia",
    {},
    {
      context: { feature: "transfers", operation: "otp_send" },
    },
  );
}

export async function verifyTransferOtp(code: string): Promise<void> {
  const data = await invokeEdgeFunction<{ ok?: boolean }>(
    "verificar-otp-transferencia",
    { codigo: code },
    {
      context: { feature: "transfers", operation: "otp_verify" },
    },
  );
  if (!data?.ok) throw new AppError("validation", "Código incorrecto o expirado.");
}
