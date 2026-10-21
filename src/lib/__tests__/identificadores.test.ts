import { describe, expect, test } from "bun:test";
import { kindForDb } from "../transfer-store";
import { detectIdentifierKind, isValidFormat } from "../recipient-validation";
import { formatearCuit } from "../recipient-bdc";

/**
 * Identificadores de destinatario (CBU / CVU / alias). Si se clasifican mal, se
 * valida/transfiere contra un dato equivocado.
 */
describe("detectIdentifierKind", () => {
  test("22 digitos sin 000 al inicio -> CBU", () => {
    expect(detectIdentifierKind("4320001010003138730019")).toBe("CBU");
  });

  test("22 digitos que empiezan con 000 -> CVU", () => {
    expect(detectIdentifierKind("0000003149436000708811")).toBe("CVU");
  });

  test("alias con letras (6-20 chars) -> ALIAS", () => {
    expect(detectIdentifierKind("proveedor.sa")).toBe("ALIAS");
    expect(detectIdentifierKind("alias.de.prueba")).toBe("ALIAS");
  });

  test("alias con punto, guion o guion bajo -> ALIAS", () => {
    expect(detectIdentifierKind("juan_perez-01")).toBe("ALIAS");
  });

  test("recorta espacios: ' 4320... ' -> CBU", () => {
    expect(detectIdentifierKind("  4320001010003138730019  ")).toBe("CBU");
  });

  test("numeros que no son de 22 digitos -> UNKNOWN", () => {
    expect(detectIdentifierKind("12345")).toBe("UNKNOWN");
    expect(detectIdentifierKind("12345678901234567890123")).toBe("UNKNOWN"); // 23 digitos
  });

  test("alias solo numerico -> UNKNOWN (evita confundirlo con una cuenta)", () => {
    expect(detectIdentifierKind("123456")).toBe("UNKNOWN");
  });

  test("vacio, muy corto, muy largo o con espacios -> UNKNOWN", () => {
    expect(detectIdentifierKind("")).toBe("UNKNOWN");
    expect(detectIdentifierKind("   ")).toBe("UNKNOWN");
    expect(detectIdentifierKind("ab")).toBe("UNKNOWN");
    expect(detectIdentifierKind("a".repeat(21))).toBe("UNKNOWN");
    expect(detectIdentifierKind("alias con espacios")).toBe("UNKNOWN");
  });
});

describe("isValidFormat", () => {
  test("CBU/CVU: exactamente 22 digitos", () => {
    expect(isValidFormat("CBU", "4320001010003138730019")).toBe(true);
    expect(isValidFormat("CVU", "0000003149436000708811")).toBe(true);
    expect(isValidFormat("CBU", "123")).toBe(false);
    expect(isValidFormat("CBU", "432000101000313873001a")).toBe(false);
  });

  test("ALIAS: entre 6 y 20 caracteres validos", () => {
    expect(isValidFormat("ALIAS", "proveedor.sa")).toBe(true);
    expect(isValidFormat("ALIAS", "corto")).toBe(false);
  });

  test("UNKNOWN nunca es valido", () => {
    expect(isValidFormat("UNKNOWN", "lo que sea")).toBe(false);
  });
});

describe("kindForDb (lo que se guarda en la base)", () => {
  test("CBU / CVU / ALIAS pasan tal cual", () => {
    expect(kindForDb("4320001010003138730019")).toBe("CBU");
    expect(kindForDb("0000003149436000708811")).toBe("CVU");
    expect(kindForDb("proveedor.sa")).toBe("ALIAS");
  });

  test("UNKNOWN se normaliza a ALIAS (la base solo acepta CBU/CVU/ALIAS)", () => {
    expect(kindForDb("123456")).toBe("ALIAS");
  });
});

describe("formatearCuit", () => {
  test("11 digitos -> 20-00000000-01", () => {
    expect(formatearCuit("99700000123")).toBe("99-70000012-3");
  });

  test("11 digitos con guiones -> se formatea igual", () => {
    expect(formatearCuit("99-70000012-3")).toBe("99-70000012-3");
  });

  test("si no tiene 11 digitos se devuelve tal cual (no inventa)", () => {
    expect(formatearCuit("200000000001")).toBe("200000000001");
    expect(formatearCuit("")).toBe("");
  });
});
