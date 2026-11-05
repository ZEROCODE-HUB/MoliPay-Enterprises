import { methodPaymentLabels } from "@/features/collections/collections.data";
import { ArrowLeft,Check } from "lucide-react";
import { Card } from "@/shared/ui/card";
import { BtnOutline,BtnPrimary } from "@/shared/ui/button";

import type { NewCollectionPageVm } from "./use-new-collection-page";

export function BatchSummaryStep({
  step,
  name,
  period,
  dayProcesamiento,
  rateInteres,
  dateVenc1,
  dateVenc2,
  dateVenc3,
  paymentsPartials,
  notifications,
  methodsPayment,
  csvData,
  setStep,
  handleSubmit,
  saving,
}: Pick<
  NewCollectionPageVm,
  | "step"
  | "name"
  | "period"
  | "dayProcesamiento"
  | "rateInteres"
  | "dateVenc1"
  | "dateVenc2"
  | "dateVenc3"
  | "paymentsPartials"
  | "notifications"
  | "methodsPayment"
  | "csvData"
  | "setStep"
  | "handleSubmit"
  | "saving"
>) {
  return (
    <>
      {step === 2 && (
        <div className="space-y-6">
          <Card>
            <h3 className="font-semibold mb-4">Resumen del lote</h3>
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Nombre:</span>
                <div className="font-semibold">{name}</div>
              </div>
              <div>
                <span className="text-muted-foreground">Periodo:</span>
                <div className="font-semibold">{period}</div>
              </div>
              <div>
                <span className="text-muted-foreground">Dia de pago:</span>
                <div className="font-semibold">Cada mes, dia {dayProcesamiento}</div>
              </div>
              <div>
                <span className="text-muted-foreground">Tasa de interes:</span>
                <div className="font-semibold">{rateInteres}% (desde 2º vencimiento)</div>
              </div>
              <div>
                <span className="text-muted-foreground">1er vencimiento:</span>
                <div className="font-semibold">{dateVenc1}</div>
              </div>
              <div>
                <span className="text-muted-foreground">2do vencimiento:</span>
                <div className="font-semibold">{dateVenc2 || "No configurado"}</div>
              </div>
              <div>
                <span className="text-muted-foreground">3er vencimiento:</span>
                <div className="font-semibold">{dateVenc3 || "No configurado"}</div>
              </div>
              <div>
                <span className="text-muted-foreground">Pagos parciales:</span>
                <div className="font-semibold">
                  {paymentsPartials ? "Habilitados" : "Deshabilitados"}
                </div>
              </div>
              <div>
                <span className="text-muted-foreground">Notificaciones:</span>
                <div className="font-semibold">
                  {notifications ? "Habilitadas" : "Deshabilitadas"}
                </div>
              </div>
              <div>
                <span className="text-muted-foreground">Medios de pago:</span>
                <div className="font-semibold">
                  {methodsPayment.map((m) => methodPaymentLabels[m]).join(", ")}
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <h3 className="font-semibold mb-4">Registros cargados</h3>
            <div className="text-sm">
              <span className="font-display tabular-nums font-semibold text-lg">
                {csvData.length}
              </span>{" "}
              <span className="text-muted-foreground">registros</span>
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Monto total estimado:{" "}
              <strong className="font-mono tabular-nums text-foreground">
                ${csvData.reduce((s, r) => s + r.monto, 0).toLocaleString("es-AR")}
              </strong>
            </div>
          </Card>

          <div className="flex justify-between gap-2">
            <BtnOutline onClick={() => setStep(1)}>
              <ArrowLeft size={14} /> Anterior
            </BtnOutline>
            <BtnPrimary onClick={handleSubmit} disabled={saving}>
              <Check size={14} /> {saving ? "Guardando..." : "Crear lote"}
            </BtnPrimary>
          </div>
        </div>
      )}
    </>
  );
}
