import { requireSupabase } from "@/infrastructure/supabase/client";
import { AppError,type AppErrorContext,type AppErrorKind } from "@/shared/lib/errors";
import { paymentsApiUrl } from "./backend-url";

/*
 * Cliente de molipay-back para las rutas que necesitan la sesion del usuario.
 * Manda el access token como Bearer (el backend lo verifica y resuelve el comercio:
 * el cliente nunca viaja en el request). El token no se guarda en ningun lado.
 */

const KIND_BY_STATUS: Record<number, AppErrorKind> = {
  400: "validation",
  401: "permission",
  403: "permission",
  404: "not_found",
  409: "conflict",
  422: "validation",
  429: "validation",
};

const GENERIC_SERVER_ERROR =
  "El servicio no respondió como esperábamos. Probá de nuevo en unos minutos.";

type BackendBody = { ok?: boolean; message?: string };

/** POST autenticado a molipay-back. Errores como AppError con mensaje en español. */
export async function postToBackend<T>(
  path: string,
  body: unknown,
  context: AppErrorContext = {},
): Promise<T> {
  const { data } = await requireSupabase().auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new AppError("permission", "Tu sesión venció. Volvé a ingresar.", { context });

  let res: Response;
  try {
    res = await fetch(`${paymentsApiUrl()}${path}`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
  } catch (cause) {
    throw new AppError("network", "No se pudo conectar. Verificá tu conexión e intentá de nuevo.", {
      context,
      cause,
    });
  }

  const json = (await res.json().catch(() => ({}))) as BackendBody & T;
  if (res.ok && json.ok !== false) return json;

  // Los mensajes 4xx son nuestros (en español, para el usuario); los 5xx no se muestran.
  const cause = new Error(`${path} -> HTTP ${res.status}: ${json.message ?? ""}`);
  if (res.status >= 500) throw new AppError("unknown", GENERIC_SERVER_ERROR, { context, cause });
  const kind = KIND_BY_STATUS[res.status] ?? "validation";
  throw new AppError(kind, json.message ?? GENERIC_SERVER_ERROR, { context, cause });
}
