import { postToBackend } from "@/infrastructure/http/backend-client";
import { callRpc } from "@/infrastructure/supabase/rpc";
import { parseEnumMap } from "@/shared/lib/enum";
import type {
ApiEnvironment,
DeliveryStatus,
DeveloperPortal,
GeneratedKeys,
IntegrationStatus,
UsageStats,
WebhookInput,
WebhookTestResult,
} from "./developers.types";

/*
 * Sin contrato: lo usan developers.queries.ts y developers.hooks.ts.
 * - Lecturas y acciones sin secretos: RPCs api_portal_* con la sesion (la base resuelve
 *   el comercio por el usuario logueado).
 * - Generar llaves y configurar webhooks: molipay-back (/api/developers/*), que cifra
 *   los secretos. Los secretos vuelven una sola vez y no se guardan en el navegador.
 */

const context = (operation: string) => ({ feature: "developers", operation });

type DbStatus =
  | "Pendiente_Validacion"
  | "Homologacion"
  | "Pendiente_Pase_Produccion"
  | "Produccion"
  | "Suspendido"
  | "Revocado";
const STATUS: Record<DbStatus, IntegrationStatus> = {
  Pendiente_Validacion: "pending_validation",
  Homologacion: "sandbox",
  Pendiente_Pase_Produccion: "pending_production",
  Produccion: "production",
  Suspendido: "suspended",
  Revocado: "revoked",
};

type DbEnvironment = "Homologacion" | "Produccion";
const ENVIRONMENT: Record<DbEnvironment, ApiEnvironment> = {
  Homologacion: "sandbox",
  Produccion: "production",
};
const DB_ENVIRONMENT: Record<ApiEnvironment, DbEnvironment> = {
  sandbox: "Homologacion",
  production: "Produccion",
};

type DbDeliveryStatus = "Pendiente" | "Enviando" | "Exitoso" | "Reintentando" | "Fallido";
const DELIVERY_STATUS: Record<DbDeliveryStatus, DeliveryStatus> = {
  Pendiente: "pending",
  Enviando: "sending",
  Exitoso: "succeeded",
  Reintentando: "retrying",
  Fallido: "failed",
};

const env = (v: unknown, field: string) => parseEnumMap(v, ENVIRONMENT, field);

type StatsRow = {
  requests: number;
  exitosas: number;
  tasa_exito: number | null;
  latencia_media: number | null;
  latencia_p95: number | null;
};

type PortalRow = {
  integracion: {
    id: string;
    estado: string;
    rate_limit_sandbox: number;
    rate_limit_produccion: number;
    ip_whitelist: string[] | null;
    pase_solicitado_at: string | null;
    pase_notas: string | null;
    aprobado_at: string | null;
    motivo_suspension: string | null;
    motivo_revocacion: string | null;
    created_at: string;
    ultimo_cambio: { fecha: string; de: string | null; a: string; nota: string | null } | null;
  } | null;
  llaves:
    | {
        id: string;
        ambiente: string;
        api_key: string;
        secret_ultimos4: string;
        created_at: string;
        ultimo_uso_at: string | null;
      }[]
    | null;
  webhooks:
    | {
        id: string;
        ambiente: string;
        url_callback: string;
        eventos_suscritos: string[];
        activo: boolean;
        secret_ultimos4: string;
        updated_at: string;
      }[]
    | null;
  endpoints:
    | {
        path: string;
        metodo: string;
        nombre: string;
        descripcion: string | null;
        categoria: string | null;
        sandbox: boolean | null;
        produccion: boolean | null;
      }[]
    | null;
  stats: Partial<Record<DbEnvironment, StatsRow>> | null;
  logs:
    | {
        ambiente: string | null;
        metodo: string;
        ruta: string;
        status: number;
        latencia_ms: number | null;
        codigo_error: string | null;
        request_id: string | null;
        ip: string | null;
        created_at: string;
      }[]
    | null;
  entregas:
    | {
        id: string;
        ambiente: string;
        evento: string;
        estado: string;
        intento: number;
        http: number | null;
        error: string | null;
        latencia_ms: number | null;
        es_prueba: boolean;
        proximo_reintento: string | null;
        created_at: string;
      }[]
    | null;
  eventos_disponibles: string[] | null;
};

const toStats = (s: StatsRow | undefined): UsageStats | undefined =>
  s && {
    requests: s.requests,
    succeeded: s.exitosas,
    successRate: s.tasa_exito,
    averageLatencyMs: s.latencia_media,
    p95LatencyMs: s.latencia_p95,
  };

export function toDeveloperPortal(r: PortalRow): DeveloperPortal {
  const i = r.integracion;
  const stats: DeveloperPortal["stats"] = {};
  const sandbox = toStats(r.stats?.Homologacion);
  const production = toStats(r.stats?.Produccion);
  if (sandbox) stats.sandbox = sandbox;
  if (production) stats.production = production;

  return {
    integration: i && {
      id: i.id,
      status: parseEnumMap(i.estado, STATUS, "api_integraciones.estado"),
      sandboxRateLimit: i.rate_limit_sandbox,
      productionRateLimit: i.rate_limit_produccion,
      ipWhitelist: i.ip_whitelist ?? [],
      productionRequestedAt: i.pase_solicitado_at,
      productionRequestNotes: i.pase_notas,
      approvedAt: i.aprobado_at,
      suspensionReason: i.motivo_suspension,
      revocationReason: i.motivo_revocacion,
      createdAt: i.created_at,
      lastChange: i.ultimo_cambio && {
        at: i.ultimo_cambio.fecha,
        from: i.ultimo_cambio.de,
        to: i.ultimo_cambio.a,
        note: i.ultimo_cambio.nota,
      },
    },
    keys: (r.llaves ?? []).map((k) => ({
      id: k.id,
      environment: env(k.ambiente, "api_llaves.ambiente"),
      apiKey: k.api_key,
      secretLast4: k.secret_ultimos4,
      createdAt: k.created_at,
      lastUsedAt: k.ultimo_uso_at,
    })),
    webhooks: (r.webhooks ?? []).map((w) => ({
      id: w.id,
      environment: env(w.ambiente, "api_webhooks.ambiente"),
      callbackUrl: w.url_callback,
      events: w.eventos_suscritos ?? [],
      active: w.activo,
      secretLast4: w.secret_ultimos4,
      updatedAt: w.updated_at,
    })),
    endpoints: (r.endpoints ?? []).map((e) => ({
      path: e.path,
      method: e.metodo,
      name: e.nombre,
      description: e.descripcion,
      category: e.categoria,
      sandbox: e.sandbox,
      production: e.produccion,
    })),
    stats,
    logs: (r.logs ?? []).map((l) => ({
      environment: l.ambiente ? env(l.ambiente, "api_logs.ambiente") : null,
      method: l.metodo,
      path: l.ruta,
      status: l.status,
      latencyMs: l.latencia_ms,
      errorCode: l.codigo_error,
      requestId: l.request_id,
      ip: l.ip,
      createdAt: l.created_at,
    })),
    deliveries: (r.entregas ?? []).map((e) => ({
      id: e.id,
      environment: env(e.ambiente, "api_webhook_logs.ambiente"),
      event: e.evento,
      status: parseEnumMap(e.estado, DELIVERY_STATUS, "api_webhook_logs.estado"),
      attempt: e.intento,
      httpStatus: e.http,
      error: e.error,
      latencyMs: e.latencia_ms,
      isTest: e.es_prueba,
      nextRetryAt: e.proximo_reintento,
      createdAt: e.created_at,
    })),
    availableEvents: r.eventos_disponibles ?? [],
  };
}

export async function getDeveloperPortal({
  signal,
}: { signal?: AbortSignal } = {}): Promise<DeveloperPortal> {
  const row = await callRpc<PortalRow>(
    "api_portal_estado",
    {},
    { signal, context: context("portal") },
  );
  return toDeveloperPortal(row);
}

export async function requestProduction(notes: string): Promise<void> {
  await callRpc(
    "api_portal_solicitar_pase",
    { p_notas: notes },
    { context: context("request_production") },
  );
}

export async function saveAllowedIps(ips: string[]): Promise<void> {
  await callRpc("api_portal_guardar_ips", { p_ips: ips }, { context: context("save_ips") });
}

export async function generateKeys(environment: ApiEnvironment): Promise<GeneratedKeys> {
  const r = await postToBackend<{ api_key: string; secret_key: string }>(
    "/api/developers/keys",
    { ambiente: DB_ENVIRONMENT[environment] },
    context("generate_keys"),
  );
  return { apiKey: r.api_key, secretKey: r.secret_key };
}

/** Devuelve el secreto del webhook solo cuando es nuevo o se roto. */
export async function saveWebhook(input: WebhookInput): Promise<{ secret: string | null }> {
  const r = await postToBackend<{ webhook_secret?: string }>(
    "/api/developers/webhooks",
    {
      ambiente: DB_ENVIRONMENT[input.environment],
      url: input.url,
      eventos: input.events,
      activo: input.active,
      rotar_secreto: input.rotateSecret ?? false,
    },
    context("save_webhook"),
  );
  return { secret: r.webhook_secret ?? null };
}

export async function testWebhook(environment: ApiEnvironment): Promise<WebhookTestResult> {
  const r = await postToBackend<{
    entrega: {
      estado: string;
      respuesta_http_status: number | null;
      ultimo_error: string | null;
      latencia_ms: number | null;
    } | null;
  }>(
    "/api/developers/webhooks/test",
    { ambiente: DB_ENVIRONMENT[environment] },
    context("test_webhook"),
  );
  const e = r.entrega;
  return (
    e && {
      succeeded: e.estado === "Exitoso",
      httpStatus: e.respuesta_http_status,
      error: e.ultimo_error,
      latencyMs: e.latencia_ms,
    }
  );
}
