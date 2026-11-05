import { type Scheduled } from "@/features/transfers/transfer-store";
import { Calendar,Clock,Edit3,Play,X } from "lucide-react";
import { Badge } from "@/shared/ui/badge";
import { STATUS_TONE } from "@/features/transfers/transfers.rules";

/* ===== Transferencias programadas ===== */
export function ScheduledTransfers({
  items,
  onCancel,
  onEdit,
  onExecute,
}: {
  items: Scheduled[];
  onCancel: (id: string) => void;
  onEdit: (id: string) => void;
  onExecute: (id: string) => void;
}) {
  if (items.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Calendar size={32} className="mx-auto mb-3 opacity-50" />
        <p className="font-semibold">No tenes transferencias programadas</p>
        <p className="text-sm mt-1">Usa la pestana "Programar" para agendar una transferencia.</p>
      </div>
    );
  }

  return (
    <div className="divide-y">
      {items.map((s) => (
        <div key={s.id} className="flex items-center justify-between py-3">
          <div className="min-w-0">
            <div className="text-sm font-semibold">{s.destinatario}</div>
            <div className="text-xs text-muted-foreground">
              @{s.alias} · <span className="font-mono">{s.monto}</span> · {s.concepto}
            </div>
            <div className="text-xs text-muted-foreground/70 flex items-center gap-1 mt-0.5">
              <Calendar size={11} /> {s.fecha} <Clock size={11} className="ml-1" /> {s.hora}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Badge tone={STATUS_TONE[s.estado] ?? "neutral"}>{s.estado}</Badge>
            {s.estado === "Programada" && (
              <>
                <button
                  onClick={() => onEdit(s.id)}
                  className="h-8 w-8 inline-flex items-center justify-center rounded-md border bg-card hover:bg-accent text-muted-foreground"
                  title="Editar"
                >
                  <Edit3 size={13} />
                </button>
                <button
                  onClick={() => onExecute(s.id)}
                  className="h-8 w-8 inline-flex items-center justify-center rounded-md border bg-card hover:bg-accent text-muted-foreground"
                  title="Ejecutar ahora"
                >
                  <Play size={13} />
                </button>
                <button
                  onClick={() => onCancel(s.id)}
                  className="h-8 w-8 inline-flex items-center justify-center rounded-md border bg-card hover:bg-red-50 text-muted-foreground hover:text-red-600"
                  title="Cancelar"
                >
                  <X size={13} />
                </button>
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
