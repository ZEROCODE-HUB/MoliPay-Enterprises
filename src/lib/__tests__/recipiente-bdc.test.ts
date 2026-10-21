import { describe, expect, test } from "bun:test";
import {
  formatearCuit,
  prettyMoneda,
  prettyTipoCuenta,
  prettyTipoPersona,
} from "../recipient-bdc";

/**
 * Detalle del destinatario: se muestra TAL CUAL lo devuelve el banco
 * (`/accounts/info`). Si un formateador inventa o pierde un dato, el cliente
 * confirma una transferencia viendo informacion equivocada.
 */

describe("formatearCuit", () => {
  test("11 digitos -> con guiones", () => {
    expect(formatearCuit("20000000001")).toBe("20-00000000-1");
    expect(formatearCuit("20111111112")).toBe("20-11111111-2");
  });

  test("si ya viene con guiones lo deja igual", () => {
    expect(formatearCuit("20-11111111-2")).toBe("20-11111111-2");
  });

  test("vacio -> vacio (no inventa)", () => {
    expect(formatearCuit("")).toBe("");
  });
});

describe("prettyTipoCuenta", () => {
  test("traduce el tipo del banco a texto legible", () => {
    expect(prettyTipoCuenta("SAVING_ACCOUNT_ARS")).toBe("Caja de ahorro (ARS)");
    expect(prettyTipoCuenta("CHECKING_ACCOUNT_ARS")).toBe("Cuenta corriente (ARS)");
  });

  test("billetera virtual (CVU)", () => {
    expect(prettyTipoCuenta("CVU_WALLET_ARS")).toBe("Billetera virtual (ARS)");
  });

  test("moneda extranjera", () => {
    expect(prettyTipoCuenta("SAVING_ACCOUNT_USD")).toBe("Caja de ahorro (USD)");
  });

  test("tipo desconocido -> no inventa, lo deja legible", () => {
    expect(prettyTipoCuenta("SOMETHING_WEIRD")).toBe("something weird");
  });

  test("vacio -> vacio", () => {
    expect(prettyTipoCuenta("")).toBe("");
    expect(prettyTipoCuenta(null)).toBe("");
    expect(prettyTipoCuenta(undefined)).toBe("");
  });
});

describe("prettyMoneda", () => {
  test("codigo ISO del banco -> sigla", () => {
    expect(prettyMoneda("032")).toBe("ARS");
    expect(prettyMoneda("840")).toBe("USD");
    expect(prettyMoneda("978")).toBe("EUR");
  });

  test("codigo sin ceros a la izquierda tambien", () => {
    expect(prettyMoneda("32")).toBe("ARS");
  });

  test("desconocido o vacio -> lo que vino / vacio", () => {
    expect(prettyMoneda("999")).toBe("999");
    expect(prettyMoneda("")).toBe("");
    expect(prettyMoneda(null)).toBe("");
  });
});

describe("prettyTipoPersona", () => {
  test("fisica vs juridica", () => {
    expect(prettyTipoPersona(true)).toBe("Persona física");
    expect(prettyTipoPersona(false)).toBe("Persona jurídica");
  });

  test("sin dato -> vacio (no asume)", () => {
    expect(prettyTipoPersona(undefined)).toBe("");
    expect(prettyTipoPersona(null)).toBe("");
  });
});
