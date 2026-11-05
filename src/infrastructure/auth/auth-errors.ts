/** Mensajes en español para los errores de Supabase Auth. */

const ERROR_MESSAGES: [RegExp, string][] = [
  [/invalid login credentials|invalid credentials/i, "Usuario o contraseña incorrectos."],
  [
    /email not confirmed/i,
    "El correo aún no está confirmado. Revisá tu bandeja de entrada y confirmá tu email para poder ingresar.",
  ],
  [/user not found/i, "No existe una cuenta con ese correo."],
  [
    /user already registered|already exists|already been registered/i,
    "Ya existe una cuenta con ese correo.",
  ],
  [
    /too many requests|rate limit|too many.*requests/i,
    "Demasiados intentos fallidos. Esperá unos minutos y volvé a intentar.",
  ],
  [/invalid email/i, "Ingresá un correo electrónico válido."],
  [
    /network|fetch failed|failed to fetch/i,
    "No se pudo conectar. Verificá tu conexión e intentá de nuevo.",
  ],
  [
    /email.*not.*confirmed|confirm.*email/i,
    "El correo aún no está confirmado. Revisá tu bandeja de entrada.",
  ],
  [
    /confirmation.*expired|token.*expired|expired/i,
    "El enlace expiró o ya no es válido. Solicitalo nuevamente.",
  ],
  [/invalid.*token|token.*invalid/i, "El enlace no es válido. Solicitalo nuevamente."],
];

export function getAuthErrorMessage(message: string): string {
  for (const [pattern, friendly] of ERROR_MESSAGES) {
    if (pattern.test(message)) return friendly;
  }
  return "No se pudo iniciar sesión. Intentalo nuevamente.";
}

/** El login fallo porque el email todavia no esta confirmado (el AppError guarda el error original en `cause`). */
export function isEmailNotConfirmed(error: unknown): boolean {
  const cause =
    error instanceof Error ? (error.cause as { message?: string } | undefined) : undefined;
  return /email not confirmed/i.test(cause?.message ?? "");
}
