import { type PeriodKey } from "./dashboard.types";
import { moneyFromCents,sumMoney } from "@/shared/lib/money";
import type {
DailyPoint,
DashboardSummary,
DashboardTransaction,
DateRange,
} from "./dashboard.types";

/*
 * Calculos del resumen. Solo para mostrar: saldos e importes definitivos los
 * calcula la base. Sumas en centavos (sin floats).
 */

const byKind = (transactions: DashboardTransaction[], kind: string) =>
  transactions.filter((t) => t.kind === kind);

const total = (transactions: DashboardTransaction[], kind: string) =>
  sumMoney(byKind(transactions, kind).map((t) => t.amount));

export function summarize(transactions: DashboardTransaction[]): DashboardSummary {
  return {
    deposits: total(transactions, "deposito"),
    depositCount: byKind(transactions, "deposito").length,
    withdrawals: total(transactions, "retiro"),
    withdrawalCount: byKind(transactions, "retiro").length,
    cardCollections: total(transactions, "tarjeta"),
    cardCollectionCount: byKind(transactions, "tarjeta").length,
    qrCollections: total(transactions, "cobro_pct"),
    qrCollectionCount: byKind(transactions, "cobro_pct").length,
    qrPayments: total(transactions, "pago_pct"),
    qrPaymentCount: byKind(transactions, "pago_pct").length,
  };
}

const dayKey = (d: Date) => d.toISOString().slice(0, 10);
const dayLabel = (d: Date) =>
  `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;

/** Dias del rango (como maximo 366). */
export function eachDay(start: Date, end: Date): Date[] {
  const out: Date[] = [];
  const cursor = new Date(start);
  cursor.setHours(0, 0, 0, 0);
  const last = new Date(end);
  last.setHours(0, 0, 0, 0);
  while (cursor <= last && out.length < 366) {
    out.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return out;
}

/** Serie diaria para el grafico: depositos, cobros QR y link de pago. */
export function dailySeries(transactions: DashboardTransaction[], range: DateRange): DailyPoint[] {
  const cents = new Map<string, { label: string; deposits: number; qr: number; card: number }>();
  for (const d of eachDay(range.start, range.end))
    cents.set(dayKey(d), { label: dayLabel(d), deposits: 0, qr: 0, card: 0 });
  for (const t of transactions) {
    const bucket = cents.get(t.occurredAt.slice(0, 10));
    if (!bucket) continue;
    if (t.kind === "deposito") bucket.deposits += t.amount.cents;
    else if (t.kind === "cobro_pct") bucket.qr += t.amount.cents;
    else if (t.kind === "tarjeta") bucket.card += t.amount.cents;
  }
  // A pesos solo al final, para dibujar.
  const pesos = (c: number) => moneyFromCents(c).cents / 100;
  return Array.from(cents.values()).map((b) => ({
    date: b.label,
    depositos: pesos(b.deposits),
    cobrosQR: pesos(b.qr),
    linkPago: pesos(b.card),
    total: pesos(b.deposits + b.qr + b.card),
  }));
}

export const QUICK: Array<{ k: PeriodKey; l: string; days: number }> = [
  { k: "today", l: "Hoy", days: 1 },
  { k: "15d", l: "15 días", days: 15 },
  { k: "30d", l: "30 días", days: 30 },
  { k: "60d", l: "60 días", days: 60 },
  { k: "90d", l: "90 días", days: 90 },
];
