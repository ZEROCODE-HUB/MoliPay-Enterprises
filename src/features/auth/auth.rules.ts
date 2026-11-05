/** Estado del cliente al iniciar sesion (para decidir a donde entra). */
export type CustomerAccess = {
  /** clientes.estado; null = el usuario todavia no tiene cliente. */
  status: string | null;
  onboardingComplete: boolean | null;
  /** Ya envio validaciones o documentos. */
  hasOnboardingEvidence: boolean;
};

export type PostLoginDestination =
  | "/app"
  | "/onboarding/datos-personales"
  | "/onboarding/en-proceso";

const ACTIVE = new Set(["activado", "activo"]);

/**
 * A donde entra el usuario despues de loguearse. Activo -> portal; sin cliente o
 * registrado sin haber enviado nada -> alta; el resto (pendiente, en revision,
 * deshabilitado) -> pantalla de estado. Si no se pudo leer el estado: pantalla de estado.
 */
export function postLoginDestination(access: CustomerAccess | null): PostLoginDestination {
  if (!access) return "/onboarding/en-proceso";
  if (access.status === null) return "/onboarding/datos-personales";
  if (ACTIVE.has(access.status)) return "/app";
  if (access.status === "registrado" && !access.onboardingComplete && !access.hasOnboardingEvidence)
    return "/onboarding/datos-personales";
  return "/onboarding/en-proceso";
}
