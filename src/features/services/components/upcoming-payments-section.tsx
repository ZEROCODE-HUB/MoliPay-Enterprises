import { Calendar,Clock } from "lucide-react";
import { Card } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { BtnPrimary } from "@/shared/ui/button";
import { PREVIEW_LIMIT,daysUntil } from "@/features/services/services.rules";

import type { ServicesPageVm } from "./use-services-page";

export function UpcomingPaymentsSection({
  sectionTab,
  proxAll,
  prox,
  setPay,
  setProxAll,
}: Pick<ServicesPageVm, "sectionTab" | "proxAll" | "prox" | "setPay" | "setProxAll">) {
  return (
    <>
      {sectionTab === "proximos" && (
        <Card className="mb-6">
          <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
            <Calendar size={14} className="text-muted-foreground" />
            Proximos pagos y vencimientos
          </h3>
          <div className="divide-y">
            {(proxAll ? prox : prox.slice(0, PREVIEW_LIMIT)).map((s) => {
              const Icon = s.icon;
              const dd = daysUntil(s.venc);
              const isOverdue = dd < 0;
              return (
                <div key={s.n + s.c} className="flex items-center justify-between gap-3 py-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-md bg-[color:var(--brand-soft)] flex items-center justify-center shrink-0">
                      <Icon size={16} className="text-[color:var(--brand-dark)]" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-sm truncate">{s.n}</div>
                      <div className="text-xs text-muted-foreground">
                        {s.c} · {s.cat}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <div className="text-sm font-semibold">{s.v}</div>
                      <div className="text-[11px] text-muted-foreground flex items-center gap-1 justify-end">
                        <Clock size={10} />
                        {isOverdue ? `Vencido hace ${Math.abs(dd)} dias` : `Vence en ${dd} dias`}
                      </div>
                    </div>
                    <Badge tone={isOverdue ? "danger" : s.e === "Pendiente" ? "warn" : "neutral"}>
                      {isOverdue ? "Vencido" : s.e}
                    </Badge>
                    <BtnPrimary className="h-9 px-4" onClick={() => setPay(s)}>
                      Pagar
                    </BtnPrimary>
                  </div>
                </div>
              );
            })}
          </div>
          {prox.length > PREVIEW_LIMIT && (
            <button
              onClick={() => setProxAll(!proxAll)}
              className="w-full text-center text-xs font-semibold text-primary pt-3 pb-1 hover:opacity-80 transition border-t border-border mt-1"
            >
              {proxAll ? "Mostrar menos" : `Ver todos (${prox.length})`}
            </button>
          )}
        </Card>
      )}
    </>
  );
}
