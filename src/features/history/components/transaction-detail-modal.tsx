import type { ReactNode } from "react";
import { ArrowDownLeft,ArrowUpRight,Download,Share2 } from "lucide-react";
import { Badge } from "@/shared/ui/badge";
import { BtnOutline,BtnPrimary } from "@/shared/ui/button";
import { Modal,ModalBody,ModalFooter,ModalHeader,useModalTitleId } from "@/shared/ui/modal";
import { formatMoneyAmount } from "@/shared/lib/money";
import {
STATUS_LABEL,
STATUS_TONE,
chargesFees,
debitedTotal,
operationLabel,
type ReceiptOwner,
} from "../history.rules";
import type { Party,TransactionDetail } from "../history.types";
import { downloadReceipt,shareReceipt } from "./receipt-actions";

const formatDateTime = (iso: string) => {
  const d = new Date(iso);
  if (!iso || Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

function Field({
  label,
  children,
  mono = false,
}: {
  label: string;
  children: ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="min-w-0">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={mono ? "truncate font-mono text-xs" : "truncate font-medium"}>{children}</div>
    </div>
  );
}

function PartyBlock({
  title,
  dot,
  party,
  showBank,
}: {
  title: string;
  dot: string;
  party: Party;
  showBank?: boolean;
}) {
  return (
    <div className="border-b pb-5">
      <div className="mb-3 flex items-center gap-2">
        <div className={`h-2 w-2 rounded-full ${dot}`} />
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {title}
        </span>
      </div>
      <div
        className={`grid grid-cols-1 gap-4 text-sm ${showBank ? "sm:grid-cols-4" : "sm:grid-cols-3"}`}
      >
        <Field label="Nombre">{party.name}</Field>
        <Field label="CUIT" mono>
          {party.cuit}
        </Field>
        <Field label="CBU / CVU" mono>
          {party.cbu}
        </Field>
        {showBank && <Field label="Banco">{party.bank || "—"}</Field>}
      </div>
    </div>
  );
}

export function TransactionDetailModal({
  detail,
  owner,
  onClose,
}: {
  detail: TransactionDetail | null;
  owner: ReceiptOwner;
  onClose: () => void;
}) {
  const titleId = useModalTitleId();
  if (!detail) return null;
  const income = detail.direction === "income";
  const category = operationLabel(detail.kind);
  const withFees = chargesFees(detail);

  return (
    <Modal open onClose={onClose} size="lg" labelledBy={titleId}>
      <ModalHeader title="Comprobante de transacción" titleId={titleId} onClose={onClose} />
      <ModalBody className="space-y-6">
        <div className="flex items-center gap-4 border-b pb-5">
          <div
            className={`flex h-14 w-14 items-center justify-center rounded-2xl ${
              income ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
            }`}
          >
            {income ? <ArrowDownLeft size={26} /> : <ArrowUpRight size={26} />}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xl font-bold">
              {income ? "Recibiste dinero" : "Enviaste dinero"}
            </div>
            <div className="mt-1 flex items-center gap-3 text-sm text-muted-foreground">
              <span>{category}</span>
              <span className="h-1 w-1 rounded-full bg-muted-foreground/40" />
              <span>{formatDateTime(detail.occurredAt)}</span>
            </div>
          </div>
        </div>

        <div className="flex items-end justify-between border-b pb-5">
          <div>
            <div className="mb-1 text-xs text-muted-foreground">Monto</div>
            <div
              className={`font-display text-2xl font-bold tabular-nums ${income ? "text-emerald-700" : ""}`}
            >
              {income ? "+ " : "- "}
              {formatMoneyAmount(income ? detail.amount : debitedTotal(detail))}
            </div>
          </div>
          <div className="text-right">
            <div className="mb-1 text-xs text-muted-foreground">Estado</div>
            <Badge tone={STATUS_TONE[detail.status]}>{STATUS_LABEL[detail.status]}</Badge>
          </div>
        </div>

        <div className="border-b pb-5">
          <div className="mb-1 text-xs text-muted-foreground">TXID</div>
          <div className="break-all font-mono text-sm font-medium">{detail.txid}</div>
        </div>

        <PartyBlock title="Desde" dot="bg-emerald-500" party={detail.from} />
        <PartyBlock title="Hacia" dot="bg-blue-500" party={detail.to} showBank />

        <div className="grid grid-cols-2 gap-4 pb-2 text-sm">
          <Field label="N° de operación">{detail.txid}</Field>
          <Field label="Referencia" mono>
            {detail.txid}
          </Field>
          {/* Canal, usuario y subcuenta: valores fijos heredados; la operacion no los guarda (ver PENDIENTES). */}
          <Field label="Canal de origen">Web</Field>
          <Field label="Usuario">Sistema</Field>
          <Field label="Subcuenta">—</Field>
          <Field label="Categoría">{category}</Field>
          {withFees && (
            <>
              <Field label="Comisión" mono>
                {formatMoneyAmount(detail.fee)}
              </Field>
              <Field label="IVA" mono>
                {formatMoneyAmount(detail.tax)}
              </Field>
              <Field label="Monto debitado" mono>
                {formatMoneyAmount(debitedTotal(detail))}
              </Field>
            </>
          )}
        </div>
      </ModalBody>
      <ModalFooter>
        <BtnPrimary className="flex-1" onClick={() => downloadReceipt(detail, owner)}>
          <Download size={15} /> Descargar comprobante
        </BtnPrimary>
        <BtnOutline className="flex-1" onClick={() => void shareReceipt(detail, owner)}>
          <Share2 size={15} /> Compartir comprobante
        </BtnOutline>
      </ModalFooter>
    </Modal>
  );
}
