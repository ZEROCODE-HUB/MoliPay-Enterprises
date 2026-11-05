import { describe,expect,it } from "vitest";
import { moneyFromDecimal } from "@/shared/lib/money";
import {
debitedTotal,
formatSignedMoney,
lineTotals,
singleAccountCbu,
toReceipt,
toTransactionStatus,
} from "./history.rules";
import { toTransactionDetail,toTransactionLine } from "./history.supabase";
import type { TransactionLine } from "./history.types";

const line = (amount: string, status: TransactionLine["status"], txid: string): TransactionLine =>
  toTransactionLine({
    line_id: txid + amount,
    transaction_id: "t-" + txid,
    id_txn: txid,
    legajo: "L1",
    tipo_operacion: "transferencia",
    tipo_linea: amount.startsWith("-") ? "egreso" : "ingreso",
    monto: amount,
    fecha: "2026-11-01T10:00:00Z",
    line_no: 1,
    cvu: null,
    email: null,
    nombre: null,
    nombre_destino: null,
    cuit: null,
    estado_codigo: null,
    estado_nombre:
      status === "credited" ? "Acreditado" : status === "rejected" ? "Rechazado" : "Pendiente",
    detalle: null,
  });

describe("history.rules", () => {
  it("APROBADO cuenta como acreditado; sin estado es pendiente", () => {
    expect(toTransactionStatus("APROBADO")).toBe("credited");
    expect(toTransactionStatus("Rechazada")).toBe("rejected");
    expect(toTransactionStatus(null)).toBe("pending");
  });

  it("totales en centavos y pendientes por operacion (no por linea)", () => {
    const t = lineTotals([
      line("0.10", "credited", "A"),
      line("0.20", "credited", "A"),
      line("-0.05", "pending", "B"),
      line("-0.05", "pending", "B"),
      line("-1", "rejected", "C"),
    ]);
    expect(t.income.cents).toBe(30);
    expect(t.expense.cents).toBe(110);
    expect(t.net.cents).toBe(-80);
    expect(t.pendingCount).toBe(1);
    expect(t.rejectedCount).toBe(1);
  });

  it("formatSignedMoney pone el signo", () => {
    expect(formatSignedMoney(moneyFromDecimal("-10"))).toMatch(/^- /);
    expect(formatSignedMoney(moneyFromDecimal("10"))).toMatch(/^\+ /);
  });

  it("singleAccountCbu solo si hay uno", () => {
    expect(singleAccountCbu(["1", "1", null])).toBe("1");
    expect(singleAccountCbu(["1", "2"])).toBe("");
  });
});

describe("toTransactionDetail / toReceipt", () => {
  const row = {
    id_txn: "TX1",
    tipo: "transferencia",
    cvu: "000111",
    monto_operacion: "1000.10",
    comision: "5.05",
    impuesto: "1.06",
    fecha: "2026-11-01T10:00:00Z",
    legajo: "L1",
    destinatario_nombre: "Juan",
    destinatario_cuit: "20111",
    destinatario_banco: "Banco X",
    subcuentas: [{ cbu: "999" }],
    estados_movimiento: { codigo: "APROBADO", nombre: null },
  };

  it("una transferencia es egreso y debita comision + impuesto", () => {
    const d = toTransactionDetail(row);
    expect(d.direction).toBe("expense");
    expect(debitedTotal(d).cents).toBe(100621);
    expect(d.ownAccountCbu).toBe("999");
  });

  it("en un egreso el cliente es el origen; usa la cuenta de la operacion", () => {
    const r = toReceipt(toTransactionDetail(row), { name: "Acme", cuit: "30", cbu: "777" });
    expect(r.desde).toEqual({ nombre: "Acme", cuit: "30", cbu: "999" });
    expect(r.hacia).toMatchObject({ nombre: "Juan", cbu: "000111", banco: "Banco X" });
    expect(r.monto).toBe(1000.1);
    expect(r.estado).toBe("Acreditado");
  });

  it("un deposito es ingreso: el cliente es el destino", () => {
    const r = toReceipt(toTransactionDetail({ ...row, tipo: "deposito", subcuentas: null }), {
      name: "Acme",
      cuit: "30",
      cbu: "777",
    });
    expect(r.hacia.cbu).toBe("777");
  });
});
