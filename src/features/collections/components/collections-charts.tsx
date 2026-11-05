import { PieChart,Pie,Cell,Tooltip,ResponsiveContainer } from "recharts";
import { Card } from "@/shared/ui/card";
import { formatARS,methodPaymentLabels } from "@/features/collections/collections.data";
import { METHOD_COLORS,VENC_COLORS } from "@/features/collections/collections.rules";
import type { CollectionsPageVm } from "./use-collections-page";

export function CollectionsCharts({
  byMethod,
  byDue,
  noCobradas,
}: Pick<CollectionsPageVm, "byMethod" | "byDue" | "noCobradas">) {
  return (
    <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6 mb-6">
      {/* Cobros por medio de pago */}
      <Card>
        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
          Cobros por medio de pago
        </h4>
        <ResponsiveContainer width="100%" height={240}>
          <PieChart>
            <Pie
              data={byMethod}
              dataKey="monto"
              nameKey="medio"
              cx="50%"
              cy="50%"
              outerRadius={80}
              label={({ medio: method, porcentaje }: { medio: string; porcentaje: number }) =>
                `${methodPaymentLabels[method as keyof typeof methodPaymentLabels] || method} ${porcentaje}%`
              }
            >
              {byMethod.map((e) => (
                <Cell key={e.medio} fill={METHOD_COLORS[e.medio] || "#666"} />
              ))}
            </Pie>
            <Tooltip formatter={(v: number) => formatARS(v)} />
          </PieChart>
        </ResponsiveContainer>
      </Card>

      {/* Cobros por vencimiento */}
      <Card>
        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
          Cobros por vencimiento
        </h4>
        <ResponsiveContainer width="100%" height={240}>
          <PieChart>
            <Pie
              data={byDue}
              dataKey="cantidad"
              nameKey="label"
              cx="50%"
              cy="50%"
              outerRadius={80}
              label={({ label, cantidad: quantity }: { label: string; cantidad: number }) =>
                `${label}: ${quantity}`
              }
            >
              {byDue.map((_, i) => (
                <Cell key={i} fill={VENC_COLORS[i]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </Card>

      {/* Operaciones no cobradas */}
      <Card>
        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
          Operaciones no cobradas
        </h4>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">No cobrado</span>
            <span className="text-lg font-bold text-red-600">
              {noCobradas.porcentajeNoCobrado}%
            </span>
          </div>
          <div className="h-3 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-red-500"
              style={{ width: `${noCobradas.porcentajeNoCobrado}%` }}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-center pt-2">
            <div>
              <div className="font-display tabular-nums text-lg font-semibold">
                {noCobradas.totalOperaciones}
              </div>
              <div className="text-[10px] text-muted-foreground">Total ops</div>
            </div>
            <div>
              <div className="font-display tabular-nums text-lg font-semibold text-red-600">
                {noCobradas.vencidas}
              </div>
              <div className="text-[10px] text-muted-foreground">Vencidas</div>
            </div>
            <div>
              <div className="font-display tabular-nums text-lg font-semibold text-amber-600">
                {noCobradas.vigentes}
              </div>
              <div className="text-[10px] text-muted-foreground">Vigentes</div>
            </div>
          </div>
          <div className="text-xs text-muted-foreground text-center pt-1">
            Monto no cobrado: {formatARS(noCobradas.montoNoCobrado)}
          </div>
        </div>
      </Card>
    </div>
  );
}
