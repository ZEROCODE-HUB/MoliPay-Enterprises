import { AppError,type AppErrorContext,type AppErrorKind } from "@/shared/lib/errors";

const PERMISSION_PATTERNS: RegExp[] = [
  /permission denied/i,
  /insufficient privilege/i,
  /row-level security/i,
  /new row violates row-level security/i,
  /42501/,
];

export type SupabaseDataError = {
  code: string | null;
  message: string;
  details?: string | null;
  hint?: string | null;
};

export function toDataError(err: unknown): SupabaseDataError {
  if (err && typeof err === "object" && "message" in err) {
    const e = err as {
      code?: string | null;
      message?: string;
      details?: string | null;
      hint?: string | null;
    };
    return {
      code: e.code ?? null,
      message: e.message ?? "Error desconocido",
      details: e.details ?? null,
      hint: e.hint ?? null,
    };
  }
  return { code: null, message: String(err) };
}

export function isPermissionError(err: unknown): boolean {
  const e = toDataError(err);
  if (e.code === "42501") return true;
  return PERMISSION_PATTERNS.some((p) => p.test(e.message));
}

/**
 * Las Edge Functions devuelven la causa real en el BODY de la respuesta, pero
 * `functions.invoke` sólo expone el genérico "Edge Function returned a non-2xx
 * status code". Esto lo recupera para que el toast muestre el motivo verdadero
 * (por ejemplo, el rechazo de Resend cuando el dominio no está verificado).
 */
export async function getEdgeFunctionErrorMessage(err: unknown): Promise<string | null> {
  if (!err || typeof err !== "object") return null;
  const res = (err as { context?: unknown }).context as Response | undefined;
  if (!res || typeof res.text !== "function") return null;

  try {
    const text = await res.text();
    if (!text) return null;

    let cuerpo: unknown = text;
    try {
      cuerpo = JSON.parse(text);
    } catch {
      // no es JSON: se muestra tal cual
    }

    const obj = (typeof cuerpo === "object" && cuerpo !== null ? cuerpo : {}) as Record<
      string,
      unknown
    >;
    const message =
      typeof obj.error === "string"
        ? obj.error
        : typeof obj.message === "string"
          ? obj.message
          : typeof cuerpo === "string"
            ? cuerpo
            : null;

    if (!message) return text.slice(0, 400);
    if (/testing emails to your own email|verify a domain/i.test(message)) {
      return "No se pudo enviar el correo de verificación: Resend no tiene un dominio verificado y sólo permite enviar a la dirección de la cuenta. Verificá el dominio en resend.com/domains y ajustá RESEND_FROM.";
    }
    return message;
  } catch {
    return null;
  }
}

export function isNotConfiguredError(err: unknown): boolean {
  return /Supabase no está configurado/i.test(toDataError(err).message);
}

// ---------------------------------------------------------------------------
// Errores de Supabase -> AppError (mensaje en español para el usuario)
// ---------------------------------------------------------------------------

const GENERIC_MESSAGES: Record<AppErrorKind, string> = {
  permission: "No tenés permiso para realizar esta acción.",
  not_found: "No se encontró lo que buscabas.",
  validation: "Revisá los datos ingresados.",
  conflict: "La operación entra en conflicto con datos existentes.",
  contract: "Recibimos datos inesperados. Ya quedó registrado; probá más tarde.",
  network: "No se pudo conectar. Verificá tu conexión e intentá de nuevo.",
  unknown: "Ocurrió un error. Probá de nuevo.",
};

const SYSTEM_PERMISSION_TEXT = /permission denied|row-level security|insufficient privilege/i;

/**
 * Clasifica un error de Supabase/PostgREST.
 * Los textos que levantan NUESTRAS funciones (RAISE EXCEPTION en español: P0001, 22023 y los
 * 42501 propios) son para el usuario; los del sistema se reemplazan por un mensaje generico.
 */
export function toAppError(err: unknown, context: AppErrorContext = {}): AppError {
  if (err instanceof AppError) return err;
  const e = toDataError(err);
  const raised = (kind: AppErrorKind) => new AppError(kind, e.message, { context, cause: err });
  const generic = (kind: AppErrorKind) =>
    new AppError(kind, GENERIC_MESSAGES[kind], { context, cause: err });

  switch (e.code) {
    case "P0001":
    case "22023":
      return raised("validation");
    case "42501":
      return SYSTEM_PERMISSION_TEXT.test(e.message) ? generic("permission") : raised("permission");
    case "PGRST116":
      return generic("not_found");
    case "23505":
      return new AppError("conflict", "Ya existe un registro con esos datos.", {
        context,
        cause: err,
      });
    case "23503":
      return new AppError("conflict", "Está en uso por otros registros.", { context, cause: err });
  }
  if (isPermissionError(err)) return generic("permission");
  if (/failed to fetch|network|fetch failed|timeout|aborted/i.test(e.message))
    return generic("network");
  return generic("unknown");
}

/** Codigo de Postgres del error original (23505 duplicado, 23503 FK...). Para decidir, nunca para mostrar. */
export function pgErrorCode(err: unknown): string | null {
  return toDataError(err instanceof AppError ? err.cause : err).code;
}

/** Texto tecnico del error original. Para decidir o loguear, nunca para mostrar. */
export function technicalErrorText(err: unknown): string {
  const e = toDataError(err instanceof AppError ? err.cause : err);
  return `${e.message} ${e.details ?? ""}`;
}
