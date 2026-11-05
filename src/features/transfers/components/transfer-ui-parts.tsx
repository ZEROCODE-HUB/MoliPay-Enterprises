import { type TaxAplicado } from "@/features/transfers/transfer-store";
import { toast } from "sonner";
import { Copy } from "lucide-react";
import { type ReactNode } from "react";
import { detailTax,fmtCargo } from "@/features/transfers/transfer-ui.rules";

/** Fila "Débitos y Créditos · 0,6% del monto" en el resumen de cargos. */
export function TaxRow({ t }: { t: TaxAplicado }) {
  return (
    <>
      <span className="text-muted-foreground">
        {t.nombre}
        <span className="ml-1 text-[11px]">
          · {detailTax(t)}
          {t.tipoCalculo === "Porcentaje" ? " del monto" : ""}
        </span>
      </span>
      <span className="text-right font-mono tabular-nums">{fmtCargo(t.monto)}</span>
    </>
  );
}

export function Row({
  label,
  value,
  mono,
  copiable,
}: {
  label: string;
  value?: string | null;
  mono?: boolean;
  copiable?: boolean;
}) {
  const v = value && value.trim() ? value : "—";
  return (
    <div className="flex items-start justify-between gap-4 py-1.5 text-sm">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className={`text-right break-all font-medium ${mono ? "font-mono text-[13px]" : ""}`}>
        {v}
        {copiable && v !== "—" && (
          <button
            type="button"
            onClick={() =>
              void navigator.clipboard.writeText(v).then(
                () => toast.success(`${label} copiado`),
                () => {},
              )
            }
            className="ml-1.5 inline-flex align-middle text-muted-foreground hover:text-foreground"
            title={`Copiar ${label}`}
          >
            <Copy size={12} />
          </button>
        )}
      </span>
    </div>
  );
}

export function Section({ titulo: title, children }: { titulo: string; children: ReactNode }) {
  return (
    <section className="px-6 py-4">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
        {title}
      </div>
      {children}
    </section>
  );
}
