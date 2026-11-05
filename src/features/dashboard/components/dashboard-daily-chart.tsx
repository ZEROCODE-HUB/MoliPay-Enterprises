import { BarChart,Bar,XAxis,YAxis,CartesianGrid,Tooltip,ResponsiveContainer } from "recharts";
import { Card } from "@/shared/ui/card";
import { formatMoney } from "@/shared/lib/format";

import type { DashboardPageVm } from "./use-dashboard-page";

export function DashboardDailyChart({
  periodLabel,
  data,
}: Pick<DashboardPageVm, "periodLabel" | "data">) {
  return (
    <Card>
      <div className="flex items-center justify-between mb-4 gap-3">
        <div className="min-w-0">
          <h3 className="font-semibold text-black-800 truncate">Movimientos diarios</h3>
          <p className="text-xs text-black-400 truncate">{periodLabel}</p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs mb-4">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-red-500" /> Depósitos
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-black" /> Cobros QR
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-navy-500" /> Link de Pago
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-warning" /> Total del día
        </span>
      </div>
      <div className="w-full" style={{ height: Math.max(200, Math.min(360, 40 * data.length)) }}>
        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{ top: 4, right: 4, left: -8, bottom: 0 }}
              barGap={2}
              barCategoryGap={data.length > 30 ? 4 : 8}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#D4D4D4" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: "#909090" }}
                tickLine={false}
                axisLine={{ stroke: "#D4D4D4" }}
                interval={data.length > 30 ? Math.floor(data.length / 10) : 0}
              />
              <YAxis
                tickFormatter={(v: number) => `$${(v / 1_000_000).toFixed(1)}M`}
                tick={{ fontSize: 10, fill: "#909090" }}
                tickLine={false}
                axisLine={false}
                width={52}
              />
              <Tooltip
                formatter={(value: number, name: string) => {
                  const labels: Record<string, string> = {
                    depositos: "Depósitos",
                    cobrosQR: "Cobros QR",
                    linkPago: "Link de Pago",
                    total: "Total del día",
                  };
                  return [formatMoney(value), labels[name] || name];
                }}
                labelFormatter={(label: string) => `Fecha: ${label}`}
                contentStyle={{
                  borderRadius: 4,
                  border: "1px solid #D4D4D4",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
                  fontSize: 12,
                }}
              />
              <Bar dataKey="depositos" fill="#D3001F" radius={[2, 2, 0, 0]} maxBarSize={32} />
              <Bar dataKey="cobrosQR" fill="#000000" radius={[2, 2, 0, 0]} maxBarSize={32} />
              <Bar dataKey="linkPago" fill="#324595" radius={[2, 2, 0, 0]} maxBarSize={32} />
              <Bar dataKey="total" fill="#E37B1A" radius={[2, 2, 0, 0]} maxBarSize={32} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-40 text-sm text-black-400">
            No hay movimientos para el período seleccionado.
          </div>
        )}
      </div>
    </Card>
  );
}
