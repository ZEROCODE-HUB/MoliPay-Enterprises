/**
 * Helpers centralizados para construir URLs de pago (checkout público /p/CODE
 * y rutas relacionadas /qr/pdv/ID).
 *
 * Single source of truth: el dominio de producción hardcodeado en
 * `PAY_APP_ORIGIN`. No depende de `window.location` ni de variables de build, así
 * un link copiado desde localhost o desde un preview siempre apunta al deploy.
 *
 * Importante: la columna `cliente_links_pago.url` puede guardar branding
 * (https://pay.molly.com.ar/l/CODE) o un origen viejo (localhost). Para
 * mostrar/copiar la URL resoluble real, usar `toResolvableLinkPagoUrl(urlGuardada)`.
 */

const trimSlash = (s: string) => s.replace(/\/+$/, "");

/**
 * Origen público donde está desplegada MoliPay Enterprises.
 *
 * Está hardcodeado a propósito: los links de pago se generan y se copian desde
 * este dominio, aunque el portal se esté viendo en localhost o en un preview.
 */
export const PAY_APP_ORIGIN = "https://molly-pay-enterprises.vercel.app";

/** Origen con el que se construyen las URLs de pago. */
export const APP_ORIGIN: string = PAY_APP_ORIGIN;

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
