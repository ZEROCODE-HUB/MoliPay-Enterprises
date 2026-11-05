import type { Money } from "@/shared/lib/money";

export const SUBACCOUNT_TYPES = ["operating", "collection", "guarantees", "payroll"] as const;
export const SUBACCOUNT_STATUSES = ["active", "paused"] as const;

export type SubaccountType = (typeof SUBACCOUNT_TYPES)[number];
export type SubaccountStatus = (typeof SUBACCOUNT_STATUSES)[number];

/** Subcuenta (CVU) de un cliente. Los saldos los mueve solo el backend. */
export type Subaccount = {
  id: string;
  name: string;
  lastName: string;
  email: string;
  cvu: string;
  type: SubaccountType;
  status: SubaccountStatus;
  available: Money;
  held: Money;
  reconciled: Money;
  incomeNote: string;
  expenseNote: string;
  owner: string;
  /** Texto libre: "50000", "50.000,00" o vacio. */
  limit: string;
  withdrawalsEnabled: boolean;
};

export type SubaccountInput = {
  name: string;
  lastName: string;
  email: string;
  type: SubaccountType;
  owner: string;
  limit: string;
};

export type MovementDirection = "income" | "expense";

export type SubaccountMovement = {
  direction: MovementDirection;
  /** Tipo de la transaccion en la base (deposito, transferencia, ...). */
  kind: string;
  transactionId: string;
  counterpartyCvu: string;
  occurredAt: string;
  amount: Money;
};

export type InternalTransferInput = {
  fromId: string;
  toId: string;
  amount: Money;
  concept: string | null;
};
