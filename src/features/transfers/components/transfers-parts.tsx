import { detectIdentifierKind } from "@/features/transfers/recipient-validation";
import { ShieldCheck } from "lucide-react";
import { type CoelsaResult } from "@/features/transfers/transfers.types";

/**
 * Ficha del destinatario validado contra el banco: muestra todo lo que devuelve
 * `/accounts/info` (titular, CUIT/CUIL, banco, tipo de cuenta, moneda, estado).
 * Los destinatarios guardados (agenda/plantillas) no traen el detalle extra, así
 * que solo se muestran los datos disponibles.
 */
export function RowRecipient({
  label,
  value,
  strong,
  mono,
}: {
  label: string;
  value: string;
  strong?: boolean;
  mono?: boolean;
}) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-muted-foreground">{label}</span>
      <span
        className={`truncate ${strong ? "font-semibold" : "font-medium"} ${mono ? "font-mono" : ""}`}
      >
        {value}
      </span>
    </div>
  );
}

export function RecipientValidatedCard({ d }: { d: CoelsaResult }) {
  const kind = detectIdentifierKind(d.cbu);
  const tipo = kind === "ALIAS" ? "Alias" : d.cbu.startsWith("000") ? "CVU" : "CBU";
  const bank = [d.banco, d.bancoCodigo ? `(${d.bancoCodigo})` : ""].filter(Boolean).join(" ");

  return (
    <div className="mt-2 border border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-800 rounded-lg p-3">
      <div className="flex items-center gap-2 mb-2">
        <ShieldCheck size={14} className="text-green-600" />
        <span className="text-[11px] font-semibold text-green-700 dark:text-green-400 uppercase tracking-wider">
          Validado — {tipo}
        </span>
        {d.activa !== undefined && (
          <span
            className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
              d.activa
                ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"
                : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
            }`}
          >
            {d.activa ? "Cuenta activa" : "Cuenta inactiva"}
          </span>
        )}
      </div>
      <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
        <RowRecipient label="Nombre" value={d.nombre} strong />
        <RowRecipient label={d.tipoDoc || "CUIT"} value={d.cuit || "—"} />
        {bank && <RowRecipient label="Banco" value={bank} />}
        {d.tipoCuenta && <RowRecipient label="Tipo de cuenta" value={d.tipoCuenta} />}
        {d.moneda && <RowRecipient label="Moneda" value={d.moneda} />}
        {d.tipoPersona && <RowRecipient label="Persona" value={d.tipoPersona} />}
        <RowRecipient label="CBU/CVU" value={d.cbu} mono />
        <RowRecipient label="Alias" value={d.alias ? `@${d.alias}` : "—"} />
      </div>
    </div>
  );
}
