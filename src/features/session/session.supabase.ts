import { requireSupabase } from "@/infrastructure/supabase/client";
import { toAppError } from "@/infrastructure/supabase/errors";
import { parseEnumMap } from "@/shared/lib/enum";
import type { CurrentCustomer } from "./session.types";

/*
 * Feature sin contrato (una sola consulta): lo usa solo session.queries.ts.
 * El cliente se identifica por el email de la sesion (RLS deja leer solo la fila propia).
 */

const COLUMNS =
  "legajo, nombre, nombre_fantasia, correo, tipo_persona, cuit, cuit_cuil, cbu, alias";

type CustomerRow = {
  legajo: string;
  nombre: string;
  nombre_fantasia: string | null;
  correo: string;
  tipo_persona: string;
  cuit: string | null;
  cuit_cuil: string | null;
  cbu: string | null;
  alias: string | null;
};

const PERSON_TYPE = { fisica: "individual", juridica: "company" } as const;

export function toCurrentCustomer(row: CustomerRow): CurrentCustomer {
  return {
    legajo: row.legajo,
    name: row.nombre,
    displayName: row.nombre_fantasia || row.nombre,
    email: row.correo,
    personType: parseEnumMap(row.tipo_persona, PERSON_TYPE, "clientes.tipo_persona"),
    cuit: row.cuit || row.cuit_cuil || "",
    cbu: row.cbu,
    alias: row.alias,
  };
}

/** null si el usuario todavia no tiene ficha de cliente (onboarding sin terminar). */
export async function getCurrentCustomer(
  email: string,
  { signal }: { signal?: AbortSignal } = {},
): Promise<CurrentCustomer | null> {
  let query = requireSupabase().from("clientes").select(COLUMNS).eq("correo", email);
  if (signal) query = query.abortSignal(signal);
  const { data, error } = await query.maybeSingle();
  if (error) throw toAppError(error, { feature: "session", operation: "clientes" });
  return data ? toCurrentCustomer(data as CustomerRow) : null;
}
