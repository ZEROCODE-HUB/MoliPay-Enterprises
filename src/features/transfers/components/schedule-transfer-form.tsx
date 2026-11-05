import { ScheduleTransferFields } from "./schedule-transfer-fields";
import { ScheduleFrequentRecipients } from "./schedule-frequent-recipients";
import { useScheduleTransferForm } from "./use-schedule-transfer-form";
import {
createScheduledTransfer,
type FrequentRecipient,
type Scheduled,
type Template,
updateScheduledTransfer,
} from "@/features/transfers/transfer-store";
import { toast } from "sonner";
import { formatMoney } from "@/shared/lib/format";
import { moneyInputToNumber } from "@/shared/lib/money";
import { BtnOutline,BtnPrimary } from "@/shared/ui/button";
import { toDataError } from "@/infrastructure/supabase/errors";
import { type Subaccount } from "@/features/transfers/transfers.types";

/* ===== ScheduleTransferForm ===== */
export function ScheduleTransferForm(props: {
  subcuentas: Subaccount[];
  /** Frequent recipients to pick from the list (same as in the single transfer). */
  frecuentes?: FrequentRecipient[];
  onSuccess: (s: Scheduled) => void | Promise<void>;
  template?: Template | null;
  onClearTemplate?: () => void;
  /** When provided, this scheduled transfer is being EDITED instead of created. */
  programada?: Scheduled | null;
  /** Leaves edit mode (goes back to the scheduled list). */
  onCancelarEdicion?: () => void;
}) {
  const vm = useScheduleTransferForm(props);
  const {
    subaccounts,
    onSuccess,
    programada,
    editing,
    confirm,
    setConfirm,
    saving,
    setSaving,
    destValid,
    subaccountOrigin,
    amount,
    date,
    hour,
    concept,
  } = vm;

  if (confirm && destValid) {
    return (
      <div className="space-y-4">
        <div className="text-sm text-muted-foreground">
          Revisa los datos antes de {editing ? "guardar los cambios" : "programar"}. Se validará de
          nuevo al ejecutar.
        </div>
        <div className="border rounded-md divide-y">
          {[
            ["Origen", subaccounts.find((s) => s.id === subaccountOrigin)?.nombre ?? "—"],
            ["Destinatario", destValid.titular?.nombre ?? destValid.identifier],
            ["Identificador", destValid.identifier + ` (${destValid.kind})`],
            ["Monto", formatMoney(moneyInputToNumber(amount))],
            ["Fecha", date || "—"],
            ["Hora", hour],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between py-2.5 px-3 text-sm">
              <span className="text-muted-foreground">{k}</span>
              <span className="font-mono tabular-nums font-semibold">{v}</span>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <BtnOutline onClick={() => setConfirm(false)} className="flex-1">
            Volver
          </BtnOutline>
          <BtnPrimary
            disabled={saving}
            onClick={async () => {
              if (saving) return;
              setSaving(true);
              try {
                // Se persiste ANTES de mostrarla en la lista: si falla, no se
                // "guarda" nada y el usuario lo ve en el toast.
                const data = {
                  destinatario: {
                    nombre: destValid.titular?.nombre ?? destValid.identifier,
                    alias: destValid.titular?.alias,
                    cbu: destValid.titular?.cbu ?? destValid.identifier,
                    cuit: destValid.titular?.cuit,
                    banco: destValid.titular?.banco,
                  },
                  subcuentaOrigen: subaccountOrigin,
                  monto: moneyInputToNumber(amount),
                  concepto: concept,
                  fechaEnvio: date || new Date().toISOString().slice(0, 10),
                  horaEnvio: hour,
                };
                // Editing: overwrites the existing scheduled transfer. Otherwise creates a new one.
                const row = programada
                  ? await updateScheduledTransfer(programada.id, data)
                  : await createScheduledTransfer(data);
                await onSuccess(row);
              } catch (e) {
                toast.error(toDataError(e).message);
              } finally {
                setSaving(false);
              }
            }}
            className="flex-1"
          >
            {saving
              ? "Guardando..."
              : editing
                ? "Guardar cambios"
                : "ScheduleTransferForm transferencia"}
          </BtnPrimary>
        </div>
      </div>
    );
  }

  return (
    <>
      <ScheduleTransferFields {...vm} />

      <ScheduleFrequentRecipients {...vm} />
    </>
  );
}
