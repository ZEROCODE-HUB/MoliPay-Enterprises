// ============================================================================
// recipient-bdc.ts
// Recipient validation against the bank (BDC), falling back to the local mock.
//
// - BDC enabled (sandbox or homologacion): everything shown comes from the bank
//   via `GET /accounts/info/{CBU_CVU_ALIAS}` on our own backend. Only the format
//   (22 digits, etc.) is checked locally, and if the bank does not answer the error
//   is returned instead of inventing an account holder.
// - No backend (internal mode): the usual local validation.
//
// Used by the transfers screen and the recipients agenda so both hit the same place.
// ============================================================================

import {
recipientValidator,
detectIdentifierKind,
isValidFormat,
type IdentifierKind,
type RecipientValidationResult,
} from "@/features/transfers/recipient-validation";
import { createBdcClient,canQueryBdc,type BdcAccountInfoData } from "@/features/transfers/bdc";

/** 11 digits → `20-00000000-01`. Anything else is returned unchanged. */
export function formatCuit(cuit: string): string {
  const digits = cuit.replace(/\D/g, "");
  return /^\d{11}$/.test(digits)
    ? `${digits.slice(0, 2)}-${digits.slice(2, 10)}-${digits.slice(10)}`
    : cuit;
}

/** Palabras que el banco usa en el tipo de cuenta. */
const KIND_ACCOUNT_WORDS: Record<string, string> = {
  SAVING: "Caja de ahorro",
  CHECKING: "Cuenta corriente",
  ACCOUNT: "",
  WALLET: "Billetera virtual",
  CVU: "Billetera virtual",
  VIRTUAL: "",
  PAYMENT: "Cuenta de pago",
  CREDIT: "Cuenta de crédito",
};

const CURRENCIES_KIND = ["ARS", "USD", "EUR", "BRL"];

/**
 * `SAVING_ACCOUNT_ARS` → `Caja de ahorro (ARS)`.
 * Si el valor no se reconoce se devuelve tal cual (nunca se inventa).
 */
export function prettyKindAccount(raw?: string | null): string {
  const s = (raw ?? "").trim();
  if (!s) return "";
  const partes = s.toUpperCase().split("_").filter(Boolean);
  const currencies = partes.filter((p) => CURRENCIES_KIND.includes(p));
  const words = [
    ...new Set(
      partes
        .filter((p) => !CURRENCIES_KIND.includes(p))
        .map((p) => KIND_ACCOUNT_WORDS[p] ?? p.toLowerCase())
        .filter(Boolean),
    ),
  ];
  const base = words.join(" ");
  if (currencies.length) return `${base} (${currencies.join(", ")})`.trim();
  return base || s;
}

/** Código ISO numérico de moneda del banco → sigla (`032` → `ARS`). */
const CURRENCIES_ISO: Record<string, string> = {
  "032": "ARS",
  "840": "USD",
  "978": "EUR",
  "986": "BRL",
};

export function prettyCurrency(raw?: string | null): string {
  const s = (raw ?? "").trim();
  if (!s) return "";
  return CURRENCIES_ISO[s] ?? CURRENCIES_ISO[s.padStart(3, "0")] ?? s;
}

/** `isPhysicalPerson` → etiqueta legible. */
export function prettyKindPerson(isPhysicalPerson?: boolean | null): string {
  if (isPhysicalPerson === true) return "Persona física";
  if (isPhysicalPerson === false) return "Persona jurídica";
  return "";
}

export async function validateRecipient(
  identifier: string,
  kind: IdentifierKind,
): Promise<RecipientValidationResult> {
  const raw = identifier.trim();
  const validatedAt = new Date().toISOString();
  const provider = canQueryBdc() ? "bdc" : "mock";

  // 1) Format: local check, does not depend on the bank.
  if (kind === "UNKNOWN" || !isValidFormat(kind, raw)) {
    return {
      status: "invalid_format",
      ok: false,
      kind,
      identifier: raw,
      provider,
      errorMessage: "Formato de CBU/CVU (22 dígitos) o Alias (6-20 caracteres) inválido",
      validatedAt,
    };
  }

  // 2) Internal mode: no bank connection.
  if (!canQueryBdc()) {
    return recipientValidator.validate({ identifier: raw, kind });
  }

  // 3) Real bank lookup.
  let info: { statusCode?: number; message?: string; data?: BdcAccountInfoData };
  try {
    info = await createBdcClient().infoCuenta(raw);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return {
      status: "timeout",
      ok: false,
      kind,
      identifier: raw,
      provider,
      errorMessage: `No se pudo consultar al banco: ${msg}`,
      validatedAt,
    };
  }

  if (info?.statusCode !== 0) {
    return {
      status: "not_found",
      ok: false,
      kind,
      identifier: raw,
      provider,
      errorMessage: info?.message ?? `El banco devolvió error ${info.statusCode}`,
      validatedAt,
    };
  }

  const owner = info?.data?.owners?.[0];
  if (!owner) {
    return {
      status: "not_found",
      ok: false,
      kind,
      identifier: raw,
      provider,
      errorMessage: "El banco no devolvió titular para esa dirección",
      validatedAt,
    };
  }

  // The address returned by the bank wins; if it is not usable, the one that was
  // searched is used (the sandbox returns 000... in accountRouting).
  const dirBank = String(info?.data?.accountRouting?.address ?? "");
  const cbu = /^\d{22}$/.test(dirBank) && !/^0{22}$/.test(dirBank) ? dirBank : raw;

  return {
    status: "valid",
    ok: true,
    kind,
    identifier: raw,
    provider,
    raw: info,
    titular: {
      nombre: owner.displayName ?? raw,
      cuit: formatCuit(owner.id ?? ""),
      cbu,
      alias: info?.data?.label ?? "",
      banco: info?.data?.entityRouting?.name ?? "",
      // Datos extra que manda el banco (se muestran como detalle del destinatario).
      bancoCodigo: info?.data?.entityRouting?.code ?? "",
      tipoCuenta: prettyKindAccount(info?.data?.type),
      moneda: prettyCurrency(info?.data?.currency),
      activa: info?.data?.isActive,
      tipoPersona: prettyKindPerson(owner.isPhysicalPerson),
      tipoDoc: owner.idType ?? "",
    },
    validatedAt,
  };
}

export { detectIdentifierKind };
