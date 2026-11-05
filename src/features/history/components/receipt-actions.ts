import { toast } from "sonner";
import { downloadReceiptPdf } from "@/shared/lib/receipt/receipt-pdf";
import { compartirComprobante } from "@/shared/lib/receipt/receipt-image";
import { toReceipt,type ReceiptOwner } from "../history.rules";
import type { TransactionDetail } from "../history.types";

export function downloadReceipt(detail: TransactionDetail, owner: ReceiptOwner) {
  downloadReceiptPdf(toReceipt(detail, owner));
  toast.success("Comprobante descargado");
}

export async function shareReceipt(detail: TransactionDetail, owner: ReceiptOwner) {
  const result = await compartirComprobante(toReceipt(detail, owner));
  if (result === "compartido") toast.success("Comprobante compartido");
  else if (result === "descargado")
    toast.info("Tu navegador no comparte archivos: se descargó el comprobante para adjuntarlo.");
  else if (result === "error") toast.error("No se pudo compartir el comprobante");
}
