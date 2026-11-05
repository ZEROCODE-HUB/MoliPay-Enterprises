/**
 * URL base de molipay-back (pagos, API de desarrolladores, API publica /v1).
 * Usa VITE_PAYMENTS_API_URL si existe; si no, el backend de produccion, para que
 * funcione igual sin variables de entorno.
 * (Las llamadas a BDC usan su propia variable: ver lib/bdc/config.ts.)
 */
export function paymentsApiUrl(): string {
  const url = import.meta.env.VITE_PAYMENTS_API_URL || "https://molipayservicebks.vercel.app";
  return url.replace(/\/+$/, "");
}
