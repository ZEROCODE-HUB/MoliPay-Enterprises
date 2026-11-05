import { Filter,Search } from "lucide-react";
import { Card } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { Input } from "@/shared/ui/form-controls";
import { PREVIEW_LIMIT,cats } from "@/features/services/services.rules";

import type { ServicesPageVm } from "./use-services-page";

export function ServicesHistorySection({
  sectionTab,
  hCat,
  setHCat,
  hStatus,
  setHStatus,
  hFrom,
  setHFrom,
  histAll,
  hFiltrados,
  setHistAll,
}: Pick<
  ServicesPageVm,
  | "sectionTab"
  | "hCat"
  | "setHCat"
  | "hStatus"
  | "setHStatus"
  | "hFrom"
  | "setHFrom"
  | "histAll"
  | "hFiltrados"
  | "setHistAll"
>) {
  return (
    <>
      {sectionTab === "historial" && (
        <Card className="p-0 overflow-hidden">
          <div className="px-5 py-4 border-b">
            <h3 className="font-semibold text-sm flex items-center gap-2 mb-3">
              <Filter size={14} className="text-muted-foreground" />
              Historial de transacciones
            </h3>
            <div className="flex flex-wrap gap-2 items-center">
              <div className="relative">
                <Search
                  size={12}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
                />
                <Input
                  placeholder="Buscar servicio..."
                  className="h-8 pl-7 text-xs max-w-[160px]"
                />
              </div>
              <select
                className="h-8 px-2 rounded border bg-card text-xs"
                value={hCat}
                onChange={(e) => setHCat(e.target.value)}
              >
                <option value="Todas">Categoria: todas</option>
                {cats
                  .filter((c) => c !== "Todos")
                  .map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
              </select>
              <select
                className="h-8 px-2 rounded border bg-card text-xs"
                value={hStatus}
                onChange={(e) => setHStatus(e.target.value)}
              >
                <option value="Todos">Estado: todos</option>
                <option value="Pagado">Pagado</option>
                <option value="Vencido">Vencido</option>
                <option value="Cancelado">Cancelado</option>
              </select>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <span>Desde:</span>
                <input
                  type="date"
                  className="h-8 px-2 rounded border bg-card text-xs"
                  value={hFrom}
                  onChange={(e) => setHFrom(e.target.value)}
                />
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[11px] uppercase tracking-wide text-muted-foreground border-b bg-muted/30">
                  <th className="text-left px-5 py-2.5">Fecha</th>
                  <th className="text-left px-5 py-2.5">Servicio</th>
                  <th className="text-left px-5 py-2.5">Categoria</th>
                  <th className="text-right px-5 py-2.5">Monto</th>
                  <th className="text-right px-5 py-2.5">Estado</th>
                </tr>
              </thead>
              <tbody>
                {(histAll ? hFiltrados : hFiltrados.slice(0, PREVIEW_LIMIT)).map((t, i) => (
                  <tr key={i} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="px-5 py-3 text-xs text-muted-foreground">{t.f}</td>
                    <td className="px-5 py-3 font-semibold text-sm">{t.s}</td>
                    <td className="px-5 py-3 text-xs text-muted-foreground">{t.cat}</td>
                    <td className="px-5 py-3 font-mono tabular-nums text-right font-semibold">
                      {t.m}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <Badge
                        tone={
                          t.e === "Pagado" ? "success" : t.e === "Cancelado" ? "neutral" : "danger"
                        }
                      >
                        {t.e}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {hFiltrados.length > PREVIEW_LIMIT && (
            <button
              onClick={() => setHistAll(!histAll)}
              className="w-full text-center text-xs font-semibold text-primary pt-3 pb-1 hover:opacity-80 transition border-t border-border mt-1"
            >
              {histAll ? "Mostrar menos" : `Ver todos (${hFiltrados.length})`}
            </button>
          )}
        </Card>
      )}
    </>
  );
}
