import type { Money } from "@/shared/lib/money";

export type DateRange = { start: Date; end: Date };

/** Movimiento del cliente para el resumen (importe siempre positivo). */
export type DashboardTransaction = {
  /** Tipo de la transaccion en la base: deposito, retiro, tarjeta, cobro_pct, pago_pct, ... */
  kind: string;
  amount: Money;
  occurredAt: string;
};

export type DashboardSummary = {
  deposits: Money;
  depositCount: number;
  withdrawals: Money;
  withdrawalCount: number;
  cardCollections: Money;
  cardCollectionCount: number;
  qrCollections: Money;
  qrCollectionCount: number;
  qrPayments: Money;
  qrPaymentCount: number;
};

/** Punto diario del grafico (pesos, solo para dibujar). */
export type DailyPoint = {
  date: string;
  depositos: number;
  cobrosQR: number;
  linkPago: number;
  total: number;
};

export type PeriodKey = "today" | "15d" | "30d" | "60d" | "90d" | "day" | "range";
