import { type RecipientHolder } from "@/features/transfers/recipient-validation";
import { type DataReceipt } from "@/shared/lib/receipt/receipt";
import { type CoelsaResult,type TransferSuccess } from "./transfers.types";

/**
 * Datos del comprobante a partir del resultado del envío y del destinatario
 * validado. Devuelve null si todavía no hay una transferencia enviada.
 */
export function receiptDe(
  t: TransferSuccess | null,
  holder: RecipientHolder | null | undefined,
  customerName: string,
  customerCuit: string,
): DataReceipt | null {
  if (!t || t.monto == null) return null;
  return {
    fecha: t.fecha ?? new Date().toISOString(),
    monto: t.monto,
    concepto: t.concepto,
    comision: t.comision,
    impuesto: t.impuesto,
    estado: t.estado,
    txid: t.txid,
    desde: { nombre: customerName, cuit: customerCuit, cbu: t.origenCbu ?? "" },
    hacia: {
      nombre: holder?.nombre ?? "",
      cuit: holder?.cuit ?? "",
      cbu: holder?.cbu ?? t.destino ?? "",
      banco: holder?.banco,
      alias: holder?.alias,
      tipoCuenta: holder?.tipoCuenta,
    },
  };
}

/**
 /**
  * 2FA (email OTP) to confirm a single transfer.
 */
export const OTP_ENABLED: boolean = false;

/** Badge color per scheduled-transfer status (executed = green). */
export const STATUS_TONE: Record<string, "neutral" | "success" | "warn" | "danger"> = {
  Scheduled: "warn",
  Ejecutada: "success",
  Cancelada: "neutral",
  Error: "danger",
};

/* ===== QELSA mock (placeholder hasta integrar API real) ===== */
export const qelsaMock: CoelsaResult[] = [
  {
    nombre: "Proveedor SA",
    cuit: "30-12345678-9",
    cbu: "0000003100099887766112",
    alias: "proveedor.sa",
  },
  {
    nombre: "Estudio Rios",
    cuit: "30-87654321-0",
    cbu: "0000003200099887766223",
    alias: "rios.contable",
  },
  {
    nombre: "Servicios Generales",
    cuit: "30-11122333-4",
    cbu: "0000003300099887766334",
    alias: "serv.generales",
  },
  {
    nombre: "Juan Perez",
    cuit: "20-22333444-5",
    cbu: "0000003400099887766445",
    alias: "juanperez.mp",
  },
  {
    nombre: "Maria Lopez",
    cuit: "27-33444555-6",
    cbu: "0000003500099887766556",
    alias: "mlopez.cv",
  },
];
