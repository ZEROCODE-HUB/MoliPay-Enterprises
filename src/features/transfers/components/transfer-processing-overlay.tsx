import { Modal } from "@/shared/ui/modal";
import { Check,Loader2,ShieldCheck } from "lucide-react";
import { formatMoney } from "@/shared/lib/format";
import { type StepTransfer } from "@/features/transfers/transfer-ui.types";
import { STEPS } from "@/features/transfers/transfer-ui.rules";

export function TransferProcessingOverlay({
  paso: step,
  monto: amount,
}: {
  paso: StepTransfer;
  monto?: number;
}) {
  const current = STEPS.findIndex((p) => p.key === step);
  return (
    <Modal open onClose={() => undefined} size="custom" className="max-w-sm" dismissible={false}>
      <div className="min-h-0 flex-1 overflow-y-auto p-7 text-center">
        <div className="mx-auto mb-5 h-16 w-16 rounded-full bg-[color:var(--brand-soft)] flex items-center justify-center">
          <Loader2 size={30} className="animate-spin text-[color:var(--brand-primary)]" />
        </div>
        <div className="text-lg font-semibold">Procesando transferencia</div>
        {amount != null && (
          <div className="mt-1 font-display tabular-nums text-2xl font-bold">
            {formatMoney(amount)}
          </div>
        )}
        <ol className="mt-6 space-y-3 text-left">
          {STEPS.map((p, i) => {
            const hecho = i < current;
            const enCurso = i === current;
            return (
              <li key={p.key} className="flex items-center gap-3 text-sm">
                <span
                  className={`h-6 w-6 shrink-0 rounded-full flex items-center justify-center border ${
                    hecho
                      ? "bg-emerald-500 border-emerald-500 text-white"
                      : enCurso
                        ? "border-[color:var(--brand-primary)]"
                        : "border-muted-foreground/30"
                  }`}
                >
                  {hecho ? (
                    <Check size={14} />
                  ) : enCurso ? (
                    <Loader2 size={13} className="animate-spin text-[color:var(--brand-primary)]" />
                  ) : null}
                </span>
                <span
                  className={
                    hecho
                      ? "text-muted-foreground"
                      : enCurso
                        ? "font-semibold"
                        : "text-muted-foreground/70"
                  }
                >
                  {p.label}
                </span>
              </li>
            );
          })}
        </ol>
        <div className="mt-6 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
          <ShieldCheck size={13} /> No cierres ni recargues esta ventana.
        </div>
      </div>
    </Modal>
  );
}
