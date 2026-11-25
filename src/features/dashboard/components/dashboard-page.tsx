import { useDashboardPage } from "@/features/dashboard/components/use-dashboard-page";
import { PageHeader } from "@/shared/ui/page-header";
import { FileSpreadsheet, FileText } from "lucide-react";
import { DashboardPeriodFilter } from "@/features/dashboard/components/dashboard-period-filter";
import { DashboardKpis } from "@/features/dashboard/components/dashboard-kpis";
import { Card } from "@/shared/ui/card";
import { BtnOutline } from "@/shared/ui/button";
import { formatMoneyAmount } from "@/shared/lib/money";
import { DashboardDailyChart } from "@/features/dashboard/components/dashboard-daily-chart";

export function DashboardPage() {
  const vm = useDashboardPage();
  const { kpis, doExport } = vm;

  const channels = [
    { label: "Depósitos", amount: kpis.depositos, ops: kpis.opsDep, bar: "bg-navy-500" },
    { label: "Link de pago", amount: kpis.cobrosLink, ops: kpis.opsLink, bar: "bg-red-500" },
    { label: "Retiros", amount: kpis.retiros, ops: kpis.opsRet, bar: "bg-black-300" },
  ];
  const max = Math.max(1, ...channels.map((c) => c.amount.cents));

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Estado de tu operación financiera"
        action={
          <div className="flex items-center gap-2">
            <span className="hidden items-center gap-2 pr-2 text-xs text-muted-foreground md:inline-flex">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Datos en vivo
            </span>
            <BtnOutline onClick={() => doExport("xlsx")}>
              <FileSpreadsheet size={14} /> Excel
            </BtnOutline>
            <BtnOutline onClick={() => doExport("pdf")}>
              <FileText size={14} /> PDF
            </BtnOutline>
          </div>
        }
      />

      <DashboardPeriodFilter {...vm} />

      <DashboardKpis {...vm} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <DashboardDailyChart {...vm} />
        </div>
        <Card className="p-5">
          <h3 className="font-display text-sm font-medium text-foreground">Ingresos y retiros</h3>
          <p className="text-xs text-muted-foreground">{vm.periodLabel}</p>
          <ul className="mt-4 space-y-4">
            {channels.map((c) => (
              <li key={c.label}>
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-sm text-foreground">{c.label}</span>
                  <span className="font-mono text-sm tabular-nums text-foreground">
                    {formatMoneyAmount(c.amount)}
                  </span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className={`h-full rounded-full ${c.bar}`}
                    style={{ width: `${(c.amount.cents / max) * 100}%` }}
                  />
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {c.ops} {c.ops === 1 ? "transacción" : "transacciones"}
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  );
}
