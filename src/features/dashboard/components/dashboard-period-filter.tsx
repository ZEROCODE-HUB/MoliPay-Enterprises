import { QUICK } from "@/features/dashboard/dashboard.rules";
import type { DashboardPageVm } from "./use-dashboard-page";

const dateCls =
  "h-9 rounded-md border border-border bg-background px-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring/30 [color-scheme:light]";

/** Selector de periodo: una fila con los atajos y, segun el modo, el dia o el rango. */
export function DashboardPeriodFilter({
  setPeriod,
  period,
  day,
  setDay,
  from,
  setFrom,
  to,
  setTo,
}: Pick<
  DashboardPageVm,
  "setPeriod" | "period" | "day" | "setDay" | "from" | "setFrom" | "to" | "setTo"
>) {
  const options = [
    ...QUICK.map((p) => ({ k: p.k, l: p.l })),
    { k: "day" as const, l: "Día" },
    { k: "range" as const, l: "Rango" },
  ];
  return (
    <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card p-3">
      <span className="text-xs font-medium text-foreground/80">Período</span>
      <div className="inline-flex rounded-md border border-border bg-muted/50 p-0.5" role="group">
        {options.map((p) => (
          <button
            key={p.k}
            type="button"
            onClick={() => setPeriod(p.k)}
            aria-pressed={period === p.k}
            className={`h-8 rounded-[5px] px-3 text-xs font-medium transition-colors ${
              period === p.k
                ? "bg-card text-foreground shadow-[0_0_0_1px_var(--color-border)]"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {p.l}
          </button>
        ))}
      </div>
      {period === "day" && (
        <input
          type="date"
          aria-label="Día"
          value={day}
          onChange={(e) => setDay(e.target.value)}
          className={dateCls}
        />
      )}
      {period === "range" && (
        <div className="flex items-center gap-1.5">
          <input
            type="date"
            aria-label="Desde"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className={dateCls}
          />
          <span className="text-xs text-muted-foreground">a</span>
          <input
            type="date"
            aria-label="Hasta"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            min={from || undefined}
            className={dateCls}
          />
        </div>
      )}
    </div>
  );
}
