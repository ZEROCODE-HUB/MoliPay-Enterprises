import { requireSupabase } from "@/lib/supabase";

/**
 * API para desarrolladores del comercio.
 *
 * - Lecturas y acciones sin secretos: RPCs de Supabase con la sesion
 *   (`api_portal_*`); la base resuelve el comercio por el usuario logueado.
 * - Generar llaves y configurar webhooks: backend (`/api/developers/*`), que
 *   cifra los secretos. Se manda el access token de la sesion y el backend lo
 *   verifica; el comercio nunca viaja en el request.
 */

export type AmbienteApi = "Homologacion" | "Produccion";
export type EstadoIntegracion =
  | "Pendiente_Validacion"
  | "Homologacion"
  | "Pendiente_Pase_Produccion"
  | "Produccion"
  | "Suspendido"
  | "Revocado";

export type EstadoApiPortal = {
  integracion: {
    id: string;
    estado: EstadoIntegracion;
    rate_limit_sandbox: number;
    rate_limit_produccion: number;
    ip_whitelist: string[];
    pase_solicitado_at: string | null;
    pase_notas: string | null;
    aprobado_at: string | null;
    motivo_suspension: string | null;
    motivo_revocacion: string | null;
    created_at: string;
    ultimo_cambio: { fecha: string; de: string | null; a: string; nota: string | null } | null;
  } | null;
  llaves: { id: string; ambiente: AmbienteApi; api_key: string; secret_ultimos4: string; created_at: string; ultimo_uso_at: string | null }[];
  webhooks: {
    id: string;
    ambiente: AmbienteApi;
    url_callback: string;
    eventos_suscritos: string[];
    activo: boolean;
    secret_ultimos4: string;
    updated_at: string;
  }[];
  endpoints: {
    path: string;
    metodo: string;
    nombre: string;
    descripcion: string | null;
    categoria: string | null;
    sandbox: boolean | null;
    produccion: boolean | null;
  }[];
  stats: Partial<Record<AmbienteApi, { requests: number; exitosas: number; tasa_exito: number | null; latencia_media: number | null; latencia_p95: number | null }>>;
  logs: {
    ambiente: AmbienteApi | null;
    metodo: string;
    ruta: string;
    status: number;
    latencia_ms: number | null;
    codigo_error: string | null;
    request_id: string | null;
    ip: string | null;
    created_at: string;
  }[];
  entregas: {
    id: string;
    ambiente: AmbienteApi;
    evento: string;
    estado: string;
    intento: number;
    http: number | null;
    error: string | null;
    latencia_ms: number | null;
    es_prueba: boolean;
    proximo_reintento: string | null;
    created_at: string;
  }[];
  eventos_disponibles: string[];
};

export const EVENTOS_LABEL: Record<string, string> = {
  "cobro.aprobado": "Cobro aprobado",
  "cobro.rechazado": "Cobro rechazado",
  "transferencia.acreditada": "Transferencia acreditada",
  "lote.acreditado": "Lote acreditado",
  "contracargo.notificado": "Contracargo notificado",
  "contracargo.resuelto": "Contracargo resuelto",
};

export function backendUrl(): string {
  const url = import.meta.env.VITE_PAYMENTS_API_URL || "https://molipayservicebks.vercel.app";
  return url.replace(/\/+$/, "");
}

export async function cargarEstadoApi(): Promise<EstadoApiPortal> {
  const { data, error } = await requireSupabase().rpc("api_portal_estado");
  if (error) throw new Error(error.message);
  return data as EstadoApiPortal;
}

export async function solicitarPase(notas: string) {
  const { error } = await requireSupabase().rpc("api_portal_solicitar_pase", { p_notas: notas });
  if (error) throw new Error(error.message);
}

export async function guardarIps(ips: string[]) {
  const { error } = await requireSupabase().rpc("api_portal_guardar_ips", { p_ips: ips });
  if (error) throw new Error(error.message);
}

async function backend<T>(ruta: string, body: unknown): Promise<T> {
  const { data } = await requireSupabase().auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Tu sesión venció. Volvé a ingresar.");
  const res = await fetch(`${backendUrl()}/api/developers${ruta}`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  const json = (await res.json().catch(() => ({}))) as { ok?: boolean; message?: string } & T;
  if (!res.ok || json.ok === false) throw new Error(json.message ?? `Error ${res.status}`);
  return json;
}

export const generarLlaves = (ambiente: AmbienteApi) =>
  backend<{ api_key: string; secret_key: string; ambiente: AmbienteApi; estado: EstadoIntegracion }>("/keys", { ambiente });

export const guardarWebhook = (p: { ambiente: AmbienteApi; url: string; eventos: string[]; activo: boolean; rotar_secreto?: boolean }) =>
  backend<{ id: string; nuevo: boolean; webhook_secret?: string }>("/webhooks", p);

export const probarWebhook = (ambiente: AmbienteApi) =>
  backend<{ entrega: { estado: string; respuesta_http_status: number | null; ultimo_error: string | null; latencia_ms: number | null } | null }>(
    "/webhooks/test",
    { ambiente },
  );
