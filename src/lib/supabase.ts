import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const supabase: SupabaseClient | null =
  supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;

export const isSupabaseConfigured = supabase !== null;

/**
 * Devuelve el cliente de Supabase o lanza un error claro si no está configurado.
 */
export function requireSupabase(): SupabaseClient {
  if (!supabase) {
    throw new Error(
      "Supabase no está configurado. Definí VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en el entorno.",
    );
  }
  return supabase;
}

const PERMISSION_PATTERNS: RegExp[] = [
  /permission denied/i,
  /insufficient privilege/i,
  /row-level security/i,
  /new row violates row-level security/i,
  /42501/,
];

export type SupabaseDataError = {
  code: string | null;
  message: string;
  details?: string | null;
  hint?: string | null;
};

export function toDataError(err: unknown): SupabaseDataError {
  if (err && typeof err === "object" && "message" in err) {
    const e = err as {
      code?: string | null;
      message?: string;
      details?: string | null;
      hint?: string | null;
    };
    return {
      code: e.code ?? null,
      message: e.message ?? "Error desconocido",
      details: e.details ?? null,
      hint: e.hint ?? null,
    };
  }
  return { code: null, message: String(err) };
}

export function isPermissionError(err: unknown): boolean {
  const e = toDataError(err);
  if (e.code === "42501") return true;
  return PERMISSION_PATTERNS.some((p) => p.test(e.message));
}

export function isNotConfiguredError(err: unknown): boolean {
  return /Supabase no está configurado/i.test(toDataError(err).message);
}

/**
 * Genera una URL firmada para un documento del bucket `kyc` usando una Edge
 * Function con service role (la firma en el navegador puede fallar por CORS /
 * scope del token de sesión). Verifica que el documento pertenezca al usuario
 * autenticado (o sea admin).
 */
export async function getSignedDocUrl(path: string): Promise<string | null> {
  if (!supabaseUrl || !supabaseAnonKey) return null;
  const sb = requireSupabase();
  const { data: sessionData } = await sb.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) return null;
  try {
    const res = await fetch(`${supabaseUrl}/functions/v1/doc-url`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ path }),
    });
    const j = await res.json();
    return j.signedUrl ?? null;
  } catch {
    return null;
  }
}

const ERROR_MESSAGES: [RegExp, string][] = [
  [/invalid login credentials/i, "Usuario o contraseña incorrectos."],
  [/email not confirmed/i, "El correo aún no está confirmado. Revisá tu bandeja de entrada."],
  [/user not found/i, "No existe una cuenta con ese correo."],
  [/too many requests|rate limit/i, "Demasiados intentos fallidos. Esperá unos minutos y volvé a intentar."],
  [/invalid email/i, "Ingresá un correo electrónico válido."],
  [/network|fetch failed|failed to fetch/i, "No se pudo conectar. Verificá tu conexión e intentá de nuevo."],
];

export function getAuthErrorMessage(message: string): string {
  for (const [pattern, friendly] of ERROR_MESSAGES) {
    if (pattern.test(message)) return friendly;
  }
  return "No se pudo iniciar sesión. Intentalo nuevamente.";
}
