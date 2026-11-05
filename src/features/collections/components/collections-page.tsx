import { useCollectionsPage } from "@/features/collections/components/use-collections-page";
import { CollectionsFilters } from "@/features/collections/components/collections-filters";
import { CollectionsKpis } from "@/features/collections/components/collections-kpis";
import { CollectionsCharts } from "@/features/collections/components/collections-charts";
import { Card } from "@/shared/ui/card";
import {
CartesianGrid,
Legend,
Line,
LineChart,
ResponsiveContainer,
Tooltip,
XAxis,
YAxis,
} from "recharts";
import { formatARS } from "@/features/collections/collections.data";
import { CollectionsRecentBatches } from "@/features/collections/components/collections-recent-batches";

export function CollectionsPage() {
  const vm = useCollectionsPage();
  const { trend } = vm;

  return (
    <div>
      {/* Filtros */}
      <CollectionsFilters {...vm} />

      {/* KPIs */}
      <CollectionsKpis {...vm} />

      {/* Graficos */}
      <CollectionsCharts {...vm} />

      {/* Evolucion de pagos */}
      <Card className="mb-6">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
          Evolucion de pagos
        </h4>
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={trend}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="fecha" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip formatter={(v: number) => formatARS(v)} />
            <Legend />
            <Line
              type="monotone"
              dataKey="monto"
              stroke="#D3001F"
              strokeWidth={2}
              name="Monto"
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      {/* Tabla de lotes recientes */}
      <CollectionsRecentBatches {...vm} />
    </div>
  );
}
