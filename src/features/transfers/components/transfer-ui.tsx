import { useTransferUi } from "@/features/transfers/components/use-transfer-ui";
import { Modal } from "@/shared/ui/modal";
import { CheckCircle2,Download,Share2,Star,X } from "lucide-react";
import { formatMoney } from "@/shared/lib/format";
import { BtnOutline,BtnPrimary } from "@/shared/ui/button";
import { type ReceiptTransfer } from "@/features/transfers/transfer-ui.types";
import { Row,Section } from "./transfer-ui-parts";
import { detailTax } from "@/features/transfers/transfer-ui.rules";

export function TransferReceiptModal(props: {
  recibo: ReceiptTransfer;
  onClose: () => void;
  onDescargar: () => void;
  onCompartir: () => void;
  /** Si viene, se ofrece agendar al destinatario como frecuente. */
  onGuardarDestinatario?: () => Promise<void>;
}) {
  const vm = useTransferUi(props);
  const {
    receipt,
    onClose,
    onDownload,
    onShare,
    onSaveRecipient,
    guardado,
    setGuardado,
    dateTxt,
    total,
  } = vm;

  return (
    <Modal open onClose={onClose} size="custom" className="max-w-md">
      <div className="min-h-0 flex-1 overflow-y-auto">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 h-8 w-8 inline-flex items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"
          title="Cerrar"
        >
          <X size={16} />
        </button>

        {/* Encabezado: enviaste + monto + fecha */}
        <header className="px-6 pt-8 pb-6 text-center border-b bg-gradient-to-b from-emerald-50/80 to-transparent">
          <div className="mx-auto mb-3 h-12 w-12 rounded-full bg-emerald-100 flex items-center justify-center">
            <CheckCircle2 size={28} className="text-emerald-600" />
          </div>
          <div className="text-sm font-medium text-muted-foreground">Enviaste</div>
          <div className="mt-1 font-display tabular-nums text-4xl font-bold tracking-tight">
            {formatMoney(receipt.monto)}
          </div>
          <div className="mt-2 text-xs text-muted-foreground">{dateTxt}</div>
        </header>

        <div className="divide-y">
          <Section titulo="Cuenta origen">
            <Row label="Titular" value={receipt.origen.nombre} />
            <Row label="CUIT" value={receipt.origen.cuit} mono />
            <Row label="Subcuenta" value={receipt.origen.subcuenta} />
            <Row label="CVU" value={receipt.origen.cvu} mono copiable />
          </Section>

          <Section titulo="Cuenta destino">
            <Row label="Titular" value={receipt.destino.nombre} />
            <Row label="CUIT" value={receipt.destino.cuit} mono />
            <Row label="Banco" value={receipt.destino.banco} />
            <Row label="CBU / CVU" value={receipt.destino.cvu} mono copiable />
            {receipt.destino.alias && <Row label="Alias" value={`@${receipt.destino.alias}`} />}
          </Section>

          <Section titulo="Información de la operación">
            <Row label="N° de operación" value={receipt.txid} mono copiable />
            <Row label="Concepto" value={receipt.concepto} />
            <Row label="Estado" value={receipt.estado || "Enviada"} />
            <Row
              label="Comisión"
              value={receipt.comision != null ? formatMoney(receipt.comision) : undefined}
              mono
            />
            <Row
              label="IVA"
              value={receipt.impuesto != null ? formatMoney(receipt.impuesto) : undefined}
              mono
            />
            {(receipt.impuestos ?? []).map((t) => (
              <Row
                key={t.impuestoId}
                label={`${t.nombre} (${detailTax(t)})`}
                value={formatMoney(t.monto)}
                mono
              />
            ))}
            <div className="flex justify-between gap-4 pt-2 mt-1 border-t text-sm font-semibold">
              <span>Total debitado</span>
              <span className="font-mono tabular-nums">{formatMoney(total)}</span>
            </div>
          </Section>
        </div>

        {onSaveRecipient && (
          <div className="px-6 pb-1">
            <button
              type="button"
              disabled={guardado}
              onClick={async () => {
                await onSaveRecipient();
                setGuardado(true);
              }}
              className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg border border-dashed py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 disabled:opacity-60"
            >
              <Star size={13} />{" "}
              {guardado ? "Destinatario agendado" : "Agendar destinatario como frecuente"}
            </button>
          </div>
        )}

        <footer className="flex gap-2 p-6 pt-4">
          <BtnOutline type="button" className="flex-1" onClick={onShare}>
            <Share2 size={14} /> Compartir
          </BtnOutline>
          <BtnPrimary type="button" className="flex-1" onClick={onDownload}>
            <Download size={14} /> Descargar comprobante
          </BtnPrimary>
        </footer>
      </div>
    </Modal>
  );
}
