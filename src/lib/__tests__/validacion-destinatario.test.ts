import { describe, expect, test } from "bun:test";
import { detectIdentifierKind, isValidFormat, recipientValidator } from "../recipient-validation";
import { validateRecipient } from "../recipient-bdc";

/**
 * Validacion de destinatario.
 *
 * - El chequeo de FORMATO se hace local (sin red) en `validateRecipient`.
 * - El caso "valido" se prueba contra el validador local (`recipientValidator`),
 *   que es el que se usa cuando no hay backend BDC: asi el test es determinista
 *   y no depende de que el backend este levantado.
 */

const CBU = "4320001010003138730019";
const CVU = "0000003149436000708811";

describe("validateRecipient - formato invalido (nunca valida)", () => {
  test("CBU con menos de 22 digitos", async () => {
    const r = await validateRecipient("4320001010", "CBU");
    expect(r.ok).toBe(false);
    expect(r.status).toBe("invalid_format");
    expect(r.titular).toBeUndefined();
  });

  test("CBU con letras", async () => {
    const r = await validateRecipient("43200010100031387300aa", "CBU");
    expect(r.ok).toBe(false);
    expect(r.status).toBe("invalid_format");
  });

  test("tipo UNKNOWN (no se puede clasificar)", async () => {
    const r = await validateRecipient("123456", "UNKNOWN");
    expect(r.ok).toBe(false);
    expect(r.status).toBe("invalid_format");
  });

  test("alias demasiado corto", async () => {
    const r = await validateRecipient("corto", "ALIAS");
    expect(r.ok).toBe(false);
    expect(r.status).toBe("invalid_format");
  });

  test("cadena vacia", async () => {
    const r = await validateRecipient("", "CBU");
    expect(r.ok).toBe(false);
    expect(r.status).toBe("invalid_format");
  });

  test("siempre devuelve un mensaje de error claro", async () => {
    const r = await validateRecipient("123", "CBU");
    expect(r.errorMessage).toContain("inválido");
  });
});

describe("validador local (sin backend) - identificador valido", () => {
  test("CBU de 22 digitos -> titular", async () => {
    const r = await recipientValidator.validate({ identifier: CBU, kind: "CBU" });
    expect(r.ok).toBe(true);
    expect(r.status).toBe("valid");
    expect(r.titular).toBeDefined();
    expect((r.titular?.nombre ?? "").length).toBeGreaterThan(0);
  });

  test("CVU (empieza con 000) -> titular", async () => {
    const r = await recipientValidator.validate({ identifier: CVU, kind: "CVU" });
    expect(r.ok).toBe(true);
    expect(r.titular).toBeDefined();
  });

  test("alias valido -> titular", async () => {
    const r = await recipientValidator.validate({ identifier: "proveedor.sa", kind: "ALIAS" });
    expect(r.ok).toBe(true);
    expect(r.titular).toBeDefined();
  });

  test("recorta espacios antes de resolver", async () => {
    const r = await recipientValidator.validate({ identifier: `   ${CBU}   `, kind: "CBU" });
    expect(r.ok).toBe(true);
    expect(r.identifier).toBe(CBU);
  });

  test("formato invalido tampoco pasa por el validador local", async () => {
    const r = await recipientValidator.validate({ identifier: "432", kind: "CBU" });
    expect(r.ok).toBe(false);
    expect(r.status).toBe("invalid_format");
  });
});

describe("clasificacion del identificador", () => {
  test("coincide con el tipo esperado", () => {
    expect(detectIdentifierKind(CBU)).toBe("CBU");
    expect(detectIdentifierKind(CVU)).toBe("CVU");
    expect(detectIdentifierKind("proveedor.sa")).toBe("ALIAS");
    expect(isValidFormat("CBU", CBU)).toBe(true);
    expect(isValidFormat("ALIAS", "corto")).toBe(false);
  });

  test("siempre devuelve validatedAt en formato ISO", async () => {
    const r = await recipientValidator.validate({ identifier: CBU, kind: "CBU" });
    expect(Number.isNaN(Date.parse(r.validatedAt))).toBe(false);
  });
});
