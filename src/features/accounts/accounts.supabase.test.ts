import { describe,expect,it } from "vitest";
import { toSubaccount,toSubaccountMovement } from "./accounts.supabase";

const row = {
  id: "s1",
  nombre: "Sucursal Sur",
  apellido: null,
  email: null,
  cbu: "0000003100000000000001",
  tipo: "Recaudacion",
  estado: "Activa",
  ingresos: null,
  egresos: null,
  responsable: null,
  limite: null,
  retiros_habilitados: true,
  subaccount_balances: { saldo_disponible: "1234.56", saldo_retenido: 0.1, saldo_conciliado: null },
};

describe("toSubaccount", () => {
  it("traduce tipos y estados y lleva los saldos a centavos exactos", () => {
    expect(toSubaccount(row)).toMatchObject({
      type: "collection",
      status: "active",
      cvu: "0000003100000000000001",
      available: { cents: 123456 },
      held: { cents: 10 },
      reconciled: { cents: 0 },
    });
  });

  it("acepta los saldos embebidos como lista", () => {
    const sub = toSubaccount({
      ...row,
      subaccount_balances: [{ saldo_disponible: 5, saldo_retenido: 0, saldo_conciliado: 0 }],
    });
    expect(sub.available.cents).toBe(500);
  });

  it("un tipo o estado desconocido es un error contract", () => {
    expect(() => toSubaccount({ ...row, tipo: "Inversion" })).toThrow(
      expect.objectContaining({ kind: "contract" }),
    );
    expect(() => toSubaccount({ ...row, estado: "Borrada" })).toThrow(
      expect.objectContaining({ kind: "contract" }),
    );
  });
});

describe("toSubaccountMovement", () => {
  it("clasifica egresos e ingresos y guarda el importe en positivo", () => {
    const base = { cvu: "x", id_txn: "t1", fecha: "2026-11-02T10:30:00Z" };
    expect(
      toSubaccountMovement({ ...base, tipo: "retiro", monto_operacion: "-250.5" }),
    ).toMatchObject({
      direction: "expense",
      amount: { cents: 25050 },
    });
    expect(toSubaccountMovement({ ...base, tipo: "deposito", monto_operacion: 100 })).toMatchObject(
      {
        direction: "income",
        amount: { cents: 10000 },
      },
    );
  });
});
