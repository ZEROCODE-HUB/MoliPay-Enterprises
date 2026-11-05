import type { SupabaseClient,User } from "@supabase/supabase-js";
import { supabase } from "@/infrastructure/supabase/client";
import { AppError } from "@/shared/lib/errors";
import type { AuthClient,AuthUser } from "./auth-client";
import { getAuthErrorMessage } from "./auth-errors";

const toAuthUser = (user: User | null | undefined): AuthUser | null =>
  user ? { id: user.id, email: user.email ?? null } : null;

const NOT_CONFIGURED = "El inicio de sesión no está disponible en este momento.";

/** Error de Supabase Auth -> AppError con mensaje en español (el original queda en `cause`). */
function toAuthError(error: { message: string }, operation: string, fallback?: string): AppError {
  const kind = /network|fetch/i.test(error.message) ? "network" : "validation";
  return new AppError(kind, fallback ?? getAuthErrorMessage(error.message), {
    context: { feature: "auth", operation },
    cause: error,
  });
}

function client(): SupabaseClient {
  if (!supabase) throw new AppError("unknown", NOT_CONFIGURED, { context: { feature: "auth" } });
  return supabase;
}

export function createSupabaseAuthClient(): AuthClient {
  return {
    async getCurrentUser() {
      if (!supabase) return null;
      const { data } = await supabase.auth.getSession();
      return toAuthUser(data.session?.user);
    },
    onUserChange(listener) {
      if (!supabase) return () => undefined;
      const { data } = supabase.auth.onAuthStateChange((_event, session) =>
        listener(toAuthUser(session?.user)),
      );
      return () => data.subscription.unsubscribe();
    },
    async signInWithPassword(email, password) {
      const { data, error } = await client().auth.signInWithPassword({ email, password });
      if (error) throw toAuthError(error, "sign_in");
      const user = toAuthUser(data.user);
      if (!user) throw new AppError("unknown", "No se pudo iniciar sesión. Intentalo nuevamente.");
      return user;
    },
    async requestPasswordReset(email, redirectTo) {
      const { error } = await client().auth.resetPasswordForEmail(email, { redirectTo });
      if (error) throw toAuthError(error, "password_reset");
    },
    async openRecoverySession(url) {
      const sb = client();
      const hash = new URLSearchParams(url.hash.replace(/^#/, ""));
      const param = (k: string) => url.searchParams.get(k) ?? hash.get(k);
      const code = param("code");
      const tokenHash = param("token_hash");
      let error: { message: string } | null = null;
      try {
        if (code) error = (await sb.auth.exchangeCodeForSession(code)).error;
        else if (tokenHash)
          error = (await sb.auth.verifyOtp({ token_hash: tokenHash, type: "recovery" })).error;
        else if (hash.get("access_token")) {
          // El cliente de Supabase ya toma el token del hash al iniciar: solo se confirma que haya sesion.
          const r = await sb.auth.getSession();
          error = r.error ?? (r.data.session ? null : { message: "invalid token" });
        } else
          throw new AppError(
            "validation",
            "El enlace de recuperación no es válido o le faltan parámetros.",
            {
              context: { feature: "auth", operation: "recovery" },
            },
          );
      } catch (e) {
        if (e instanceof AppError) throw e;
        error = { message: e instanceof Error ? e.message : "" };
      }
      if (error) throw toAuthError(error, "recovery");
    },
    async updatePassword(newPassword) {
      const { error } = await client().auth.updateUser({ password: newPassword });
      if (error) throw toAuthError(error, "update_password");
    },
    async verifyCurrentPassword(password) {
      const sb = client();
      const { data } = await sb.auth.getUser();
      const email = data.user?.email;
      if (!email) throw new AppError("permission", "Tu sesión expiró. Volvé a iniciar sesión.");
      const { error } = await sb.auth.signInWithPassword({ email, password });
      if (error) {
        const e = toAuthError(error, "reauthenticate", "La contraseña actual es incorrecta.");
        throw new AppError(e.kind, e.message, {
          field: "current",
          context: e.context,
          cause: error,
        });
      }
    },
    async enrollTotp() {
      const { data, error } = await client().auth.mfa.enroll({ factorType: "totp" });
      if (error) throw toAuthError(error, "mfa_enroll", "No se pudo configurar el segundo factor.");
      return { factorId: data.id, qrSvg: data.totp.qr_code ?? "", secret: data.totp.secret };
    },
    async verifyTotp(factorId, code) {
      const sb = client();
      const challenge = await sb.auth.mfa.challenge({ factorId });
      if (challenge.error)
        throw toAuthError(
          challenge.error,
          "mfa_challenge",
          "Código inválido o verificación fallida.",
        );
      const { error } = await sb.auth.mfa.verify({
        factorId,
        challengeId: challenge.data.id,
        code,
      });
      if (error) throw toAuthError(error, "mfa_verify", "Código inválido o verificación fallida.");
    },
    async sendSignInLink(email) {
      const { error } = await client().auth.signInWithOtp({
        email,
        options: { shouldCreateUser: true },
      });
      if (error) throw toAuthError(error, "sign_in_link");
    },
    async signOut(scope = "local") {
      if (!supabase) return;
      const { error } = await supabase.auth.signOut({ scope });
      if (error) throw toAuthError(error, "sign_out", "No se pudo cerrar la sesión.");
    },
  };
}
