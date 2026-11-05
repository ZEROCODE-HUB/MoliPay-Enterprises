import { getRouteApi } from "@tanstack/react-router";

export const route = getRouteApi("/p/$code");

export const formatARS = (n: number) =>
  `$ ${Number(n || 0).toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** Fecha y hora del comprobante, en hora local de quien pago. */
export const formatDateHour = (d: Date) =>
  d.toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

export const BATCH_CATEGORY_TO_METHODS: Record<string, string[]> = {
  TARJETA_CREDITO: ["visa-cred", "mc-cred", "amex", "cabal-cred", "naranja", "diners"],
  TARJETA_DEBITO: ["visa-deb", "mc-deb", "cabal-deb", "maestro"],
  TRANSFERENCIA: ["transferencia"],
  QR: ["qr"],
};

export const EXTRA_METHODS: Array<{
  id: string;
  label: string;
  category: "credit" | "debit" | "other";
  enabled: boolean;
}> = [
  { id: "transferencia", label: "Transferencia", category: "other", enabled: true },
  { id: "qr", label: "Código QR", category: "other", enabled: true },
];

/**
 * Cada bandera del comercio puede habilitar mas de un metodo visible (Visa
 * credito y Visa debito, por ejemplo). Se usa para derivar que ids de metodo
 * mostrar a partir de las banderas activas y, al simular, para encontrar el
 * UUID de la bandera que corresponde al metodo elegido.
 */
export const BRAND_TO_METHODS: Record<string, string[]> = {
  visa: ["visa-cred", "visa-deb"],
  visa_débito: ["visa-deb"],
  visa_crédito: ["visa-cred"],
  visa_prepaga: ["visa-deb"],
  mastercard: ["mc-cred", "mc-deb"],
  mastercard_débito: ["mc-deb"],
  mastercard_crédito: ["mc-cred"],
  mastercard_prepaga: ["mc-deb"],
  amex: ["amex"],
  american_express: ["amex"],
  cabal: ["cabal-cred", "cabal-deb"],
  cabal_débito: ["cabal-deb"],
  cabal_crédito: ["cabal-cred"],
  naranja: ["naranja"],
  naranja_x: ["naranja"],
  diners: ["diners"],
  maestro: ["maestro"],
  transferencia: ["transferencia"],
  qr: ["qr"],
  pago_fácil: ["transferencia"],
  rapipago: ["transferencia"],
};

export function variantsDeBrand(flag: string): string[] {
  const lower = flag.toLowerCase();
  return BRAND_TO_METHODS[lower] || BRAND_TO_METHODS[lower.split("_")[0]] || [lower];
}

export function expandMethods(raw: string[] | null | undefined): string[] {
  if (!raw?.length) return [];
  const ids = raw.flatMap((m) => BATCH_CATEGORY_TO_METHODS[m] ?? (m ? [m] : []));
  return Array.from(new Set(ids));
}

export function getMethodIdFromBrand(brand: string): string {
  const lower = brand.toLowerCase();
  const BRAND_TO_METHODS: Record<string, string> = {
    visa: "visa-cred",
    visa_débito: "visa-deb",
    visa_crédito: "visa-cred",
    visa_prepaga: "visa-deb",
    mastercard: "mc-cred",
    mastercard_débito: "mc-deb",
    mastercard_crédito: "mc-cred",
    mastercard_prepaga: "mc-deb",
    amex: "amex",
    american_express: "amex",
    cabal: "cabal-cred",
    cabal_débito: "cabal-deb",
    cabal_crédito: "cabal-cred",
    naranja: "naranja",
    naranja_x: "naranja",
    diners: "diners",
    maestro: "maestro",
    transferencia: "transferencia",
    qr: "qr",
    pago_fácil: "transferencia",
    rapipago: "transferencia",
  };
  return BRAND_TO_METHODS[lower] || BRAND_TO_METHODS[lower.split("_")[0]] || lower;
}

export function isCardMethod(id: string) {
  return [
    "visa-cred",
    "mc-cred",
    "amex",
    "cabal-cred",
    "naranja",
    "diners",
    "visa-deb",
    "mc-deb",
    "cabal-deb",
    "maestro",
  ].includes(id);
}
