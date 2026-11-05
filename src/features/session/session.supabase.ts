import { requireSupabase } from "@/infrastructure/supabase/client";
import { toAppError } from "@/infrastructure/supabase/errors";
import { parseEnumMap } from "@/shared/lib/enum";
import type { CurrentCustomer, TeamRole } from "./session.types";

/*
 * Feature sin contrato (una sola consulta): lo usa solo session.queries.ts.
 * El cliente lo resuelve la base: el titular por su correo y el equipo por su membresia.
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

export function toCurrentCustomer(row: CustomerRow, teamRole: TeamRole = "owner"): CurrentCustomer {
  return {
    legajo: row.legajo,
    name: row.nombre,
    displayName: row.nombre_fantasia || row.nombre,
    email: row.correo,
    personType: parseEnumMap(row.tipo_persona, PERSON_TYPE, "clientes.tipo_persona"),
    cuit: row.cuit || row.cuit_cuil || "",
    cbu: row.cbu,
    alias: row.alias,
    teamRole,
  };
}

/** null si el usuario todavia no tiene ficha de cliente (onboarding sin terminar). */
export async function getCurrentCustomer({
  signal,
}: { signal?: AbortSignal } = {}): Promise<CurrentCustomer | null> {
  const legajo = await getSessionLegajo();
  if (!legajo) return null;
  let query = requireSupabase().from("clientes").select(COLUMNS).eq("legajo", legajo);
  if (signal) query = query.abortSignal(signal);
  const { data, error } = await query.maybeSingle();
  if (error) throw toAppError(error, { feature: "session", operation: "clientes" });
  if (!data) return null;
  const { data: role, error: roleError } = await requireSupabase().rpc("my_team_role");
  if (roleError) throw toAppError(roleError, { feature: "session", operation: "my_team_role" });
  return toCurrentCustomer(data as CustomerRow, (role as TeamRole | null) ?? "owner");
}

/** Legajo de la cuenta de la sesion, para titulares y usuarios del equipo. */
export async function getSessionLegajo(): Promise<string | null> {
  const { data, error } = await requireSupabase().rpc("legajo_de_sesion");
  if (error) throw toAppError(error, { feature: "session", operation: "legajo_de_sesion" });
  return (data as string | null) ?? null;
}
