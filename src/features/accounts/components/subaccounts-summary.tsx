import { PieChart } from "lucide-react";
import { addMoney,formatMoneyAmount } from "@/shared/lib/money";

import type { SubaccountsPageVm } from "./use-subaccounts-page";

export function SubaccountsSummary({
  total,
  subs,
  totalDisp,
  totalRet,
}: Pick<SubaccountsPageVm, "total" | "subs" | "totalDisp" | "totalRet">) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
      <div className="bg-card border rounded-lg p-3">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
          Saldo total
        </div>
        <div className="font-display tabular-nums text-base md:text-lg font-semibold mt-0.5">
          {formatMoneyAmount(total)}
        </div>
        <div className="text-[10px] text-muted-foreground mt-0.5">{subs.length} subcuentas</div>
      </div>
      <div className="bg-card border rounded-lg p-3">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Disponible</div>
        <div className="font-display tabular-nums text-base md:text-lg font-semibold mt-0.5">
          {formatMoneyAmount(totalDisp)}
        </div>
        <div className="text-[10px] text-muted-foreground mt-0.5">Listo para operar</div>
      </div>
      <div className="bg-card border rounded-lg p-3">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Retenido</div>
        <div className="font-display tabular-nums text-base md:text-lg font-semibold mt-0.5">
          {formatMoneyAmount(totalRet)}
        </div>
        <div className="text-[10px] text-muted-foreground mt-0.5">Pendiente de liberar</div>
      </div>
      <div className="bg-card border rounded-lg p-3">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1">
          <PieChart size={11} /> Distribucion del saldo
        </div>
        <div className="text-[10px] mt-1.5 space-y-1.5">
          {subs.slice(0, 3).map((s) => {
            const pct =
              total.cents > 0
                ? (((s.disp.cents + s.ret.cents) / total.cents) * 100).toFixed(1)
                : "0.0";
            return (
              <div key={s.id ?? s.n}>
                <div className="flex justify-between text-[10px] leading-tight">
                  <span className="truncate mr-1">{s.n}</span>
                  <span className="font-semibold shrink-0">
                    {formatMoneyAmount(addMoney(s.disp, s.ret))} ({pct}%)
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-muted overflow-hidden mt-0.5">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${pct}%`, background: s.color }}
                  />
                </div>
              </div>
            );
          })}
          {subs.length > 3 && (
            <div className="text-[10px] text-muted-foreground pt-0.5">+{subs.length - 3} mas</div>
          )}
          {subs.length === 0 && (
            <div className="text-[10px] text-muted-foreground pt-0.5">Sin subcuentas</div>
          )}
        </div>
      </div>
    </div>
  );
}
