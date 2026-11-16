import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { authClient } from "@/app/dependencies";
import { useSessionUser } from "@/features/session/session.hooks";
import { privateScope } from "@/shared/lib/query-scope";
import { postLoginDestination, type PostLoginDestination } from "./auth.rules";
import { getCustomerAccess } from "./auth.supabase";

/**
 * Acciones de autenticacion para las pantallas (login, recuperacion, seguridad).
 * Los errores llegan como AppError con mensaje en español.
 */
export function useAuthActions() {
  return useMemo(
    () => ({
      signIn: (email: string, password: string) => authClient.signInWithPassword(email, password),
      requestPasswordReset: (email: string) =>
        authClient.requestPasswordReset(email, `${window.location.origin}/reset-password`),
      openRecoverySession: () => authClient.openRecoverySession(new URL(window.location.href)),
      updatePassword: (password: string) => authClient.updatePassword(password),
      /** Verifica la clave actual y recien ahi la cambia. */
      changePassword: async (current: string, next: string) => {
        await authClient.verifyCurrentPassword(current);
        await authClient.updatePassword(next);
      },
      getMfaState: () => authClient.getMfaState(),
      enrollTotp: () => authClient.enrollTotp(),
      verifyTotp: (factorId: string, code: string) => authClient.verifyTotp(factorId, code),
      unenrollFactor: (factorId: string) => authClient.unenrollFactor(factorId),
      sendSignInLink: (email: string) => authClient.sendSignInLink(email),
      signOut: (scope?: "local" | "others" | "global") => authClient.signOut(scope),
      /** A donde entra el usuario recien logueado (si no se puede leer el estado, a la pantalla de estado). */
      destinationAfterLogin: async (email: string): Promise<PostLoginDestination> => {
        try {
          return postLoginDestination(await getCustomerAccess(email));
        } catch {
          return postLoginDestination(null);
        }
      },
    }),
    [],
  );
}

export const mfaKeys = {
  state: (userId: string) => [...privateScope(userId), "auth", "mfa"] as const,
};

/**
 * Segundo factor del usuario logueado. `challengeRequired` = tiene 2FA y la
 * sesion todavia no lo verifico: el portal pide el codigo antes de entrar.
 */
export function useMfaState() {
  const userId = useSessionUser().user?.id ?? "";
  return useQuery({
    queryKey: mfaKeys.state(userId),
    queryFn: () => authClient.getMfaState(),
    enabled: !!userId,
    staleTime: 30_000,
  });
}
