import { toast } from "sonner";
import { formatMoney } from "@/shared/lib/format";
import { moneyInputToNumber } from "@/shared/lib/money";
import { BtnOutline,BtnPrimary } from "@/shared/ui/button";
import { Input,Label,Select } from "@/shared/ui/form-controls";
import { Clock,ShieldCheck,Users } from "lucide-react";

import type { ProgramarVm } from "./use-schedule-transfer-form";

export function ScheduleTransferFields({
  destValid,
  handleValidate,
  destQuery,
  amount,
  setConfirm,
  subaccountOrigin,
  setSubaccountOrigin,
  subaccounts,
  setDestQuery,
  setDestValid,
  validating,
  setFrequentsOpen,
  setAmount,
  date,
  setDate,
  hour,
  setHour,
  concept,
  setConcept,
  editing,
  onCancelarEdicion,
}: Pick<
  ProgramarVm,
  | "destValid"
  | "handleValidate"
  | "destQuery"
  | "amount"
  | "setConfirm"
  | "subaccountOrigin"
  | "setSubaccountOrigin"
  | "subaccounts"
  | "setDestQuery"
  | "setDestValid"
  | "validating"
  | "setFrequentsOpen"
  | "setAmount"
  | "date"
  | "setDate"
  | "hour"
  | "setHour"
  | "concept"
  | "setConcept"
  | "editing"
  | "onCancelarEdicion"
>) {
  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        let valid = destValid;
        if (!valid) {
          valid = await handleValidate();
          if (!valid) return;
        }
        // re-validar si el query cambió después de validar
        if (valid.identifier !== destQuery.trim()) {
          valid = await handleValidate();
          if (!valid) return;
        }
        // asegurar monto válido antes de confirmar
        if (moneyInputToNumber(amount) <= 0) {
          toast.error("Ingresa un monto válido");
          return;
        }
        setConfirm(true);
      }}
    >
      <div className="grid sm:grid-cols-2 gap-3">
        <div className="sm:col-span-2">
          <Label>Origen de fondos</Label>
          <Select value={subaccountOrigin} onChange={(e) => setSubaccountOrigin(e.target.value)}>
            {subaccounts.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nombre} — {formatMoney(Number(s.saldo_disponible))}
              </option>
            ))}
          </Select>
        </div>
        <div className="sm:col-span-2">
          <Label>Destinatario (CBU/CVU/Alias)</Label>
          <div className="flex gap-2">
            <Input
              className="flex-1"
              placeholder="22 dígitos o alias (6-20)"
              value={destQuery}
              onChange={(e) => {
                setDestQuery(e.target.value);
                setDestValid(null);
              }}
            />
            <BtnOutline type="button" onClick={() => void handleValidate()} disabled={validating}>
              {validating ? "Validando..." : "Validar"}
            </BtnOutline>
          </div>
          {destValid ? (
            <div className="text-xs text-emerald-700 mt-1 flex items-center gap-1">
              <ShieldCheck size={11} /> Validado: {destValid.titular?.nombre} —{" "}
              {destValid.titular?.banco ?? destValid.kind}
            </div>
          ) : (
            <div className="text-xs text-muted-foreground mt-1">
              Se validara contra el banco antes de programar.
            </div>
          )}
          <BtnOutline type="button" onClick={() => setFrequentsOpen(true)} className="w-full mt-2">
            <Users size={14} /> Destinatarios frecuentes
          </BtnOutline>
        </div>
        <div>
          <Label>Monto</Label>
          <Input placeholder="$ 0,00" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </div>
        <div>
          <Label>Moneda</Label>
          <div className="h-10 px-3 rounded-md border bg-card flex items-center text-sm text-muted-foreground">
            ARS — Pesos Argentinos
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:col-span-2">
          <div>
            <Label>Fecha de envio (hora Argentina)</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div>
            <Label>Hora de envio (hora Argentina)</Label>
            <Input type="time" value={hour} onChange={(e) => setHour(e.target.value)} />
          </div>
        </div>
        <div>
          <Label>Concepto</Label>
          <Select value={concept} onChange={(e) => setConcept(e.target.value)}>
            <option>Pago a proveedor</option>
            <option>Sueldos</option>
            <option>Honorarios</option>
            <option>Servicios</option>
            <option>Devolucion</option>
          </Select>
        </div>
      </div>
      <p className="text-[11px] text-muted-foreground flex items-center gap-1">
        <Clock size={11} /> Se ejecuta sola a esa fecha y hora (hora Argentina). No hace falta que
        hagas nada.
      </p>
      <div className="flex gap-2 pt-1">
        {editing && (
          <BtnOutline
            type="button"
            className="flex-1"
            onClick={() => {
              onCancelarEdicion?.();
              setConfirm(false);
            }}
          >
            Cancelar
          </BtnOutline>
        )}
        <BtnPrimary type="submit" className="flex-1" disabled={validating}>
          {validating
            ? "Validando..."
            : destValid
              ? editing
                ? "Revisar y guardar"
                : "Programar"
              : "Validar y programar"}
        </BtnPrimary>
      </div>
    </form>
  );
}
