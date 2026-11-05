import type { Money } from "@/shared/lib/money";

export const LINE_KINDS = [
  "ingreso",
  "egreso",
  "comision",
  "impuesto",
  "interes",
  "reverso",
] as const;
/** Concepto de una linea del ledger (valores de la vista v_transaction_lines). */
export type LineKind = (typeof LINE_KINDS)[number];

export type TransactionStatus = "credited" | "pending" | "rejected";

/** Una linea de una operacion: cada operacion trae una por concepto, con el mismo TXID. */
export type TransactionLine = {
  lineId: string;
  transactionId: string;
  txid: string;
  legajo: string;
  /** transactions.tipo de la operacion que origino la linea. */
  operationKind: string;
  lineKind: LineKind;
  /** Con signo: el signo viene de la base. */
  amount: Money;
  occurredAt: string;
  lineNo: number;
  cvu: string | null;
  email: string | null;
  name: string | null;
  recipientName: string | null;
  cuit: string | null;
  status: TransactionStatus;
  /** "IVA", "Débitos y Créditos 0,6%", "Ingresos Brutos 2,5%"... */
  detail: string | null;
};

export type HistoryFilters = {
  page: number;
  pageSize: number;
  /** YYYY-MM-DD */
  from: string;
  to: string;
  /** Clave de OPERATION_FILTERS. */
  operation: string;
  lineKind: LineKind | "all";
  subaccountId: string | null;
  cbu: string;
  cuit: string;
  txid: string;
  recipientName: string;
};

export type TransactionLinePage = { rows: TransactionLine[]; total: number };

export type Party = { name: string; cuit: string; cbu: string; bank: string };

/** Operacion completa, para el detalle y el comprobante. */
export type TransactionDetail = {
  txid: string;
  /** transactions.tipo */
  kind: string;
  direction: "income" | "expense";
  amount: Money;
  fee: Money;
  tax: Money;
  status: TransactionStatus;
  occurredAt: string;
  from: Party;
  to: Party;
  /** La contraparte sin importar el sentido (en un egreso, el destinatario). */
  counterparty: { name: string; cuit: string; bank: string };
  /** CBU/CVU que figura en la operacion (vacio si no hay). */
  counterpartyCbu: string;
  /** CBU/CVU de la cuenta propia que intervino (operaciones nuevas). */
  ownAccountCbu: string;
};
