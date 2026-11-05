import { type FrequentRecipient } from "@/features/transfers/transfer-store";
import { ArrowUpRight,Trash2,Users } from "lucide-react";
import { type Recipient } from "@/features/transfers/transfers.types";

/* ===== Destinatarios frecuentes ===== */
export function RecipientsList({
  items,
  onSelect,
  onDelete,
}: {
  items: FrequentRecipient[];
  onSelect: (d: Recipient) => void;
  onDelete: (id: string) => void | Promise<void>;
}) {
  if (items.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Users size={32} className="mx-auto mb-3 opacity-50" />
        <p className="font-semibold">No tenes destinatarios frecuentes</p>
        <p className="text-sm mt-1">Los destinatarios se guardan al confirmar una transferencia.</p>
      </div>
    );
  }

  return (
    <div className="divide-y">
      {items.map((f) => (
        <div key={f.id} className="flex items-center justify-between py-3">
          <div className="min-w-0">
            <div className="text-sm font-semibold">{f.nombre}</div>
            <div className="text-xs text-muted-foreground truncate">
              {f.alias ? `@${f.alias} · ` : ""}
              <span className="font-mono">{f.cbu}</span>
              {f.cuit ? ` · CUIT ${f.cuit}` : ""}
            </div>
            {f.banco && <div className="text-[11px] text-muted-foreground/60">{f.banco}</div>}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() =>
                onSelect({
                  nombre: f.nombre,
                  cuit: f.cuit,
                  cbu: f.cbu,
                  alias: f.alias,
                  banco: f.banco,
                })
              }
              className="h-8 w-8 inline-flex items-center justify-center rounded-md border bg-card hover:bg-accent text-muted-foreground"
              title="Usar este destinatario"
            >
              <ArrowUpRight size={13} />
            </button>
            <button
              onClick={() => void onDelete(f.id)}
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
