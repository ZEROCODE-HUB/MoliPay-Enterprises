import { describe, expect, test } from "bun:test";
import {
  formatearComprobanteTexto,
  formatearFechaComprobante,
  formatearMonto,
  nombreArchivoComprobante,
  type DatosComprobante,
} from "../comprobante";

/**
 * Comprobante de transferencia: es lo que queda como constancia de que se movio
 * dinero. Si el monto, el CUIT o el ID salen mal, el comprobante no sirve.
 */

describe("formatearMonto", () => {
  test("formato argentino con miles y decimales", () => {
    expect(formatearMonto(346.18)).toBe("$ 346,18");
    expect(formatearMonto(1234.5)).toBe("$ 1.234,50");
    expect(formatearMonto(1234567.891)).toBe("$ 1.234.567,89");
    expect(formatearMonto(0)).toBe("$ 0,00");
  });
});

describe("formatearFechaComprobante", () => {
  test("ISO -> yyyy-mm-dd hh:mm:ss en hora local", () => {
    // Se arma con componentes locales para que el test no dependa de la zona.
    const iso = new Date(2026, 9, 16, 10, 53, 14).toISOString();
    expect(formatearFechaComprobante(iso)).toBe("2026-10-16 10:53:14");
  });

  test("fecha invalida -> vacio (no inventa)", () => {
    expect(formatearFechaComprobante("no es fecha")).toBe("");
  });
});

const EJEMPLO: DatosComprobante = {
  fecha: new Date(2026, 9, 16, 10, 53, 14).toISOString(),
  monto: 346.18,
  concepto: "Pago a proveedor",
  comision: 10,
  impuesto: 1,
  estado: "Aprobado",
  txid: "1792158794652",
  desde: { nombre: "LENDITECH S.R.L", cuit: "30719143659", cbu: "0000367201000000050044" },
  hacia: {
    nombre: "Money Life",
    cuit: "30-71861284-1",
    cbu: "0000367201000000001042",
    banco: "BANCO DE COMERCIO S.A.",
    alias: "moneylife",
  },
};

describe("formatearComprobanteTexto", () => {
  test("arma el comprobante completo", () => {
    expect(formatearComprobanteTexto(EJEMPLO)).toBe(
      [
        "Enviaste dinero",
        "2026-10-16 10:53:14",
        "",
        "Monto de operación: $ 346,18",
        "",
        "Desde:",
        "Nombre: LENDITECH S.R.L",
        "CUIT: 30719143659",
        "CBU/CVU: 0000367201000000050044",
        "",
        "Hacia:",
        "Nombre: Money Life",
        "CUIT: 30718612841",
        "CBU/CVU: 0000367201000000001042",
        "Banco: BANCO DE COMERCIO S.A.",
        "",
        "Estado: Aprobado",
        "ID de transacción: 1792158794652",
        "",
        "Comprobante no válido como factura",
      ].join("\n"),
    );
  });

  test("el CUIT va sin guiones", () => {
    const texto = formatearComprobanteTexto(EJEMPLO);
    expect(texto).toContain("CUIT: 30718612841");
    expect(texto).not.toContain("30-71861284-1");
  });

  test("mantiene el formato simple aunque la operación tenga cargos", () => {
    const texto = formatearComprobanteTexto({ ...EJEMPLO, comision: 0, impuesto: 0 });
    expect(texto).not.toContain("Comisión:");
    expect(texto).not.toContain("IVA:");
    expect(texto).not.toContain("Total debitado");
  });

  test("sin datos opcionales no rompe", () => {
    const texto = formatearComprobanteTexto({
      fecha: new Date(2026, 9, 16, 10, 0, 0).toISOString(),
      monto: 100,
      txid: "TX1",
      desde: { nombre: "", cuit: "", cbu: "" },
      hacia: { nombre: "", cuit: "", cbu: "" },
    });
    expect(texto).toContain("Nombre: —");
    expect(texto).toContain("Estado: —");
    expect(texto).toContain("ID de transacción: TX1");
    expect(texto).toContain("Comprobante no válido como factura");
  });
});

describe("nombreArchivoComprobante", () => {
  test("incluye el TXID y la extension", () => {
    expect(nombreArchivoComprobante(EJEMPLO, "pdf")).toBe("comprobante-1792158794652.pdf");
    expect(nombreArchivoComprobante(EJEMPLO, "txt")).toBe("comprobante-1792158794652.txt");
  });

  test("limpia caracteres raros del TXID", () => {
    expect(nombreArchivoComprobante({ ...EJEMPLO, txid: "MOLI/123 456" }, "pdf")).toBe(
      "comprobante-MOLI123456.pdf",
    );
  });
});
