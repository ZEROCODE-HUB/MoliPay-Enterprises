import { requireSupabase,supabaseAnonKey,supabaseUrl } from "@/infrastructure/supabase/client";

/**
 * Genera URLs firmadas para documentos del bucket `kyc` usando una Edge Function
 * con service role (la firma en el navegador puede fallar por CORS / scope del
 * token de sesión). Verifica que cada documento pertenezca al usuario autenticado
 * (o sea admin). Se firman todos los paths en una sola llamada.
 */
export async function getSignedDocUrls(paths: string[]): Promise<Record<string, string | null>> {
  if (!supabaseUrl || !supabaseAnonKey || paths.length === 0) return {};
  const sb = requireSupabase();
  const { data: sessionData } = await sb.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) return {};
  try {
    const res = await fetch(`${supabaseUrl}/functions/v1/doc-url`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ paths }),
    });
    const j = await res.json();
    return j.urls ?? {};
  } catch {
    return {};
  }
}

export async function getSignedDocUrl(path: string): Promise<string | null> {
  const map = await getSignedDocUrls([path]);
  return map[path] ?? null;
}
