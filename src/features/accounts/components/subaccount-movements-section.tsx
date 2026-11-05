import { ArrowDownLeft,ArrowUpRight,Download,Filter,ChevronUp,History } from "lucide-react";
import { BtnOutline } from "@/shared/ui/button";
import { Input } from "@/shared/ui/form-controls";
import { fmtMov } from "./subaccount-view";

import type { SubaccountDetailModalVm } from "./use-subaccount-detail-modal";

export function SubaccountMovementsSection({
  onVerHistory,
  downloadReport,
  setFilterOpen,
  filterOpen,
  filterSearch,
  setFilterSearch,
  filterKind,
  setFilterKind,
  filtMoves,
  allMoves,
  loadingMoves,
}: Pick<
  SubaccountDetailModalVm,
  | "onVerHistory"
  | "downloadReport"
  | "setFilterOpen"
  | "filterOpen"
  | "filterSearch"
  | "setFilterSearch"
  | "filterKind"
  | "setFilterKind"
  | "filtMoves"
  | "allMoves"
  | "loadingMoves"
>) {
  return (
    <section>
      <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
        <h3 className="text-sm font-semibold">Historial de movimientos</h3>
        <div className="flex gap-2">
          <BtnOutline className="h-8 px-3 text-[11px]" onClick={onVerHistory}>
            <History size={12} /> HISTORIAL COMPLETO
          </BtnOutline>
          <BtnOutline className="h-8 px-3 text-[11px]" onClick={() => downloadReport("excel")}>
            <Download size={12} /> EXCEL
          </BtnOutline>
          <BtnOutline className="h-8 px-3 text-[11px]" onClick={() => downloadReport("pdf")}>
            <Download size={12} /> PDF
          </BtnOutline>
          <BtnOutline className="h-8 px-3 text-[11px]" onClick={() => setFilterOpen(!filterOpen)}>
            <Filter size={12} /> FILTRAR
            {filterOpen && <ChevronUp size={11} className="ml-1" />}
          </BtnOutline>
        </div>
      </div>

      {filterOpen && (
        <div className="mb-3 p-3 bg-muted/30 rounded-lg border space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3">
            <div>
              <label className="block text-[10px] uppercase tracking-wide text-muted-foreground mb-1">
                Buscar
              </label>
              <Input
                value={filterSearch}
                onChange={(e) => setFilterSearch(e.target.value)}
                placeholder="TXID, CVU o entidad..."
                className="h-9 text-sm w-full"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-wide text-muted-foreground mb-1">
                Tipo
              </label>
              <select
                value={filterKind}
                onChange={(e) => setFilterKind(e.target.value as "todos" | "ingreso" | "egreso")}
                className="h-9 px-3 rounded-md border bg-card text-sm w-full"
              >
                <option value="todos">Todos</option>
                <option value="ingreso">Ingresos</option>
                <option value="egreso">Egresos</option>
              </select>
            </div>
          </div>
          {filtMoves.length < allMoves.length && (
            <p className="text-[11px] text-muted-foreground">
              {filtMoves.length} de {allMoves.length} movimientos
            </p>
          )}
        </div>
      )}

      <div className="max-h-[280px] overflow-y-auto border rounded-lg divide-y">
        {loadingMoves ? (
          <p className="p-4 text-sm text-muted-foreground text-center">Cargando movimientos…</p>
        ) : filtMoves.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground text-center">
            Sin movimientos registrados
          </p>
        ) : (
          filtMoves.map((m, i) => (
            <div key={i} className="flex items-start gap-3 p-3 hover:bg-muted/30 transition">
              <span
                className="mt-0.5 h-8 w-8 shrink-0 rounded-full inline-flex items-center justify-center text-xs"
                style={{
                  background:
                    m.tipo === "ingreso" ? "rgba(5,150,105,0.12)" : "rgba(220,38,38,0.12)",
                }}
              >
                {m.tipo === "ingreso" ? (
                  <ArrowDownLeft size={15} className="text-emerald-700" />
                ) : (
                  <ArrowUpRight size={15} className="text-red-700" />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <p className="text-sm font-semibold">{m.titulo}</p>
                    <p className="text-[11px] font-mono text-muted-foreground mt-0.5">{m.txid}</p>
                  </div>
                  <span
                    className={`font-mono tabular-nums text-sm font-semibold whitespace-nowrap shrink-0 ${m.tipo === "ingreso" ? "text-emerald-700" : "text-red-700"}`}
                  >
                    {fmtMov(m)}
                  </span>
                </div>
                <div className="text-[11px] text-muted-foreground mt-1 flex flex-wrap gap-x-4 gap-y-0.5">
                  <span>CVU contraparte: {m.cbu}</span>
                  <span>{m.entidad}</span>
                  <span>
                    {m.fecha} · {m.hora}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
