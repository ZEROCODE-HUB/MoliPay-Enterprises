import { describe, expect, test } from "bun:test";
import {
  STATUS_LABELS,
  formatAmount,
  formatDate,
  mapDraft,
  mapFrequentRecipient,
  mapScheduled,
  mapTemplate,
} from "../transfer-store";

/**
 * Traduccion de filas de la base -> filas de la UI. Si esto se rompe, la lista
 * muestra otro monto/fecha/estado (o nada), aunque la base este bien.
 */
describe("formatAmount", () => {
  test("formatea en es-AR con 2 decimales", () => {
    expect(formatAmount(1234.5)).toBe("$ 1.234,50");
    expect(formatAmount(1000000)).toBe("$ 1.000.000,00");
    expect(formatAmount(1)).toBe("$ 1,00");
  });

  test("0 o valores invalidos -> $ 0,00 (nunca 'NaN')", () => {
    expect(formatAmount(0)).toBe("$ 0,00");
    expect(formatAmount(Number.NaN)).toBe("$ 0,00");
    expect(formatAmount(undefined as unknown as number)).toBe("$ 0,00");
  });
});

describe("formatDate", () => {
  test("fecha ISO corta -> dd/mm/aaaa", () => {
    expect(formatDate("2026-10-14")).toBe("14/10/2026");
  });

  test("fecha con hora -> dd/mm/aaaa", () => {
    expect(formatDate("2026-10-14T09:55:00Z")).toBe("14/10/2026");
  });

  test("sin fecha -> cadena vacia", () => {
    expect(formatDate(null)).toBe("");
    expect(formatDate(undefined)).toBe("");
    expect(formatDate("")).toBe("");
  });
});

describe("STATUS_LABELS", () => {
  test("traduce los estados de la base", () => {
    expect(STATUS_LABELS["programada"]).toBe("Programada");
    expect(STATUS_LABELS["ejecutada"]).toBe("Ejecutada");
    expect(STATUS_LABELS["cancelada"]).toBe("Cancelada");
    expect(STATUS_LABELS["error"]).toBe("Error");
  });
});

describe("mapDraft (borradores)", () => {
  const fila = {
    id: "b1",
    destinatario_identifier: "4320001010003138730019",
    destinatario_nombre: "JOHN DOE",
    destinatario_alias: "ALIAS_PRUEBA",
    destinatario_cbu: "4320001010003138730019",
    destinatario_cuit: "200000000001",
    destinatario_banco: "BANCO DE COMERCIO S.A.",
    monto: 112,
    concepto: "Pago a proveedor",
    created_at: "2026-10-14T09:55:00Z",
    subcuenta_origen: "sub-1",
  };

  test("mapea nombre, alias, cbu, monto y concepto", () => {
    const d = mapDraft(fila);
    expect(d.destinatario).toBe("JOHN DOE");
    expect(d.alias).toBe("ALIAS_PRUEBA");
    expect(d.cbu).toBe("4320001010003138730019");
    expect(d.montoNum).toBe(112);
    expect(d.monto).toBe("$ 112,00");
    expect(d.concepto).toBe("Pago a proveedor");
    expect(d.subcuentaOrigen).toBe("sub-1");
  });

  test("si falta el nombre usa el identificador (nunca queda vacio)", () => {
    const d = mapDraft({ ...fila, destinatario_nombre: null, destinatario_alias: null, destinatario_cbu: null });
    expect(d.destinatario).toBe("4320001010003138730019");
    expect(d.cbu).toBe("4320001010003138730019");
  });
});

describe("mapScheduled (programadas)", () => {
  const fila = {
    id: "s1",
    destinatario_identifier: "4320001010003138730019",
    destinatario_nombre: "JOHN DOE",
    destinatario_alias: "ALIAS_PRUEBA",
    destinatario_cbu: "4320001010003138730019",
    monto: 1000,
    concepto: "Sueldos",
    fecha_envio: "2026-10-22",
    hora_envio: "09:55:00",
    estado: "programada",
  };

  test("muestra fecha legible, fecha cruda, hora y estado traducido", () => {
    const s = mapScheduled(fila);
    expect(s.fecha).toBe("22/10/2026"); // legible
    expect(s.fechaISO).toBe("2026-10-22"); // cruda, para el <input type="date">
    expect(s.hora).toBe("09:55"); // sin segundos
    expect(s.estado).toBe("Programada");
    expect(s.montoNum).toBe(1000);
  });

  test("estado ejecutada -> Ejecutada", () => {
    expect(mapScheduled({ ...fila, estado: "ejecutada" }).estado).toBe("Ejecutada");
  });
});

describe("mapTemplate (plantillas)", () => {
  test("generica (sin destinatario): destinatario queda undefined", () => {
    const p = mapTemplate({
      id: "p1",
      nombre: "Sueldos mensuales",
      tipo: "unica",
      monto: 482000,
      concepto: "Sueldos",
      destinatario_identifier: "",
      destinatario_cbu: null,
    });
    expect(p.nombre).toBe("Sueldos mensuales");
    expect(p.monto).toBe(482000);
    expect(p.concepto).toBe("Sueldos");
    expect(p.destinatario).toBeUndefined();
  });

  test("con destinatario: lo devuelve completo", () => {
    const p = mapTemplate({
      id: "p2",
      nombre: "Pago proveedor",
      tipo: "unica",
      monto: null,
      destinatario_identifier: "4320001010003138730019",
      destinatario_nombre: "JOHN DOE",
      destinatario_cbu: "4320001010003138730019",
      destinatario_cuit: "200000000001",
      destinatario_alias: "ALIAS_PRUEBA",
    });
    expect(p.destinatario?.nombre).toBe("JOHN DOE");
    expect(p.destinatario?.cbu).toBe("4320001010003138730019");
    expect(p.monto).toBeUndefined(); // sin monto cargado
  });

  test("tipo invalido en la base -> cae a 'unica'", () => {
    const p = mapTemplate({ id: "p3", nombre: "x", tipo: "cualquiera", destinatario_identifier: "" });
    expect(p.tipo).toBe("unica");
  });
});

describe("mapFrequentRecipient (destinatarios frecuentes)", () => {
  test("mapea nombre, alias, cbu y banco", () => {
    const f = mapFrequentRecipient({
      id: "f1",
      identifier: "4320001010003138730019",
      nombre: "JOHN DOE",
      cbu: "4320001010003138730019",
      alias: "ALIAS_PRUEBA",
      cuit: "200000000001",
      banco: "BANCO DE COMERCIO S.A.",
    });
    expect(f.nombre).toBe("JOHN DOE");
    expect(f.cbu).toBe("4320001010003138730019");
    expect(f.alias).toBe("ALIAS_PRUEBA");
    expect(f.banco).toBe("BANCO DE COMERCIO S.A.");
  });

  test("sin nombre usa el identificador", () => {
    const f = mapFrequentRecipient({ id: "f2", identifier: "4320001010003138730019", nombre: null, cbu: null });
    expect(f.nombre).toBe("4320001010003138730019");
    expect(f.cbu).toBe("4320001010003138730019");
  });
});
