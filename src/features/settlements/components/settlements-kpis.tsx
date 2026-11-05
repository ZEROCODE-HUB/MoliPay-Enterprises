import { formatARS } from "@/features/collections/collections.data";
import { CalendarDays,Clock,Percent,Wallet } from "lucide-react";
import { Card } from "@/shared/ui/card";
import { fmtDateFull } from "@/features/settlements/settlements.rules";

import type { SettlementsPageVm } from "./use-settlements-page";

export function SettlementsKpis({
  summaryQ,
  res,
  available,
}: Pick<SettlementsPageVm, "summaryQ" | "res" | "available">) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
      <Card className="border-l-4 border-l-emerald-500">
        <div className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <Wallet size={12} /> Saldo disponible
        </div>
        <div className="font-display tabular-nums text-xl md:text-2xl font-bold mt-1 text-emerald-700">
          {summaryQ.isLoading ? "—" : formatARS(res?.saldo_disponible ?? 0)}
        </div>
        <div className="text-xs text-muted-foreground mt-1">
          El mismo que el Saldo Total de tu cuenta
        </div>
      </Card>
      <Card className="border-l-4 border-l-blue-500">
        <div className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <Clock size={12} /> Pendiente de acreditación
        </div>
        <div className="font-display tabular-nums text-xl md:text-2xl font-bold mt-1 text-blue-700">
          {summaryQ.isLoading ? "—" : formatARS(res?.pendiente_acreditacion ?? 0)}
        </div>
        <div className="text-xs text-muted-foreground mt-1">
          Vendido del mes: {formatARS(res?.vendido_periodo ?? 0)} ({res?.ventas_periodo ?? 0}{" "}
          ventas)
        </div>
      </Card>
      <Card className="border-l-4 border-l-amber-500">
        <div className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <CalendarDays size={12} /> Próxima acreditación
        </div>
        <div className="font-display tabular-nums text-xl md:text-2xl font-bold mt-1">
          {summaryQ.isLoading
            ? "—"
            : res?.proxima_acreditacion
              ? formatARS(res.proxima_acreditacion.monto)
              : "—"}
        </div>
        <div className="text-xs text-muted-foreground mt-1">
          {res?.proxima_acreditacion
            ? fmtDateFull(res.proxima_acreditacion.fecha)
            : "Sin acreditaciones programadas"}
        </div>
      </Card>
      <Card className="border-l-4 border-l-amber-600">
        <div className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <Percent size={12} /> Adelanto a compensar
        </div>
        <div className="font-display tabular-nums text-xl md:text-2xl font-bold mt-1 text-amber-700">
          {summaryQ.isLoading ? "—" : formatARS(res?.adelanto_pendiente_compensar ?? 0)}
        </div>
        <div className="text-xs text-muted-foreground mt-1">
          {(res?.deuda_contracargos ?? 0) > 0
            ? `Deuda por contracargos: ${formatARS(res!.deuda_contracargos)}`
            : `Disponible para adelanto: ${formatARS(available)}`}
        </div>
      </Card>
    </div>
  );
}
