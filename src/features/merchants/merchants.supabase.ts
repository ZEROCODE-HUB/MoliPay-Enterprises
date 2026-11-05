import { requireSupabase } from "@/infrastructure/supabase/client";
import { toAppError } from "@/infrastructure/supabase/errors";
import type { Merchant } from "./merchants.types";

/* Feature chica sin contrato: lo usa solo merchants.queries.ts. */

type MerchantRow = {
  id: string;
  nombre_comercio: string | null;
  legajo: string | null;
  nivel: string | null;
  estado: string | null;
  usuario: string | null;
  created_at: string | null;
};

export const toMerchant = (r: MerchantRow): Merchant => ({
  id: r.id,
  name: r.nombre_comercio ?? "Comercio",
  legajo: r.legajo ?? "",
  level: r.nivel ?? "—",
  status: r.estado ?? "—",
  user: r.usuario ?? "",
  createdAt: (r.created_at ?? "").slice(0, 10),
});

/** Comercios del cliente (por legajo) o dados de alta con su email. */
export async function listMyMerchants(
  customerLegajo: string,
  email: string,
  { signal }: { signal?: AbortSignal } = {},
): Promise<Merchant[]> {
  let query = requireSupabase()
    .from("comercios")
    .select("id, nombre_comercio, legajo, nivel, estado, usuario, created_at")
    .or(`legajo.eq.${customerLegajo},usuario.eq.${email}`)
    .order("created_at", { ascending: false });
  if (signal) query = query.abortSignal(signal);
  const { data, error } = await query;
  if (error) throw toAppError(error, { feature: "merchants", operation: "comercios" });
  return ((data ?? []) as MerchantRow[]).map(toMerchant);
}
