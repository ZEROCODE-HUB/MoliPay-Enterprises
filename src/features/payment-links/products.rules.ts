import { type PaymentLink } from "@/features/payment-links/payment-links.data";

/**
 * Normaliza el texto de una bandera al id de método que usa el checkout.
 * Solo se usa como fallback cuando `comercio_banderas.metodo_key` viene null.
 */
export const BRAND_FALLBACK_METHOD: Record<string, string> = {
  visa: "visa-cred",
  "visa crédito": "visa-cred",
  "visa débito": "visa-deb",
  "visa prepaga": "visa-deb",
  mastercard: "mc-cred",
  "mastercard crédito": "mc-cred",
  "mastercard débito": "mc-deb",
  "mastercard prepaga": "mc-deb",
  amex: "amex",
  "american express": "amex",
  cabal: "cabal-cred",
  "cabal crédito": "cabal-cred",
  "cabal débito": "cabal-deb",
  naranja: "naranja",
  "naranja x": "naranja",
  diners: "diners",
  maestro: "maestro",
};

export function methodIdFromBrand(brand: string): string {
  const key = brand.trim().toLowerCase();
  return BRAND_FALLBACK_METHOD[key] ?? key.replace(/\s+/g, "_");
}

export function linkDisplayStatus(l: PaymentLink): string {
  if (l.status === "Activo" && l.expiresAt) {
    const parts = l.expiresAt.split("/");
    if (parts.length === 3) {
      const exp = new Date(`${parts[2]}-${parts[1]}-${parts[0]}T23:59:59`);
      if (exp.getTime() < Date.now()) return "Vencido";
    }
  }
  return l.status;
}
