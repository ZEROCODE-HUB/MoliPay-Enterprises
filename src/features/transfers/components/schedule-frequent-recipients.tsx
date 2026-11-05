import { detectIdentifierKind } from "@/features/transfers/recipient-validation";
import { FormDialog } from "@/shared/ui/form-dialog";

import type { ProgramarVm } from "./use-schedule-transfer-form";

export function ScheduleFrequentRecipients({
  frequentsOpen,
  setFrequentsOpen,
  frequents,
  setDestQuery,
  setDestValid,
  handleValidate,
}: Pick<
  ProgramarVm,
  | "frequentsOpen"
  | "setFrequentsOpen"
  | "frequents"
  | "setDestQuery"
  | "setDestValid"
  | "handleValidate"
>) {
  return (
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
                const cbu = f.cbu;
                setDestQuery(cbu);
                // Se muestra ya lo guardado y se revalida contra el banco para
                // traer el detalle completo (banco, tipo de cuenta, estado).
                setDestValid({
                  status: "valid",
                  ok: true,
                  kind: detectIdentifierKind(cbu),
                  identifier: cbu,
                  provider: "bdc",
                  titular: {
                    nombre: f.nombre,
                    cuit: f.cuit,
                    cbu,
                    alias: f.alias,
                    banco: f.banco,
                  },
                  validatedAt: new Date().toISOString(),
                });
                setFrequentsOpen(false);
                void handleValidate(cbu);
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
  );
}
