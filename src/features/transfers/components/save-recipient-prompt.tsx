import { TransferReceiptModal } from "@/features/transfers/components/transfer-ui";
import {
createFrequentRecipient,
listFrequentRecipients,
} from "@/features/transfers/transfer-store";
import { toDataError } from "@/infrastructure/supabase/errors";
import { toast } from "sonner";
import { downloadReceiptPdf } from "@/shared/lib/receipt/receipt-pdf";
import { compartirComprobante } from "@/shared/lib/receipt/receipt-image";
import { receiptDe } from "@/features/transfers/transfers.rules";

import type { TransfersPageVm } from "./use-transfers-page";

export function SaveRecipientPrompt({
  saveDestOpen,
  transferSuccess,
  destValidation,
  setSaveDestOpen,
  setTransferSuccess,
  setDestValidation,
  customerName,
  customerCuit,
  destAlias,
  frequents,
  setFrequents,
}: Pick<
  TransfersPageVm,
  | "saveDestOpen"
  | "transferSuccess"
  | "destValidation"
  | "setSaveDestOpen"
  | "setTransferSuccess"
  | "setDestValidation"
  | "customerName"
  | "customerCuit"
  | "destAlias"
  | "frequents"
  | "setFrequents"
>) {
  return (
    <>
      {saveDestOpen &&
        transferSuccess &&
        transferSuccess.monto != null &&
        (() => {
          const holder = destValidation?.titular;
          const close = () => {
            setSaveDestOpen(false);
            setTransferSuccess(null);
            setDestValidation(null);
          };
          const receipt = receiptDe(transferSuccess, holder, customerName, customerCuit);
          return (
            <TransferReceiptModal
              recibo={{
                monto: transferSuccess.monto,
                fecha: transferSuccess.fecha ?? new Date().toISOString(),
                txid: transferSuccess.txid,
                estado: transferSuccess.estado || undefined,
                concepto: transferSuccess.concepto,
                comision: transferSuccess.comision,
                impuesto: transferSuccess.impuesto,
                impuestos: transferSuccess.impuestos,
                origen: {
                  nombre: customerName,
                  cuit: customerCuit,
                  subcuenta: transferSuccess.origenNombre,
                  cvu: transferSuccess.origenCbu,
                },
                destino: {
                  nombre: holder?.nombre ?? destAlias,
                  cuit: holder?.cuit,
                  banco:
                    [holder?.banco, holder?.bancoCodigo ? `(${holder.bancoCodigo})` : ""]
                      .filter(Boolean)
                      .join(" ") || undefined,
                  cvu: holder?.cbu ?? transferSuccess.destino,
                  alias: holder?.alias || undefined,
                },
              }}
              onClose={close}
              onDescargar={() => {
                if (receipt) downloadReceiptPdf(receipt);
              }}
              onCompartir={async () => {
                if (!receipt) return;
                const r = await compartirComprobante(receipt);
                if (r === "compartido") toast.success("Comprobante compartido");
                else if (r === "descargado")
                  toast.info(
                    "Tu navegador no comparte archivos: se descargó el comprobante para adjuntarlo.",
                  );
                else if (r === "error") toast.error("No se pudo compartir el comprobante");
              }}
              onGuardarDestinatario={
                holder && !frequents.some((f) => f.cbu === holder.cbu)
                  ? async () => {
                      try {
                        await createFrequentRecipient({
                          identifier: destValidation!.identifier,
                          nombre: holder.nombre,
                          alias: holder.alias,
                          cbu: holder.cbu,
                          cuit: holder.cuit,
                          banco: holder.banco,
                        });
                        setFrequents(await listFrequentRecipients());
                        toast.success("Destinatario agregado a frecuentes");
                      } catch (e) {
                        toast.error(toDataError(e).message);
                        throw e;
                      }
                    }
                  : undefined
              }
            />
          );
        })()}
    </>
  );
}
