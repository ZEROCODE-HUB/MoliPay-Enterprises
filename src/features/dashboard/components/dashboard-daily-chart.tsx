import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Card } from "@/shared/ui/card";
import { formatMoney } from "@/shared/lib/format";

import type { DashboardPageVm } from "./use-dashboard-page";

/**
 * Por dia: una barra apilada con lo ingresado (depositos + link de pago) y, al lado,
 * una barra con los retiros. El desglose se ve en el tooltip.
 */
const CHANNEL_COLOR = {
  depositos: "#324595",
  linkPago: "#D3001F",
  retiros: "#909090",
};

const RETIROS = { key: "retiros", label: "Retiros", color: CHANNEL_COLOR.retiros } as const;

const SERIES = [
  { key: "depositos", label: "Depósitos", color: CHANNEL_COLOR.depositos },
  { key: "linkPago", label: "Link de pago", color: CHANNEL_COLOR.linkPago },
] as const;

type Point = DashboardPageVm["data"][number];

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { payload: Point }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload as Record<string, number | string>;
  const income = SERIES.reduce((a, s) => a + Number(p[s.key] ?? 0), 0);
  const out = Number(p.retiros ?? 0);
  const net = income - out;
  const row = (color: string, text: string, value: number, sign = "") => (
    <div className="flex items-center justify-between gap-6">
      <span className="flex items-center gap-1.5 text-muted-foreground">
        <span className="h-2 w-2 rounded-[2px]" style={{ background: color }} />
        {text}
      </span>
      <span className="font-mono tabular-nums text-foreground">
        {sign}
        {formatMoney(value)}
      </span>
    </div>
  );
  return (
    <div className="min-w-[230px] rounded-lg border border-border bg-popover p-3 text-xs shadow-md">
      <div className="mb-2 font-medium text-foreground">{label}</div>

      <div className="mb-1 text-[11px] text-muted-foreground">Ingresos</div>
      <div className="space-y-1">
        {SERIES.map((s) => (
          <div key={s.key}>{row(s.color, s.label, Number(p[s.key] ?? 0))}</div>
        ))}
      </div>
      <div className="mt-1 flex justify-between gap-6 font-medium text-foreground">
        <span>Total ingresos</span>
        <span className="font-mono tabular-nums">{formatMoney(income)}</span>
      </div>

      <div className="mb-1 mt-3 text-[11px] text-muted-foreground">Egresos</div>
      {row(RETIROS.color, RETIROS.label, out, out > 0 ? "− " : "")}

      <div className="mt-3 flex justify-between gap-6 border-t border-border pt-2 font-medium">
        <span className="text-foreground">Neto del día</span>
        <span className={`font-mono tabular-nums ${net < 0 ? "text-red-600" : "text-emerald-700"}`}>
          {net < 0 ? "− " : ""}
          {formatMoney(Math.abs(net))}
        </span>
      </div>
    </div>
  );
}

export function DashboardDailyChart({
  periodLabel,
  data,
}: Pick<DashboardPageVm, "periodLabel" | "data">) {
  const last = SERIES.length - 1;
  return (
    <Card className="h-full p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-display text-sm font-medium text-foreground">Movimientos diarios</h3>
          <p className="truncate text-xs text-muted-foreground">{periodLabel}</p>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          {[...SERIES, RETIROS].map((s) => (
            <span key={s.key} className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-md" style={{ background: s.color }} /> {s.label}
            </span>
          ))}
        </div>
      </div>
      <div className="h-72 w-full">
        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{ top: 4, right: 4, left: -8, bottom: 0 }}
              barCategoryGap={data.length > 45 ? "12%" : data.length > 20 ? "18%" : "28%"}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: "#909090", fontFamily: "var(--font-mono)" }}
                tickLine={false}
                axisLine={false}
                interval={data.length > 30 ? Math.floor(data.length / 10) : "preserveStartEnd"}
              />
              <YAxis
                tickFormatter={(v: number) => `$${(v / 1_000_000).toFixed(1)}M`}
                tick={{ fontSize: 11, fill: "#909090", fontFamily: "var(--font-mono)" }}
                tickLine={false}
                axisLine={false}
                width={52}
              />
              <Tooltip
                content={<ChartTooltip />}
                cursor={{ fill: "var(--color-muted)", opacity: 0.6 }}
              />
              {SERIES.map((s, i) => (
                <Bar
                  key={s.key}
                  dataKey={s.key}
                  stackId="day"
                  fill={s.color}
                  maxBarSize={56}
                  radius={i === last ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                />
              ))}
              <Bar
                dataKey={RETIROS.key}
                fill={RETIROS.color}
                maxBarSize={56}
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            No hay movimientos para el período seleccionado.
          </div>
        )}
      </div>
    </Card>
  );
}
