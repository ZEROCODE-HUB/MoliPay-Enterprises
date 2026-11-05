import { type TaxAplicado } from "@/features/transfers/transfer-store";

export type Tab = "unica" | "programar" | "borradores" | "programadas" | "destinatarios";

// Drafts and scheduled transfers are persisted in Supabase (`transfer-store`):
// their types live there and are re-exported here with the names this screen uses.
export type CoelsaResult = {
  nombre: string;
  cuit: string;
  cbu: string;
  alias: string;
  /** Detalle extra que devuelve el banco al validar; puede venir vacío. */
  banco?: string;
  bancoCodigo?: string;
  tipoCuenta?: string;
  moneda?: string;
  activa?: boolean;
  tipoPersona?: string;
  tipoDoc?: string;
};
export type Recipient = CoelsaResult & { banco: string };

export type TransferPayload = {
  subcuentaOrigen: string;
  destinatarioCbu: string;
  destinatarioCuit: string;
  destinatarioNombre: string;
  destinatarioAlias: string;
  /** Destinatario completo (detalle que devolvió el banco) para el comprobante. */
  destinatario?: CoelsaResult;
  monto: number;
  concepto: string;
};

export type TransferSuccess = {
  txid: string;
  estado?: string;
  mensaje?: string;
  /** Comprobante de la operación (se completa al enviar). */
  /** Lo que recibió el destinatario. Total debitado = monto + cargos. */
  monto?: number;
  concepto?: string;
  origenNombre?: string;
  origenCbu?: string;
  destino?: string;
  comision?: number;
  impuesto?: number;
  impuestos?: TaxAplicado[];
  fecha?: string;
};

export type Subaccount = {
  id: string;
  nombre: string;
  cbu: string | null;
  saldo_disponible: number;
  tipo: string;
};
