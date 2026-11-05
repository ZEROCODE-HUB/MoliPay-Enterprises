import { Modal } from "@/shared/ui/modal";
import { formatARS } from "@/features/collections/collections.data";
import { BtnOutline, BtnPrimary } from "@/shared/ui/button";
import { CalendarDays, Clock, X } from "lucide-react";
import { Input, Label } from "@/shared/ui/form-controls";
import { fmtDateFull } from "@/features/settlements/settlements.rules";

import type { SettlementsPageVm } from "./use-settlements-page";

export function AdvanceRequestModal({
  open,
  saving,
  setOpen,
  cap,
  advanceOperations,
  operationsLoading,
  operationId,
  setOperationId,
  reason,
  setReason,
  handleCreate,
}: Pick<
  SettlementsPageVm,
  | "open"
  | "saving"
  | "setOpen"
  | "cap"
  | "advanceOperations"
  | "operationsLoading"
  | "operationId"
  | "setOperationId"
  | "reason"
  | "setReason"
  | "handleCreate"
>) {
  if (!open) return null;
  const close = () => !saving && setOpen(false);
  const isEmpty = !operationsLoading && advanceOperations.length === 0;

  return (
    <Modal open onClose={close} size="custom" className="max-w-lg">
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <div className="font-semibold">Solicitar adelanto</div>
          <button onClick={close} className="p-1 hover:bg-muted rounded">
            <X size={16} />
          </button>
        </div>
        <div className="p-6 space-y-4">
          {isEmpty ? (
            <>
              <div className="text-center py-4">
                <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center mx-auto mb-3">
                  <CalendarDays size={24} className="text-amber-500" />
                </div>
                <p className="text-sm font-medium">No tenés operaciones para adelantar</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Cuando tengas ventas con tarjeta pendientes de acreditar, vas a poder adelantarlas
                  una por una.
                </p>
              </div>
              <BtnOutline className="w-full" onClick={() => setOpen(false)}>
                Cerrar
              </BtnOutline>
            </>
          ) : (
            <>
              <div className="bg-blue-50 border border-blue-200 rounded-md p-3 text-xs space-y-1">
                <div className="flex items-center gap-1.5 text-blue-700 font-medium mb-1">
                  <Clock size={14} /> Cómo sigue
                </div>
                <p className="text-muted-foreground">
                  Cada adelanto corresponde a una sola operación. MoliPay evalúa tu pedido y te
                  envía una oferta con la tasa y el neto a recibir. Se descuenta del lote donde se
                  acredite esa operación.
                </p>
                {cap && !cap.cumpleAntiguedad && (
                  <p className="text-red-700 font-semibold pt-1">
                    El adelanto se habilita a partir de los {cap.antiguedadMinima} días de operación
                    (llevás {cap.antiguedadDias ?? 0}).
                  </p>
                )}
                {cap && cap.deuda > 0 && (
                  <p className="text-amber-800 pt-1">
                    Tenés una deuda pendiente de {formatARS(cap.deuda)} por contracargos: se
                    descuenta de tus próximas acreditaciones.
                  </p>
                )}
              </div>

              <div>
                <Label>Operación a adelantar</Label>
                {operationsLoading ? (
                  <p className="text-sm text-muted-foreground py-3">Cargando operaciones…</p>
                ) : (
                  <div className="max-h-64 overflow-y-auto border rounded-md divide-y">
                    {advanceOperations.map((op) => (
                      <label
                        key={op.transactionId}
                        className="flex items-center gap-3 px-3 py-2 text-xs cursor-pointer hover:bg-muted/50"
                      >
                        <input
                          type="radio"
                          name="advance-operation"
                          checked={operationId === op.transactionId}
                          onChange={() => setOperationId(op.transactionId)}
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block font-medium truncate">
                            {op.brand} · {op.reference}
                          </span>
                          <span className="block text-muted-foreground">
                            Se acredita el {fmtDateFull(op.batchDate)}
                          </span>
                        </span>
                        <span className="text-right whitespace-nowrap">
                          <span className="block font-mono font-semibold">
                            {formatARS(op.estimatedNet)}
                          </span>
                          <span className="block text-muted-foreground">
                            Venta {formatARS(op.amount)}
                          </span>
                        </span>
                      </label>
                    ))}
                  </div>
                )}
                <div className="text-[11px] text-muted-foreground mt-1">
                  Podés adelantar hasta el neto estimado de la operación elegida.
                </div>
              </div>
              <div>
                <Label>Motivo (opcional)</Label>
                <Input
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Ej. adelanto de venta"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <BtnOutline className="flex-1" disabled={saving} onClick={() => setOpen(false)}>
                  Cancelar
                </BtnOutline>
                <BtnPrimary
                  className="flex-1"
                  disabled={saving || !operationId || (cap != null && !cap.cumpleAntiguedad)}
                  onClick={handleCreate}
                >
                  {saving ? "Enviando…" : "Solicitar adelanto"}
                </BtnPrimary>
              </div>
            </>
          )}
        </div>
      </div>
    </Modal>
  );
}
