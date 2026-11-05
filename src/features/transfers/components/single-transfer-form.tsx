import { SingleTransferFields } from "./single-transfer-fields";
import { useSingleTransferForm } from "./use-single-transfer-form";
import {
type Draft,
type FrequentRecipient,
type Template,
} from "@/features/transfers/transfer-store";
import { toast } from "sonner";
import { detailTax,fmtCargo } from "@/features/transfers/transfer-ui.rules";
import { formatMoney } from "@/shared/lib/format";
import { ShieldCheck } from "lucide-react";
import { BtnOutline,BtnPrimary } from "@/shared/ui/button";
import { FormDialog } from "@/shared/ui/form-dialog";
import {
type CoelsaResult,
type Subaccount,
type TransferPayload,
} from "@/features/transfers/transfers.types";
import { OTP_ENABLED } from "@/features/transfers/transfers.rules";

export function SingleTransferForm(props: {
  confirm: boolean;
  setConfirm: (v: boolean) => void;
  onOtpRequired: (payload: TransferPayload) => void | Promise<void>;
  subcuentas: Subaccount[];
  onTransferPayload: (p: TransferPayload) => void;
  onSaveDraft: (d: Draft) => void | Promise<void>;
  frecuentes: FrequentRecipient[];
  prefilledDestinatario?: CoelsaResult;
  onClearPrefill?: () => void;
  template?: Template | null;
  onClearTemplate?: () => void;
}) {
  const vm = useSingleTransferForm(props);
  const {
    confirm,
    setConfirm,
    onOtpRequired,
    onTransferPayload,
    frequents,
    onClearPrefill,
    setSearchQuery,
    selectedRecipient,
    setSelectedRecipient,
    frequentsOpen,
    setFrequentsOpen,
    subaccountOrigin,
    concept,
    handleSearch,
    subaccountSeleccionada,
    amountNumber,
    cot,
  } = vm;

  if (confirm) {
    const amountNum = amountNumber;
    return (
      <div className="space-y-4">
        <div className="text-sm text-muted-foreground">Revisa los datos antes de confirmar.</div>
        <div className="border rounded-md divide-y">
          {[
            ["Origen", subaccountSeleccionada?.nombre ?? "—"],
            ["CBU Origen", subaccountSeleccionada?.cbu ?? "—"],
            ["Destinatario", selectedRecipient?.nombre ?? "-"],
            [selectedRecipient?.tipoDoc || "CUIT", selectedRecipient?.cuit || "—"],
            ["CBU/CVU Destino", selectedRecipient?.cbu ?? "-"],
            [
              "Banco",
              [
                selectedRecipient?.banco,
                selectedRecipient?.bancoCodigo ? `(${selectedRecipient.bancoCodigo})` : "",
              ]
                .filter(Boolean)
                .join(" ") || "—",
            ],
            ["Tipo de cuenta", selectedRecipient?.tipoCuenta || "—"],
            ["Monto a enviar (recibe el destinatario)", formatMoney(amountNum)],
            ["Comisión", cot.cotizacion ? fmtCargo(cot.cotizacion.comision) : "—"],
            ["IVA", cot.cotizacion ? fmtCargo(cot.cotizacion.impuesto) : "—"],
            ...(cot.cotizacion?.impuestos ?? []).map((t) => [
              `${t.nombre} (${detailTax(t)})`,
              fmtCargo(t.monto),
            ]),
            [
              "Total a debitar de tu saldo",
              cot.cotizacion ? formatMoney(cot.cotizacion.total) : formatMoney(amountNum),
            ],
            [
              "Saldo restante estimado",
              cot.cotizacion ? formatMoney(cot.cotizacion.disponible - cot.cotizacion.total) : "—",
            ],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between py-2.5 px-3 text-sm">
              <span className="text-muted-foreground">{k}</span>
              <span className="font-mono tabular-nums font-semibold">{v}</span>
            </div>
          ))}
        </div>
        {cot.insuficiente && (
          <div
            className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700"
            role="alert"
          >
            Saldo insuficiente: te faltan {formatMoney(cot.faltante)}. Volvé y ajustá el monto o el
            origen.
          </div>
        )}
        {OTP_ENABLED && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground p-3 bg-muted rounded">
            <ShieldCheck size={14} /> Se solicitara 2FA al confirmar.
          </div>
        )}
        <div className="flex gap-2">
          <BtnOutline onClick={() => setConfirm(false)} className="flex-1">
            Volver
          </BtnOutline>
          <BtnPrimary
            type="button"
            disabled={cot.insuficiente || cot.cargando}
            onClick={async () => {
              if (!subaccountOrigin) {
                toast.error("Selecciona una subcuenta de origen");
                return;
              }
              if (!selectedRecipient) {
                toast.error("Falta destinatario validado");
                return;
              }
              if (!amountNum || amountNum <= 0) {
                toast.error("Ingresa un monto válido mayor a 0");
                return;
              }
              if (cot.insuficiente) {
                toast.error("Saldo insuficiente en la subcuenta de origen");
                return;
              }
              const payload: TransferPayload = {
                subcuentaOrigen: subaccountOrigin,
                destinatarioCbu: selectedRecipient.cbu,
                destinatarioCuit: selectedRecipient.cuit,
                destinatarioNombre: selectedRecipient.nombre,
                destinatarioAlias: selectedRecipient.alias,
                destinatario: selectedRecipient,
                monto: amountNum,
                concepto: concept,
              };
              onTransferPayload(payload);
              await onOtpRequired(payload);
            }}
            className="flex-1"
          >
            Confirmar transferencia
          </BtnPrimary>
        </div>
      </div>
    );
  }

  return (
    <>
      <SingleTransferFields {...vm} />

      <FormDialog
        open={frequentsOpen}
        onClose={() => setFrequentsOpen(false)}
        title="Destinatarios frecuentes"
        description="Selecciona un destinatario de tu lista."
        submitLabel="Cerrar"
        onSubmit={() => setFrequentsOpen(false)}
        size="md"
      >
        {frequents.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            No tenes destinatarios frecuentes guardados.
          </div>
        ) : (
          <div className="divide-y border rounded-md max-h-64 overflow-y-auto">
            {frequents.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => {
                  onClearPrefill?.();
                  setSearchQuery(f.cbu);
                  setSelectedRecipient({
                    nombre: f.nombre,
                    cuit: f.cuit,
                    cbu: f.cbu,
                    alias: f.alias,
                  });
                  setFrequentsOpen(false);
                  // Se revalida contra el banco para completar la ficha (banco, tipo
                  // de cuenta, moneda, estado) sin tener que apretar "Validar".
                  void handleSearch(f.cbu);
                }}
                className="w-full flex items-center justify-between gap-3 p-3 text-left hover:bg-muted/50"
              >
                <div className="min-w-0">
                  <div className="text-sm font-semibold truncate">{f.nombre}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {f.alias ? `@${f.alias} · ` : ""}
                    <span className="font-mono">{f.cbu}</span>
                  </div>
                </div>
                {f.banco && (
                  <span className="text-[11px] text-muted-foreground shrink-0">{f.banco}</span>
                )}
              </button>
            ))}
          </div>
        )}
      </FormDialog>
    </>
  );
}
