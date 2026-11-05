import { FileSpreadsheet,FileText } from "lucide-react";
import { Card } from "@/shared/ui/card";
import { BtnOutline } from "@/shared/ui/button";
import { QUICK } from "@/features/dashboard/dashboard.rules";
import type { DashboardPageVm } from "./use-dashboard-page";

export function DashboardPeriodFilter({
  setPeriod,
  period,
  day,
  setDay,
  from,
  setFrom,
  to,
  setTo,
  doExport,
}: Pick<
  DashboardPageVm,
  "setPeriod" | "period" | "day" | "setDay" | "from" | "setFrom" | "to" | "setTo" | "doExport"
>) {
  return (
    <Card className="mb-8">
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <span className="text-xs font-semibold text-black-400 uppercase tracking-wide shrink-0">
          Período
        </span>
        {QUICK.map((p) => (
          <button
            key={p.k}
            onClick={() => setPeriod(p.k)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition ${
              period === p.k
                ? "bg-navy-50 text-navy-600 border-transparent"
                : "bg-white hover:bg-black-50 border-black-100 text-black-500"
            }`}
          >
            {p.l}
          </button>
        ))}
        <button
          onClick={() => setPeriod("day")}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition ${
            period === "day"
              ? "bg-navy-50 text-navy-600 border-transparent"
              : "bg-white hover:bg-black-50 border-black-100 text-black-500"
          }`}
        >
          Día específico
        </button>
        <button
          onClick={() => setPeriod("range")}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition ${
            period === "range"
              ? "bg-navy-50 text-navy-600 border-transparent"
              : "bg-white hover:bg-black-50 border-black-100 text-black-500"
          }`}
        >
          Rango
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs text-black-400">Día</span>
          <input
            type="date"
            value={day}
            onChange={(e) => setDay(e.target.value)}
            className="h-9 px-3 rounded-sm border border-black-100 bg-white text-sm text-black-700"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-black-400">Desde</span>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="h-9 px-3 rounded-sm border border-black-100 bg-white text-sm text-black-700"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-black-400">Hasta</span>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            min={from || undefined}
            className="h-9 px-3 rounded-sm border border-black-100 bg-white text-sm text-black-700"
          />
        </div>
        <div className="ml-auto flex gap-2">
          <BtnOutline onClick={() => doExport("xlsx")}>
            <FileSpreadsheet size={14} /> Excel
          </BtnOutline>
          <BtnOutline onClick={() => doExport("pdf")}>
            <FileText size={14} /> PDF
          </BtnOutline>
        </div>
      </div>
    </Card>
  );
}
