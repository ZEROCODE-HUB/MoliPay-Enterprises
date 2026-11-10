import { formatARS } from "@/features/collections/collections.data";
import { useSaleBreakdown } from "../settlements.hooks";

const CC_LABEL: Record<string, string> = {
  Abierto: "abierto",
  En_mediacion: "en mediación",
  Cerrado_acreditado: "ganado",
  Cerrado_retenido: "perdido",
};

/**
 * Desglose de una venta de Link de Pago: su parte de los descuentos del lote
 * y lo que te queda. Lo calcula la base (venta_desglose).
 */
export function SaleBreakdown({ txid }: { txid: string }) {
  const q = useSaleBreakdown(txid);
  if (q.isLoading) return <p className="text-sm text-muted-foreground">Cargando desglose…</p>;
  if (q.isError) return <p className="text-sm text-red-700">No se pudo cargar el desglose.</p>;
  const d = q.data;
  if (!d) return null;
  const cc = d.contracargo;
  const row = (label: string, v: number, strong = false) => (
    <div
      key={label}
      className={`flex justify-between ${strong ? "font-semibold border-t pt-1.5 mt-1" : ""}`}
    >
      <span className={strong ? "" : "text-muted-foreground"}>{label}</span>
      <span className={`font-mono tabular-nums ${v < 0 ? "text-red-600" : ""}`}>
        {v < 0 ? `- ${formatARS(-v)}` : formatARS(v)}
      </span>
    </div>
  );

  return (
    <div className="space-y-2 text-sm">
      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Detalle de la venta
      </div>
      {cc && (
        <p className="rounded-md bg-red-50 px-2 py-1 text-xs text-red-700">
          {cc.tipo === "devolucion"
            ? "Devolución"
            : `Contracargo ${CC_LABEL[cc.estado] ?? cc.estado}`}{" "}
          por {formatARS(Number(cc.importe))}
        </p>
      )}
      {!d.lote ? (
        <p className="text-xs text-muted-foreground">
          Payway todavía no liquidó esta venta: los descuentos se conocen cuando llega la
          liquidación.
        </p>
      ) : (
        <div className="rounded-md border p-3 space-y-1">
          {row("Importe de la venta", Number(d.monto))}
          {(d.lineas ?? []).map((x) => row(x.concepto, -Number(x.monto)))}
          {Number(d.contracargo_retenido ?? 0) > 0 &&
            row(
              "Retenido por contracargo (se libera si ganás la disputa)",
              -Number(d.contracargo_retenido),
            )}
          {Number(d.adelanto_compensado ?? 0) > 0 &&
            row("Adelanto de esta venta", -Number(d.adelanto_compensado))}
          {row(
            d.estado === "Acreditado" ? "Neto acreditado" : "Neto a acreditar",
            Number(d.neto ?? 0),
            true,
          )}
          <p className="pt-1 text-[11px] text-muted-foreground">
            Payway liquida por lote: los descuentos son la parte proporcional de esta venta.
            {Number(d.otros_del_lote ?? 0) > 0 &&
              ` Además, el lote descontó ${formatARS(Number(d.otros_del_lote))} de adelantos o deudas que no son de una venta.`}
          </p>
        </div>
      )}
    </div>
  );
}
