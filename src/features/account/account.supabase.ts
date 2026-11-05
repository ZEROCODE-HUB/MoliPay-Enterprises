import { getSignedDocUrls } from "@/infrastructure/file-storage/signed-document-urls";
import { requireSupabase } from "@/infrastructure/supabase/client";
import { toAppError } from "@/infrastructure/supabase/errors";

const context = (operation: string) => ({ feature: "account", operation });

/** Fila completa del cliente de la sesion (la pagina edita casi todos sus campos). */
export async function getAccountCustomer(email: string) {
  const { data, error } = await requireSupabase()
    .from("clientes")
    .select("*")
    .eq("correo", email)
    .maybeSingle();
  if (error) throw toAppError(error, context("customer"));
  return data;
}

export async function updateAccountCustomer(
  legajo: string,
  patch: Record<string, unknown>,
): Promise<void> {
  const { data, error } = await requireSupabase()
    .from("clientes")
    .update(patch)
    .eq("legajo", legajo)
    .select("legajo");
  if (error) throw toAppError(error, context("update_customer"));
  // Sin filas: RLS no dejo escribir (un usuario del equipo no edita la ficha).
  if (!data?.length) throw new Error("Solo el titular puede editar estos datos.");
}

/** Documentos del alta, con URL firmada para verlos. */
export async function listAccountDocuments(legajo: string) {
  const { data, error } = await requireSupabase()
    .from("documentos")
    .select("tipo, url, label, created_at")
    .eq("cliente_legajo", legajo)
    .neq("status", "superseded");
  if (error) throw toAppError(error, context("documents"));
  const docs = (data ?? []) as {
    tipo: string;
    url: string;
    label: string | null;
    created_at: string;
  }[];
  const signedUrls = await getSignedDocUrls(docs.map((d) => d.url));
  return { docs, signedUrls };
}

export async function countMovementsThisMonth(legajo: string): Promise<number> {
  const start = new Date();
  start.setDate(1);
  start.setHours(0, 0, 0, 0);
  const { count, error } = await requireSupabase()
    .from("transactions")
    .select("*", { count: "exact", head: true })
    .eq("legajo", legajo)
    .gte("fecha", start.toISOString());
  if (error) throw toAppError(error, context("movement_count"));
  return count ?? 0;
}
