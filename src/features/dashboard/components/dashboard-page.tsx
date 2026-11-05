import { useDashboardPage } from "@/features/dashboard/components/use-dashboard-page";
import { PageHeader } from "@/shared/ui/page-header";
import { Clock,Link2,QrCode,Smartphone } from "lucide-react";
import { DashboardPeriodFilter } from "@/features/dashboard/components/dashboard-period-filter";
import { DashboardKpis } from "@/features/dashboard/components/dashboard-kpis";
import { Card } from "@/shared/ui/card";
import { formatMoneyAmount } from "@/shared/lib/money";
import { DashboardDailyChart } from "@/features/dashboard/components/dashboard-daily-chart";

export function DashboardPage() {
  const vm = useDashboardPage();
  const { kpis } = vm;

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Panel ejecutivo — estado de tu operación financiera."
        action={
          <div className="hidden md:flex items-center gap-2 text-xs text-black-400">
            <Clock size={14} /> Datos en vivo
          </div>
        }
      />

      <DashboardPeriodFilter {...vm} />

      <DashboardKpis {...vm} />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
        <Card>
          <div className="flex items-start justify-between">
            <div>
              <div className="text-xs text-black-400 mb-1">Cobros mediante Link de Pago</div>
              <div className="font-display tabular-nums text-xl md:text-2xl font-bold text-black-800">
                {formatMoneyAmount(kpis.cobrosLink)}
              </div>
              <div className="text-xs text-black-400 mt-0.5">{kpis.opsLink} transacciones</div>
            </div>
            <div className="w-9 h-9 rounded-sm bg-navy-50 flex items-center justify-center text-navy-500 shrink-0">
              <Link2 size={18} />
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-start justify-between">
            <div>
              <div className="text-xs text-black-400 mb-1">Cobros mediante Código QR</div>
              <div className="font-display tabular-nums text-xl md:text-2xl font-bold text-black-800">
                {formatMoneyAmount(kpis.cobrosQR)}
              </div>
              <div className="text-xs text-black-400 mt-0.5">{kpis.opsCobrosQR} transacciones</div>
            </div>
            <div className="w-9 h-9 rounded-sm bg-warning-bg flex items-center justify-center text-warning shrink-0">
              <QrCode size={18} />
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-start justify-between">
            <div>
              <div className="text-xs text-black-400 mb-1">Pagos realizados mediante QR</div>
              <div className="font-display tabular-nums text-xl md:text-2xl font-bold text-black-800">
                {formatMoneyAmount(kpis.pagosQR)}
              </div>
              <div className="text-xs text-black-400 mt-0.5">{kpis.opsPagosQR} transacciones</div>
            </div>
            <div className="w-9 h-9 rounded-sm bg-plata-200 flex items-center justify-center text-black-600 shrink-0">
              <Smartphone size={18} />
            </div>
          </div>
        </Card>
      </div>

      <DashboardDailyChart {...vm} />
    </>
  );
}
