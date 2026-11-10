import { Wallet,ArrowDownLeft,ArrowUpRight,Users } from "lucide-react";
import { Card } from "@/shared/ui/card";
import { formatMoneyAmount } from "@/shared/lib/money";

import type { DashboardPageVm } from "./use-dashboard-page";

export function DashboardKpis({ kpis, cbuLabel }: Pick<DashboardPageVm, "kpis" | "cbuLabel">) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
      <Card>
        <div className="flex items-start justify-between">
          <div>
            <div className="text-xs text-black-400 mb-1">Saldo total de la cuenta</div>
            <div className="font-display tabular-nums text-xl md:text-2xl font-bold text-black-800">
              {formatMoneyAmount(kpis.saldo)}
            </div>
            <div className="text-xs text-black-400 mt-0.5 font-mono">
              {cbuLabel || "Sin CVU asignada"}
            </div>
            {kpis.retenido.cents > 0 && (
              <div className="text-xs text-black-400 mt-0.5">
                {formatMoneyAmount(kpis.retenido)} retenido
              </div>
            )}
          </div>
          <div className="w-9 h-9 rounded-sm bg-navy-50 flex items-center justify-center text-navy-500 shrink-0">
            <Wallet size={18} />
          </div>
        </div>
      </Card>
      <Card>
        <div className="flex items-start justify-between">
          <div>
            <div className="text-xs text-black-400 mb-1">Depósitos del período</div>
            <div className="font-display tabular-nums text-xl md:text-2xl font-bold text-black-800">
              {formatMoneyAmount(kpis.depositos)}
            </div>
            <div className="text-xs text-black-400 mt-0.5">{kpis.opsDep} operaciones</div>
          </div>
          <div className="w-9 h-9 rounded-sm bg-success-bg flex items-center justify-center text-success shrink-0">
            <ArrowDownLeft size={18} />
          </div>
        </div>
      </Card>
      <Card>
        <div className="flex items-start justify-between">
          <div>
            <div className="text-xs text-black-400 mb-1">Retiros del período</div>
            <div className="font-display tabular-nums text-xl md:text-2xl font-bold text-black-800">
              {formatMoneyAmount(kpis.retiros)}
            </div>
            <div className="text-xs text-black-400 mt-0.5">{kpis.opsRet} operaciones</div>
          </div>
          <div className="w-9 h-9 rounded-sm bg-error-bg flex items-center justify-center text-error shrink-0">
            <ArrowUpRight size={18} />
          </div>
        </div>
      </Card>
      <Card>
        <div className="flex items-start justify-between">
          <div>
            <div className="text-xs text-black-400 mb-1">Total de cuentas</div>
            <div className="font-display tabular-nums text-xl md:text-2xl font-bold text-black-800">
              {kpis.cuentas}
            </div>
            <div className="text-xs text-black-400 mt-0.5">
              {kpis.cuentasConCvu} con CVU asignada
            </div>
          </div>
          <div className="w-9 h-9 rounded-sm bg-info-bg flex items-center justify-center text-info shrink-0">
            <Users size={18} />
          </div>
        </div>
      </Card>
    </div>
  );
}
