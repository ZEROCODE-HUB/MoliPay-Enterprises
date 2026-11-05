import { type TaxAplicado } from "@/features/transfers/transfer-store";

// ============================================================================
// Overlay mientras se procesa
// ============================================================================

export type StepTransfer = "reserva" | "envio" | "confirmacion";

// ============================================================================
// Comprobante de transferencia enviada
// ============================================================================

export type ReceiptAccount = {
  nombre: string;
  cuit?: string;
  cvu?: string;
  banco?: string;
  alias?: string;
  /** Nombre de la subcuenta (solo origen). */
  subcuenta?: string;
};

export type ReceiptTransfer = {
  monto: number;
  fecha: string;
  txid: string;
  estado?: string;
  concepto?: string;
  comision?: number;
  impuesto?: number;
  /** Impuestos asignados cobrados (DyC, IIBB...). */
  impuestos?: TaxAplicado[];
  origen: ReceiptAccount;
  destino: ReceiptAccount;
};
