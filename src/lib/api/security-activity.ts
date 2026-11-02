import { requireSupabase } from "@/lib/supabase";

/**
 * "Mi actividad de seguridad": eventos de la cuenta del usuario logueado
 * (RPC my_security_events, migracion 20261104130000_security_events en molipay-admin).
 *
 * La base devuelve solo eventos donde el usuario es el afectado o el actor y
 * que estan marcados como visibles para el cliente. Nunca de otros usuarios.
 * Paginacion por cursor: la RPC trae una fila de mas para saber si hay mas.
 */

export const MY_ACTIVITY_PAGE_SIZE = 10;

export type MySecurityEvent = {
  id: number;
  occurredAt: string;
  action: string;
  label: string;
  category: string;
  outcome: "success" | "failure" | "denied";
  ip: string | null;
  userAgent: string | null;
  metadata: { environment?: string; key_prefix?: string; first_set?: boolean };
};

export type MySecurityEventCursor = { occurredAt: string; id: number };

export type MySecurityEventsPage = {
  rows: MySecurityEvent[];
  nextCursor: MySecurityEventCursor | null;
};

type Row = {
  id: number;
  occurred_at: string;
  action: string;
  label: string;
  category: string;
  outcome: MySecurityEvent["outcome"];
  ip: string | null;
  user_agent: string | null;
  metadata: MySecurityEvent["metadata"] | null;
};

export async function fetchMySecurityEvents(
  cursor: MySecurityEventCursor | null,
  limit = MY_ACTIVITY_PAGE_SIZE,
): Promise<MySecurityEventsPage> {
  const sb = requireSupabase();
  const { data, error } = await sb.rpc("my_security_events", {
    p_cursor_at: cursor?.occurredAt ?? null,
    p_cursor_id: cursor?.id ?? null,
    p_limit: limit,
  });
  if (error) throw new Error(error.message);
  const all = ((data ?? []) as Row[]).map(
    (r): MySecurityEvent => ({
      id: r.id,
      occurredAt: r.occurred_at,
      action: r.action,
      label: r.label,
      category: r.category,
      outcome: r.outcome,
      ip: r.ip,
      userAgent: r.user_agent,
      metadata: r.metadata ?? {},
    }),
  );
  const hasMore = all.length > limit;
  const rows = hasMore ? all.slice(0, limit) : all;
  const last = rows[rows.length - 1];
  return {
    rows,
    nextCursor: hasMore && last ? { occurredAt: last.occurredAt, id: last.id } : null,
  };
}

/** Navegador y sistema a partir del user agent (aproximado, solo para mostrar). */
export function describeUserAgent(ua: string | null): string | null {
  if (!ua) return null;
  const browser = /Edg\//.test(ua)
    ? "Edge"
    : /OPR\//.test(ua)
      ? "Opera"
      : /Chrome\//.test(ua)
        ? "Chrome"
        : /Firefox\//.test(ua)
          ? "Firefox"
          : /Safari\//.test(ua)
            ? "Safari"
            : null;
  const os = /Windows/.test(ua)
    ? "Windows"
    : /Android/.test(ua)
      ? "Android"
      : /iPhone|iPad/.test(ua)
        ? "iOS"
        : /Mac OS X/.test(ua)
          ? "macOS"
          : /Linux/.test(ua)
            ? "Linux"
            : null;
  return [browser, os].filter(Boolean).join(" · ") || null;
}
