import { requireSupabase } from "@/infrastructure/supabase/client";
import { invokeEdgeFunction } from "@/infrastructure/supabase/edge-functions";
import { toAppError } from "@/infrastructure/supabase/errors";
import { parseEnum } from "@/shared/lib/enum";
import {
  SECURITY_EVENT_OUTCOMES,
  type SecurityEvent,
  type SecurityEventCursor,
  type SecurityEventPage,
  type TeamMember,
} from "./security.types";

/*
 * Sin contrato: lo usa solo security.queries.ts.
 * La base devuelve solo eventos donde el usuario es el afectado o el actor y que estan
 * marcados como visibles para el cliente (migracion 20261104130000_security_events en molipay-admin).
 * Paginacion por cursor: la RPC trae una fila de mas para saber si hay mas.
 */

export const SECURITY_EVENTS_PAGE_SIZE = 10;

type Row = {
  id: number;
  occurred_at: string;
  action: string;
  label: string;
  category: string;
  outcome: string;
  ip: string | null;
  user_agent: string | null;
  metadata: SecurityEvent["metadata"] | null;
};

export const toSecurityEvent = (r: Row): SecurityEvent => ({
  id: r.id,
  occurredAt: r.occurred_at,
  action: r.action,
  label: r.label,
  category: r.category,
  outcome: parseEnum(r.outcome, SECURITY_EVENT_OUTCOMES, "my_security_events.outcome"),
  ip: r.ip,
  userAgent: r.user_agent,
  metadata: r.metadata ?? {},
});

export async function listMySecurityEvents(
  cursor: SecurityEventCursor | null,
  { signal, limit = SECURITY_EVENTS_PAGE_SIZE }: { signal?: AbortSignal; limit?: number } = {},
): Promise<SecurityEventPage> {
  let q = requireSupabase().rpc("my_security_events", {
    p_cursor_at: cursor?.occurredAt ?? null,
    p_cursor_id: cursor?.id ?? null,
    p_limit: limit,
  });
  if (signal) q = q.abortSignal(signal);
  const { data, error } = await q;
  if (error) throw toAppError(error, { feature: "security", operation: "my_security_events" });
  const all = ((data ?? []) as Row[]).map(toSecurityEvent);
  const hasMore = all.length > limit;
  const rows = hasMore ? all.slice(0, limit) : all;
  const last = rows[rows.length - 1];
  return {
    rows,
    nextCursor: hasMore && last ? { occurredAt: last.occurredAt, id: last.id } : null,
  };
}

// --- Equipo: la base decide quien puede ver y administrar ------------------------------

const teamContext = (operation: string) => ({ context: { feature: "security", operation } });

export async function listTeamMembers(): Promise<TeamMember[]> {
  const { data, error } = await requireSupabase().rpc("team_list");
  if (error) throw toAppError(error, teamContext("team_list").context);
  return (
    (data ?? []) as {
      id: string | null;
      full_name: string;
      email: string;
      role: string;
      status: string;
      is_self: boolean | null;
    }[]
  ).map((r) => ({
    id: r.id,
    name: r.full_name,
    email: r.email,
    role: r.role,
    status: r.status,
    isSelf: !!r.is_self,
  }));
}

export const inviteTeamMember = (member: { name: string; email: string; role: string }) =>
  invokeEdgeFunction("equipo-invitar", member, teamContext("invite"));

export const resendTeamInvite = (memberId: string) =>
  invokeEdgeFunction("equipo-invitar", { memberId }, teamContext("resend"));

export async function updateTeamMemberRole(memberId: string, role: string) {
  const { error } = await requireSupabase().rpc("team_update_role", {
    p_member: memberId,
    p_role: role,
  });
  if (error) throw toAppError(error, teamContext("update_role").context);
}

export async function revokeTeamMember(memberId: string) {
  const { error } = await requireSupabase().rpc("team_revoke", { p_member: memberId });
  if (error) throw toAppError(error, teamContext("revoke").context);
}

export const previewTeamInvite = (token: string) =>
  invokeEdgeFunction<{ email: string; name: string; company: string }>(
    "equipo-aceptar",
    { token },
    teamContext("preview_invite"),
  );

export const acceptTeamInvite = (token: string, password: string) =>
  invokeEdgeFunction("equipo-aceptar", { token, password }, teamContext("accept_invite"));
