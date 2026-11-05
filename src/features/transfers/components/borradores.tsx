import { type Draft } from "@/features/transfers/transfer-store";
import { Edit3,FileText,Play,Trash2 } from "lucide-react";

/* ===== Borradores ===== */
export function Borradores({
  drafts,
  onDelete,
  onEdit,
  onExecute,
}: {
  drafts: Draft[];
  onDelete: (id: string) => void;
  onEdit: (id: string) => void;
  onExecute: (id: string) => void;
}) {
  if (drafts.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <FileText size={32} className="mx-auto mb-3 opacity-50" />
        <p className="font-semibold">No tenes borradores</p>
        <p className="text-sm mt-1">Las transferencias que guardes como borrador apareceran aca.</p>
      </div>
    );
  }

  return (
    <div className="divide-y">
      {drafts.map((d) => (
        <div key={d.id} className="flex items-center justify-between py-3">
          <div className="min-w-0">
            <div className="text-sm font-semibold">{d.destinatario}</div>
            <div className="text-xs text-muted-foreground">
              @{d.alias} · <span className="font-mono">{d.monto}</span> · {d.concepto}
            </div>
            <div className="text-[11px] text-muted-foreground/60">Guardado el {d.fecha}</div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => onEdit(d.id)}
              className="h-8 w-8 inline-flex items-center justify-center rounded-md border bg-card hover:bg-accent text-muted-foreground"
              title="Editar"
            >
              <Edit3 size={13} />
            </button>
            <button
              onClick={() => onExecute(d.id)}
              className="h-8 w-8 inline-flex items-center justify-center rounded-md border bg-card hover:bg-accent text-muted-foreground"
              title="Ejecutar"
            >
              <Play size={13} />
            </button>
            <button
              onClick={() => onDelete(d.id)}
              className="h-8 w-8 inline-flex items-center justify-center rounded-md border bg-card hover:bg-red-50 text-muted-foreground hover:text-red-600"
              title="Eliminar"
            >
              <Trash2 size={13} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
