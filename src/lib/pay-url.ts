/**
 * Helpers centralizados para construir URLs de pago (checkout público /p/CODE
 * y rutas relacionadas /qr/pdv/ID).
 *
 * Single source of truth: VITE_APP_URL > VITE_PAY_URL > window.location.origin
 *
 * - VITE_APP_URL: dominio público canónico del deploy (ej. https://moli-pay-enterprises.vercel.app).
 *   Usar en emails, exports CSV, webhooks y cualquier contexto donde window no exista.
 * - VITE_PAY_URL: legado, mantenido por compatibilidad. Si está setado, se prefiere.
 * - Fallback client-side: window.location.origin (útil en dev / Vercel preview).
 *
 * Importante: la columna `cliente_links_pago.url` puede guardar branding
 * (https://pay.molly.com.ar/l/CODE) que no resuelve. Para mostrar/copiar la URL
 * resoluble real, usar `buildResolvableLinkPagoUrl(urlGuardada)`.
 */

const trimSlash = (s: string) => s.replace(/\/+$/, "");

const envAppUrl = (import.meta.env.VITE_APP_URL as string | undefined)?.trim();
const envPayUrl = (import.meta.env.VITE_PAY_URL as string | undefined)?.trim();

/**
 * Origen donde corre la app. En server/no-browser devuelve "" (los llamadores
 * deben tener un fallback explícito si lo necesitan en ese contexto).
 */
export const APP_ORIGIN: string =
  (envAppUrl && envAppUrl) ||
  (envPayUrl && envPayUrl) ||
  (typeof window !== "undefined" && window.location?.origin) ||
  "";

/**
 * URL canónica de branding de MoliPay (subdominio pay). Solo marketing, no resuelve.
 * Si en el futuro se configura DNS y deploy en pay.molly.com.ar, se puede hardcodear acá
 * o leer de una env var.
 */
export const PAY_BRAND_BASE = "https://pay.molly.com.ar";

/** Construye la URL de branding (marketing, no resoluble). */
export const buildBrandingUrl = (code: string) => `${PAY_BRAND_BASE}/l/${code}`;

/** Construye la URL resoluble real del checkout público (/p/CODE). */
export const buildResolvableUrl = (code: string) => `${trimSlash(APP_ORIGIN)}/p/${code}`;

/** Construye la URL resoluble de un QR de punto de venta (/qr/pdv/ID). */
export const buildQrPdvUrl = (id: string) => `${trimSlash(APP_ORIGIN)}/qr/pdv/${id}`;

/**
 * Dada una URL guardada en DB (que puede ser branding o resoluble), devuelve la
 * URL resoluble real usando el CODE extraído.
 *
 * Acepta tanto `https://pay.molly.com.ar/l/CODE` como `https://app.com/p/CODE`
 * o `http://localhost:8080/p/CODE`. Si no se puede extraer un CODE, devuelve
 * el string tal cual.
 */
export function toResolvableLinkPagoUrl(storedUrl: string): string {
  if (!storedUrl) return storedUrl;
  const code = storedUrl.split("/").pop();
  if (!code) return storedUrl;
  return buildResolvableUrl(code);
}
