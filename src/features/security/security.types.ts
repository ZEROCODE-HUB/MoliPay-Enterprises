/** Evento de seguridad de la cuenta del usuario logueado (RPC my_security_events). */
export const SECURITY_EVENT_OUTCOMES = ["success", "failure", "denied"] as const;

export type TeamMember = {
  /** null en el titular: no se edita ni se quita. */
  id: string | null;
  name: string;
  email: string;
  role: string;
  status: string;
  isSelf: boolean;
};

export type SecurityEvent = {
  id: number;
  occurredAt: string;
  action: string;
  label: string;
  category: string;
  outcome: (typeof SECURITY_EVENT_OUTCOMES)[number];
  ip: string | null;
  userAgent: string | null;
  metadata: { environment?: string; key_prefix?: string; first_set?: boolean };
};

export type SecurityEventCursor = { occurredAt: string; id: number };

export type SecurityEventPage = { rows: SecurityEvent[]; nextCursor: SecurityEventCursor | null };

/** Sesion de Supabase Auth del usuario logueado (RPC my_sessions). */
export type AuthSession = {
  id: string;
  createdAt: string;
  lastActiveAt: string;
  ip: string | null;
  userAgent: string | null;
  current: boolean;
};
