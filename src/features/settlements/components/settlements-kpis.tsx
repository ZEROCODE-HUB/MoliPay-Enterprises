import { formatARS } from "@/features/collections/collections.data";
import { StatItem, StatStrip } from "@/shared/ui/stat-strip";
import { fmtDateFull } from "@/features/settlements/settlements.rules";

import type { SettlementsPageVm } from "./use-settlements-page";

export function SettlementsKpis({
  summaryQ,
  res,
  available,
}: Pick<SettlementsPageVm, "summaryQ" | "res" | "available">) {
  const loading = summaryQ.isLoading;
  return (
    <StatStrip leadFirst>
      <StatItem
        lead
        loading={loading}
        label="Saldo disponible"
        value={formatARS(res?.saldo_disponible ?? 0)}
        sub="El mismo que el saldo total de tu cuenta"
      />
      <StatItem
        loading={loading}
        label="Pendiente de acreditación"
        value={formatARS(res?.pendiente_acreditacion ?? 0)}
        sub={`Vendido del mes: ${formatARS(res?.vendido_periodo ?? 0)} (${res?.ventas_periodo ?? 0} ventas)`}
      />
      <StatItem
        loading={loading}
        label="Próxima acreditación"
        value={res?.proxima_acreditacion ? formatARS(res.proxima_acreditacion.monto) : "—"}
        sub={
          res?.proxima_acreditacion
            ? fmtDateFull(res.proxima_acreditacion.fecha)
            : "Sin acreditaciones programadas"
        }
      />
      <StatItem
        loading={loading}
        label="Adelanto a descontar"
        value={formatARS(res?.adelanto_pendiente_compensar ?? 0)}
        sub={
          <>
            {(res?.deuda_contracargos ?? 0) > 0
              ? `Deuda por contracargos: ${formatARS(res!.deuda_contracargos)}`
              : `Disponible para adelanto: ${formatARS(available)}`}
            {(res?.adelanto_pendiente_compensar ?? 0) > 0 && (
              <span className="mt-0.5 block text-[11px]">
                Ya lo recibiste: se descuenta de la acreditación del lote de esa venta.
              </span>
            )}
          </>
        }
      />
    </StatStrip>
  );
}
