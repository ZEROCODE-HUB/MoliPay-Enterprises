import { Building2,Copy } from "lucide-react";
import { formatMoneyAmount } from "@/shared/lib/money";
import { copiarCvu,fmtLimit } from "./subaccount-view";

import type { SubaccountDetailModalVm } from "./use-subaccount-detail-modal";

export function SubaccountFundsActions({
  onFondear,
  sub,
  totalDepositos,
  totalRetiros,
}: Pick<SubaccountDetailModalVm, "onFondear" | "sub" | "totalDepositos" | "totalRetiros">) {
  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold">Informacion financiera</h3>
        <button
          onClick={onFondear}
          className="h-7 w-7 inline-flex items-center justify-center rounded-md border bg-card hover:bg-muted transition text-muted-foreground hover:text-foreground"
          title="Mover fondos"
        >
          <Building2 size={13} />
        </button>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-muted/30 rounded-lg p-3">
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
            Balance actual
          </div>
          <div className="font-display tabular-nums text-base font-semibold mt-1">
            {formatMoneyAmount(sub.disp)}
          </div>
        </div>
        <div className="bg-muted/30 rounded-lg p-3">
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
            Total depositos
          </div>
          <div className="font-display tabular-nums text-base font-semibold mt-1 text-emerald-700">
            {formatMoneyAmount(totalDepositos)}
          </div>
        </div>
        <div className="bg-muted/30 rounded-lg p-3">
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
            Total retiros
          </div>
          <div className="font-display tabular-nums text-base font-semibold mt-1 text-red-700">
            {formatMoneyAmount(totalRetiros)}
          </div>
        </div>
        <div className="bg-muted/30 rounded-lg p-3">
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
            Limite diario
          </div>
          <div
            className={`font-display tabular-nums text-base font-semibold mt-1 ${sub.lim ? "" : "text-muted-foreground"}`}
          >
            {fmtLimit(sub.lim)}
          </div>
        </div>
        <div className="bg-muted/30 rounded-lg p-3 sm:col-span-4">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] uppercase tracking-wide text-muted-foreground">CVU</span>
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="font-mono text-xs font-semibold truncate">
                {sub.cbu || "Sin CVU"}
              </span>
              {sub.cbu && (
                <button
                  onClick={() => copiarCvu(sub.cbu)}
                  className="h-6 w-6 shrink-0 inline-flex items-center justify-center rounded hover:bg-muted text-muted-foreground hover:text-foreground transition"
                  title="Copiar CVU"
                >
                  <Copy size={12} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
