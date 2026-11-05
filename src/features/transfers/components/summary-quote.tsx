import { type Quote } from "@/features/transfers/transfer-store";
import { formatMoney } from "@/shared/lib/format";
import { detailFee,fmtCargo,fmtPct } from "@/features/transfers/transfer-ui.rules";
import { TaxRow } from "./transfer-ui-parts";

/**
 * Resumen debajo del monto. El destinatario recibe el monto completo; comisión,
 * IVA e impuestos se suman y el total sale del disponible.
 */
export function SummaryQuote({
  monto: amount,
  disponible: available,
  cotizacion: quote,
  cargando: loading,
  insuficiente,
  faltante,
}: {
  monto: number;
  disponible: number;
  cotizacion: Quote | null;
  cargando: boolean;
  insuficiente: boolean;
  faltante: number;
}) {
  if (!(amount > 0)) {
    return (
      <div className="text-xs text-muted-foreground mt-1">
        Disponible: <span className="font-mono">{formatMoney(available)}</span>
      </div>
    );
  }
  const cfg = quote?.config ?? null;
  const withoutCargo = quote?.interna || !cfg;
  return (
    <div
      className={`mt-2 rounded-lg border p-3 text-sm ${insuficiente ? "border-red-300 bg-red-50" : "bg-muted/30"}`}
    >
      <div className="grid grid-cols-2 gap-y-1">
        <span className="text-muted-foreground">Monto a enviar</span>
        <span className="text-right font-mono tabular-nums">{formatMoney(amount)}</span>
        <span className="text-muted-foreground">
          Comisión
          {quote && !withoutCargo && cfg && (
            <span className="ml-1 text-[11px]">· {detailFee(cfg)}</span>
          )}
        </span>
        <span className="text-right font-mono tabular-nums">
          {quote ? fmtCargo(quote.comision) : loading ? "…" : "—"}
        </span>
        <span className="text-muted-foreground">
          IVA
          {quote && !withoutCargo && cfg && (
            <span className="ml-1 text-[11px]">
              · {fmtPct(cfg.porcentajeImpuesto)} de la comisión
            </span>
          )}
        </span>
        <span className="text-right font-mono tabular-nums">
          {quote ? fmtCargo(quote.impuesto) : loading ? "…" : "—"}
        </span>
        {quote?.impuestos.map((t) => (
          <TaxRow key={t.impuestoId} t={t} />
        ))}
        <span className="font-semibold border-t pt-1 mt-1">Total a debitar de tu saldo</span>
        <span className="text-right font-mono tabular-nums font-semibold border-t pt-1 mt-1">
          {quote ? formatMoney(quote.total) : loading ? "…" : "—"}
        </span>
        <span className="text-muted-foreground">Disponible</span>
        <span className="text-right font-mono tabular-nums">
          {formatMoney(quote?.disponible ?? available)}
        </span>
        <span className="text-muted-foreground">Saldo restante estimado</span>
        <span
          className={`text-right font-mono tabular-nums ${quote && quote.disponible - quote.total < 0 ? "text-red-700" : ""}`}
        >
          {quote ? formatMoney(quote.disponible - quote.total) : loading ? "…" : "—"}
        </span>
      </div>
      <div className="mt-1 text-[11px] text-muted-foreground">
        El destinatario recibe {formatMoney(amount)}.
      </div>
      {quote && (
        <div className="mt-2 border-t pt-2 text-[11px] text-muted-foreground">
          {quote.interna
            ? "Transferencia entre tus cuentas: no se cobra comisión ni IVA."
            : !cfg
              ? "Esta cuenta no tiene comisión configurada para transferencias."
              : `Comisión configurada ${cfg.alcance === "cvu" ? "para la subcuenta de origen" : "para toda tu cuenta"}.`}
        </div>
      )}
      {insuficiente && (
        <div
          className="mt-2 border-t border-red-200 pt-2 text-xs font-semibold text-red-700"
          role="alert"
        >
          Saldo insuficiente: te faltan {formatMoney(faltante)} para cubrir el total a debitar.
        </div>
      )}
    </div>
  );
}
