import { useState } from "react";
import { type ReceiptTransfer } from "@/features/transfers/transfer-ui.types";

/** Estado y acciones de TransferUi: el componente solo dibuja. */
export function useTransferUi({
  recibo: receipt,
  onClose,
  onDescargar: onDownload,
  onCompartir: onShare,
  onGuardarDestinatario: onSaveRecipient,
}: {
  recibo: ReceiptTransfer;
  onClose: () => void;
  onDescargar: () => void;
  onCompartir: () => void;
  /** Si viene, se ofrece agendar al destinatario como frecuente. */
  onGuardarDestinatario?: () => Promise<void>;
}) {
  const [guardado, setGuardado] = useState(false);
  const date = new Date(receipt.fecha);
  const dateTxt = Number.isNaN(date.getTime())
    ? receipt.fecha
    : date.toLocaleString("es-AR", {
        day: "2-digit",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
  const total =
    receipt.monto +
    (receipt.comision ?? 0) +
    (receipt.impuesto ?? 0) +
    (receipt.impuestos ?? []).reduce((acc, t) => acc + t.monto, 0);
  return {
    receipt,
    onClose,
    onDownload,
    onShare,
    onSaveRecipient,
    guardado,
    setGuardado,
    dateTxt,
    total,
  };
}

export type TransferUiVm = ReturnType<typeof useTransferUi>;
