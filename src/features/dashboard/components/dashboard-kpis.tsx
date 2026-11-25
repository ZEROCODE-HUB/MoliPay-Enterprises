import { formatMoneyAmount } from "@/shared/lib/money";
import { StatItem, StatStrip } from "@/shared/ui/stat-strip";

import type { DashboardPageVm } from "./use-dashboard-page";

/** Cifras principales: el saldo manda; depositos, retiros y cuentas lo acompañan. */
export function DashboardKpis({ kpis, cbuLabel }: Pick<DashboardPageVm, "kpis" | "cbuLabel">) {
  return (
    <StatStrip leadFirst>
      <StatItem
        lead
        label="Saldo total de la cuenta"
        value={formatMoneyAmount(kpis.saldo)}
        sub={
          <>
            <span className="font-mono">{cbuLabel || "Sin CVU asignada"}</span>
            {kpis.retenido.cents > 0 && (
              <span className="block">{formatMoneyAmount(kpis.retenido)} retenido</span>
            )}
          </>
        }
      />
      <StatItem
        label="Depósitos del período"
        value={formatMoneyAmount(kpis.depositos)}
        sub={`${kpis.opsDep} operaciones`}
      />
      <StatItem
        label="Retiros del período"
        value={formatMoneyAmount(kpis.retiros)}
        sub={`${kpis.opsRet} operaciones`}
      />
      <StatItem
        label="Total de cuentas"
        value={String(kpis.cuentas)}
        sub={`${kpis.cuentasConCvu} con CVU asignada`}
      />
    </StatStrip>
  );
}
