import { formatARS } from "@/features/collections/collections.data";

import type { CollectionsPageVm } from "./use-collections-page";

export function CollectionsKpis({ kpi }: Pick<CollectionsPageVm, "kpi">) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3 mb-6">
      <div className="bg-card border rounded-lg p-3">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
          Total de lotes
        </div>
        <div className="font-display tabular-nums text-sm md:text-base font-semibold mt-0.5">
          {kpi.totalLotes}
        </div>
      </div>
      <div className="bg-card border rounded-lg p-3">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">En proceso</div>
        <div className="font-display tabular-nums text-sm md:text-base font-semibold mt-0.5 text-amber-600">
          {kpi.enProceso}
        </div>
      </div>
      <div className="bg-card border rounded-lg p-3">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
          Finalizados
        </div>
        <div className="font-display tabular-nums text-sm md:text-base font-semibold mt-0.5 text-emerald-600">
          {kpi.finalizados}
        </div>
      </div>
      <div className="bg-card border rounded-lg p-3">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Con error</div>
        <div className="font-display tabular-nums text-sm md:text-base font-semibold mt-0.5 text-red-600">
          {kpi.conError}
        </div>
      </div>
      <div className="bg-card border rounded-lg p-3">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
          Monto total
        </div>
        <div className="font-display tabular-nums text-sm md:text-base font-semibold mt-0.5">
          {formatARS(kpi.montoTotal)}
        </div>
      </div>
      <div className="bg-card border rounded-lg p-3">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Cobrado</div>
        <div className="font-display tabular-nums text-sm md:text-base font-semibold mt-0.5 text-emerald-600">
          {formatARS(kpi.montoCobrado)}
        </div>
      </div>
      <div className="bg-card border rounded-lg p-3">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Pendiente</div>
        <div className="font-display tabular-nums text-sm md:text-base font-semibold mt-0.5 text-amber-600">
          {formatARS(kpi.montoPendiente)}
        </div>
      </div>
    </div>
  );
}
