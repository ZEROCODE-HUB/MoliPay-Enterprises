import { useSyncExternalStore } from "react";
import { useQuery } from "@tanstack/react-query";
import { authClient } from "@/app/dependencies";
import { sessionQueries } from "./session.queries";
import type { SessionStatus,SessionUser } from "./session.types";

/*
 * Sesion del portal. Un solo origen (el AuthClient) para toda la app: reemplaza
 * los `auth.getUser()` y las busquedas del cliente por email repetidas en cada pagina.
 */

type SessionState = { status: SessionStatus; user: SessionUser | null };

const LOADING: SessionState = { status: "loading", user: null };
let state: SessionState = LOADING;
let started = false;
const listeners = new Set<() => void>();

function setUser(user: SessionUser | null) {
  const next: SessionState = user
    ? { status: "authenticated", user }
    : { status: "anonymous", user: null };
  if (
    next.status === state.status &&
    next.user?.id === state.user?.id &&
    next.user?.email === state.user?.email
  )
    return;
  state = next;
  listeners.forEach((listener) => listener());
}

/** Arranca una sola vez, en el navegador (en SSR no hay sesion). */
function ensureStarted() {
  if (started || typeof window === "undefined") return;
  started = true;
  authClient.onUserChange(setUser);
  void authClient.getCurrentUser().then(setUser, () => setUser(null));
}

function subscribe(listener: () => void) {
  ensureStarted();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Usuario autenticado. `status: "loading"` mientras se restaura la sesion guardada. */
export function useSessionUser(): SessionState {
  return useSyncExternalStore(
    subscribe,
    () => state,
    () => LOADING,
  );
}

/**
 * Cliente de la sesion (legajo, nombres, CUIT, CBU). La consulta espera a tener
 * usuario; `data` es null si todavia no tiene ficha de cliente.
 */
export function useCurrentCustomer() {
  const { user } = useSessionUser();
  return useQuery({
    ...sessionQueries.currentCustomer(user?.id ?? "", user?.email ?? ""),
    enabled: !!user?.id && !!user.email,
  });
}

export function useSignOut() {
  return (scope?: "local" | "others" | "global") => authClient.signOut(scope);
}
