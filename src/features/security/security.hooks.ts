import { useCallback, useEffect, useMemo, useState } from "react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useSessionUser } from "@/features/session/session.hooks";
import { securityQueries } from "./security.queries";

/** Actividad de seguridad del usuario logueado, paginada por cursor. */
export function useMySecurityEvents() {
  const userId = useSessionUser().user?.id ?? "";
  return useInfiniteQuery({ ...securityQueries.events(userId), enabled: !!userId });
}

// --- Aviso de inicio de sesion nuevo -------------------------------------------

const seenKey = (userId: string) => `molipay:seen-sessions:${userId}`;

/** Sesiones ya vistas en este navegador (null = primera vez). Solo comodidad: nunca autoriza. */
function readSeen(userId: string): Set<string> | null {
  try {
    const raw = localStorage.getItem(seenKey(userId));
    return raw ? new Set(JSON.parse(raw) as string[]) : null;
  } catch {
    return null;
  }
}

function writeSeen(userId: string, ids: Iterable<string>) {
  try {
    localStorage.setItem(seenKey(userId), JSON.stringify([...ids]));
  } catch {
    // Sin storage (modo privado): el aviso se recalcula en cada carga.
  }
}

/**
 * Sesiones abiertas en otros dispositivos desde la ultima vez que el usuario
 * las vio en este navegador. La primera vez se toman todas como vistas, para
 * no avisar de sesiones viejas.
 */
export function useNewSessionAlert() {
  const userId = useSessionUser().user?.id ?? "";
  const sessions = useQuery({
    ...securityQueries.sessions(userId),
    enabled: !!userId,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });
  const [seen, setSeen] = useState<Set<string> | null>(null);

  useEffect(() => {
    if (!userId || !sessions.data) return;
    const ids = sessions.data.map((s) => s.id);
    const stored = readSeen(userId);
    // Se guardan solo las que siguen abiertas, para que no crezca.
    const next = stored ? new Set(ids.filter((id) => stored.has(id))) : new Set(ids);
    for (const s of sessions.data) if (s.current) next.add(s.id);
    writeSeen(userId, next);
    setSeen(next);
  }, [userId, sessions.data]);

  const unseen = useMemo(
    () =>
      (sessions.data ?? [])
        .filter((s) => !s.current && seen && !seen.has(s.id))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [sessions.data, seen],
  );

  const acknowledge = useCallback(
    (id: string) => {
      setSeen((prev) => {
        const next = new Set(prev ?? []);
        next.add(id);
        writeSeen(userId, next);
        return next;
      });
    },
    [userId],
  );

  return { session: unseen[0] ?? null, others: Math.max(0, unseen.length - 1), acknowledge };
}
