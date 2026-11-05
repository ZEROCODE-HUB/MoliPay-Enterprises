/**
 * Contrato de autenticacion: lo que la app necesita de la sesion, sin propagar
 * los tipos del proveedor. Hoy lo implementa Supabase Auth (auth-client.supabase.ts),
 * que sigue manejando tokens y renovacion: aca no se guardan tokens.
 *
 * Los errores llegan como AppError con mensaje en español.
 */

export type AuthUser = {
  id: string;
  email: string | null;
};

export type TotpEnrollment = { factorId: string; qrSvg: string; secret: string };

export interface AuthClient {
  /** Usuario de la sesion guardada (null si no hay). */
  getCurrentUser(): Promise<AuthUser | null>;
  /** Avisa cada cambio de sesion (login, logout, otro usuario). Devuelve la funcion para desuscribirse. */
  onUserChange(listener: (user: AuthUser | null) => void): () => void;
  /** Email sin confirmar: el AppError cumple isEmailNotConfirmed(). */
  signInWithPassword(email: string, password: string): Promise<AuthUser>;
  /** Manda el mail de recuperacion; el enlace vuelve a `redirectTo`. */
  requestPasswordReset(email: string, redirectTo: string): Promise<void>;
  /**
   * Abre la sesion de recuperacion con los parametros del enlace del mail
   * (code, token_hash o access_token en query o hash).
   */
  openRecoverySession(url: URL): Promise<void>;
  /** Cambia la clave del usuario de la sesion (recuperacion o cambio voluntario). */
  updatePassword(newPassword: string): Promise<void>;
  /** Confirma la clave actual antes de un cambio sensible. */
  verifyCurrentPassword(password: string): Promise<void>;
  enrollTotp(): Promise<TotpEnrollment>;
  verifyTotp(factorId: string, code: string): Promise<void>;
  /**
   * Manda un enlace de acceso y crea el usuario si no existe.
   * Hoy lo usa la invitacion de equipo de Seguridad (ver PENDIENTES).
   */
  sendSignInLink(email: string): Promise<void>;
  signOut(scope?: "local" | "others" | "global"): Promise<void>;
}
