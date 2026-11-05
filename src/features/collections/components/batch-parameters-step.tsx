import { methodPaymentLabels } from "@/features/collections/collections.data";
import { ArrowRight } from "lucide-react";
import { Card } from "@/shared/ui/card";
import { Input,Label } from "@/shared/ui/form-controls";
import { BtnOutline,BtnPrimary } from "@/shared/ui/button";
import { METHODS_AVAILABLES } from "@/features/collections/new-collection.rules";

import type { NewCollectionPageVm } from "./use-new-collection-page";

export function BatchParametersStep({
  step,
  name,
  setName,
  period,
  setPeriod,
  dayProcesamiento,
  setDayProcesamiento,
  rateInteres,
  setRateInteres,
  dateVenc1,
  setDateVenc1,
  dateVenc2,
  setDateVenc2,
  dateVenc3,
  setDateVenc3,
  toggleMethod,
  methodsPayment,
  paymentsPartials,
  setPaymentsPartials,
  notifications,
  setNotifications,
  navigate,
  validatePaso1,
  setStep,
}: Pick<
  NewCollectionPageVm,
  | "step"
  | "name"
  | "setName"
  | "period"
  | "setPeriod"
  | "dayProcesamiento"
  | "setDayProcesamiento"
  | "rateInteres"
  | "setRateInteres"
  | "dateVenc1"
  | "setDateVenc1"
  | "dateVenc2"
  | "setDateVenc2"
  | "dateVenc3"
  | "setDateVenc3"
  | "toggleMethod"
  | "methodsPayment"
  | "paymentsPartials"
  | "setPaymentsPartials"
  | "notifications"
  | "setNotifications"
  | "navigate"
  | "validatePaso1"
  | "setStep"
>) {
  return (
    <>
      {step === 0 && (
        <div className="space-y-6">
          <Card>
            <h3 className="font-semibold mb-4">Parametros generales</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label>Nombre del lote</Label>
                <Input
                  placeholder="Ej. Expensas Abril 2026"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div>
                <Label>Periodo</Label>
                <Input type="month" value={period} onChange={(e) => setPeriod(e.target.value)} />
              </div>
              <div>
                <Label>Dia de pago</Label>
                <Input
                  type="number"
                  min={1}
                  max={31}
                  value={dayProcesamiento}
                  onChange={(e) => setDayProcesamiento(Number(e.target.value))}
                />
                <p className="text-[11px] text-muted-foreground mt-1">
                  Dia del mes en que se procesaran los cobros (1-31).
                </p>
              </div>
              <div>
                <Label>Tasa de interes (%)</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={rateInteres}
                  onChange={(e) => setRateInteres(Number(e.target.value))}
                />
                <p className="text-[11px] text-muted-foreground mt-1">
                  Aplica desde el 2º vencimiento en adelante.
                </p>
              </div>
            </div>
          </Card>

          <Card>
            <h3 className="font-semibold mb-4">Fechas de vencimiento</h3>
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <Label>1er vencimiento *</Label>
                <Input
                  type="date"
                  value={dateVenc1}
                  onChange={(e) => setDateVenc1(e.target.value)}
                />
              </div>
              <div>
                <Label>2do vencimiento (opcional)</Label>
                <Input
                  type="date"
                  value={dateVenc2}
                  onChange={(e) => setDateVenc2(e.target.value)}
                />
              </div>
              <div>
                <Label>3er vencimiento (opcional)</Label>
                <Input
                  type="date"
                  value={dateVenc3}
                  onChange={(e) => setDateVenc3(e.target.value)}
                />
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground mt-2">
              Cada fecha debe ser estrictamente posterior a la anterior. El 1er vencimiento se cobra
              por el monto original, el 2do y 3ro aplican la tasa de interes.
            </p>
          </Card>

          <Card>
            <h3 className="font-semibold mb-4">Medios de pago y configuracion</h3>
            <div className="space-y-4">
              <div>
                <Label>Medios de pago habilitados</Label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {METHODS_AVAILABLES.map((m) => (
                    <button
                      key={m}
                      onClick={() => toggleMethod(m)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
                        methodsPayment.includes(m)
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-card text-muted-foreground border-input hover:border-foreground/30"
                      }`}
                    >
                      {methodPaymentLabels[m]}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap gap-6">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={paymentsPartials}
                    onChange={(e) => setPaymentsPartials(e.target.checked)}
                    className="rounded"
                  />
                  Permitir pagos parciales
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notifications}
                    onChange={(e) => setNotifications(e.target.checked)}
                    className="rounded"
                  />
                  Habilitar notificaciones
                </label>
              </div>
              {notifications && (
                <div className="text-xs text-muted-foreground pl-6">
                  Canal: Email (SMS y WhatsApp proximamente)
                </div>
              )}
            </div>
          </Card>

          <div className="flex justify-end gap-2">
            <BtnOutline onClick={() => navigate({ to: "/app/cobros/gestion" })}>
              Cancelar
            </BtnOutline>
            <BtnPrimary
              onClick={() => {
                if (validatePaso1()) setStep(1);
              }}
            >
              Siguiente <ArrowRight size={14} />
            </BtnPrimary>
          </div>
        </div>
      )}
    </>
  );
}
