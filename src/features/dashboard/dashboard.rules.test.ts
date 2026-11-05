import { describe,expect,it } from "vitest";
import { moneyFromDecimal } from "@/shared/lib/money";
import { dailySeries,eachDay,summarize } from "./dashboard.rules";
import type { DashboardTransaction } from "./dashboard.types";

const tx = (kind: string, amount: string, occurredAt: string): DashboardTransaction => ({
  kind,
  amount: moneyFromDecimal(amount),
  occurredAt,
});

describe("summarize", () => {
  it("suma en centavos y cuenta operaciones reales por tipo", () => {
    const s = summarize([
      tx("deposito", "0.10", "2026-11-01T10:00:00Z"),
      tx("deposito", "0.20", "2026-11-01T11:00:00Z"),
      tx("tarjeta", "1500.50", "2026-11-02T10:00:00Z"),
      tx("retiro", "100", "2026-11-02T12:00:00Z"),
    ]);
    expect(s.deposits.cents).toBe(30);
    expect(s.depositCount).toBe(2);
    expect(s.cardCollections.cents).toBe(150050);
    expect(s.cardCollectionCount).toBe(1);
    expect(s.withdrawalCount).toBe(1);
    expect(s.qrPaymentCount).toBe(0);
  });
});

describe("dailySeries", () => {
  it("un punto por dia del rango, con los tipos del grafico", () => {
    const range = { start: new Date(2026, 10, 1), end: new Date(2026, 10, 3, 23, 59) };
    const points = dailySeries(
      [
        tx("deposito", "10.50", "2026-11-01T12:00:00Z"),
        tx("cobro_pct", "5", "2026-11-01T13:00:00Z"),
        tx("retiro", "99", "2026-11-01T14:00:00Z"),
      ],
      range,
    );
    expect(points).toHaveLength(3);
    expect(points[0]).toMatchObject({ depositos: 10.5, cobrosQR: 5, linkPago: 0, total: 15.5 });
  });

  it("eachDay corta en 366 dias", () => {
    expect(eachDay(new Date(2020, 0, 1), new Date(2026, 0, 1))).toHaveLength(366);
  });
});
