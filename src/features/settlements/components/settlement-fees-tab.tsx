import { Badge } from "@/shared/ui/badge";

import type { SettlementsPageVm } from "./use-settlements-page";

export function SettlementFeesTab({
  activeTab,
  fees,
}: Pick<SettlementsPageVm, "activeTab" | "fees">) {
  return (
    <>
      {activeTab === "comisiones" && (
        <div>
          <div className="px-5 py-3 border-b">
            <div className="text-xs text-muted-foreground">
              Comisiones vigentes por bandera y cuota. Solo lectura — tasas configuradas por el
              administrador.
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="text-left px-5 py-3">Bandera</th>
                  <th className="text-right px-5 py-3">Cuotas</th>
                  <th className="text-right px-5 py-3">Tasa mensual (TEM)</th>
                  <th className="text-center px-5 py-3">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {fees.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-5 py-10 text-center text-sm text-muted-foreground"
                    >
                      No hay comisiones configuradas para tu comercio. El administrador debe asignar
                      banderas y cuotas primero.
                    </td>
                  </tr>
                ) : (
                  fees.map((c, idx) => (
                    <tr key={`${c.bandera}-${c.cuotas}-${idx}`} className="hover:bg-muted/30">
                      <td className="px-5 py-3">
                        <Badge tone="neutral">{c.bandera}</Badge>
                      </td>
                      <td className="px-5 py-3 text-right font-mono tabular-nums">{c.cuotas}x</td>
                      <td className="px-5 py-3 text-right font-mono tabular-nums font-semibold">
                        {c.tasaMensual}%
                      </td>
                      <td className="px-5 py-3 text-center">
                        <Badge tone={c.estado === "Activo" ? "success" : "neutral"}>
                          {c.estado}
                        </Badge>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="px-5 py-3 border-t text-[11px] text-muted-foreground">
            La tasa mensual (TEM) es el porcentaje que se aplica mensualmente sobre el monto de cada
            cuota. No se muestra la tasa anual (TNA).
          </div>
        </div>
      )}
    </>
  );
}
