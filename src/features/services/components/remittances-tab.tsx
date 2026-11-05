import { Globe,Send } from "lucide-react";
import { Card } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { BtnPrimary } from "@/shared/ui/button";
import { Input } from "@/shared/ui/form-controls";
import { remesas } from "@/features/services/services.rules";

import type { ServicesPageVm } from "./use-services-page";

export function RemittancesTab({
  tab,
  setRemesaOpen,
}: Pick<ServicesPageVm, "tab" | "setRemesaOpen">) {
  return (
    <>
      {tab === "remesas" && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <div className="bg-card border rounded-lg p-3">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Enviadas este mes
              </div>
              <div className="font-display tabular-nums text-base md:text-lg font-semibold mt-0.5">
                12
              </div>
              <div className="text-[10px] text-muted-foreground mt-0.5">$ 18,4M ARS</div>
            </div>
            <div className="bg-card border rounded-lg p-3">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Paises destino
              </div>
              <div className="font-display tabular-nums text-base md:text-lg font-semibold mt-0.5">
                6
              </div>
            </div>
            <div className="bg-card border rounded-lg p-3">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                TC promedio
              </div>
              <div className="font-display tabular-nums text-base md:text-lg font-semibold mt-0.5">
                MORE rate
              </div>
              <div className="text-[10px] text-muted-foreground mt-0.5">Bonos · Cripto · P2P</div>
            </div>
            <div className="bg-card border rounded-lg p-3">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                En proceso
              </div>
              <div className="font-display tabular-nums text-base md:text-lg font-semibold mt-0.5">
                2
              </div>
            </div>
          </div>
          <div className="grid lg:grid-cols-[1fr_1.4fr] gap-6">
            <Card>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Globe size={16} /> Nueva remesa internacional
              </h3>
              <p className="text-xs text-muted-foreground mb-4">
                Procesada via MORE con la mejor cotizacion disponible (bonos, cripto o P2P).
              </p>
              <BtnPrimary className="w-full" onClick={() => setRemesaOpen(true)}>
                <Send size={14} /> Enviar remesa
              </BtnPrimary>
            </Card>
            <Card className="p-0 overflow-hidden">
              <div className="px-5 py-4 border-b flex justify-between items-center">
                <h3 className="font-semibold">Historial de remesas</h3>
                <div className="flex gap-2">
                  <select className="h-9 px-2 rounded-md border bg-card text-xs">
                    <option>Pais: todos</option>
                    <option>Colombia</option>
                    <option>Mexico</option>
                    <option>Espana</option>
                    <option>Brasil</option>
                  </select>
                  <Input type="date" className="h-9 max-w-[140px]" />
                </div>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[11px] uppercase tracking-wide text-muted-foreground border-b bg-muted/30">
                    <th className="text-left px-5 py-2.5">Fecha</th>
                    <th className="text-left px-5 py-2.5">Destino</th>
                    <th className="text-right px-5 py-2.5">ARS</th>
                    <th className="text-right px-5 py-2.5">Recibe</th>
                    <th className="text-right px-5 py-2.5">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {remesas.map((r, i) => (
                    <tr key={i} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="px-5 py-3 text-xs text-muted-foreground">{r.f}</td>
                      <td className="px-5 py-3">
                        <div className="font-semibold text-sm">{r.pais}</div>
                        <div className="text-xs text-muted-foreground">
                          {r.banco} · {r.tc}
                        </div>
                      </td>
                      <td className="px-5 py-3 font-mono tabular-nums text-right font-semibold">
                        {r.mARS}
                      </td>
                      <td className="px-5 py-3 font-mono tabular-nums text-right">{r.mDest}</td>
                      <td className="px-5 py-3 text-right">
                        <Badge
                          tone={
                            r.e === "Completado"
                              ? "success"
                              : r.e === "En proceso"
                                ? "warn"
                                : "danger"
                          }
                        >
                          {r.e}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </div>
        </>
      )}
    </>
  );
}
