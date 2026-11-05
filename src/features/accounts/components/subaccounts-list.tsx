import { Pagination } from "@/shared/ui/pagination";
import {
Eye,
Pencil,
Trash2,
ArrowLeftRight,
Pause,
Play,
Copy,
History,
SlidersHorizontal,
} from "lucide-react";
import { Card } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { formatMoneyAmount } from "@/shared/lib/money";
import { RowMenu } from "./row-menu";
import { KIND_LABEL,copiarCvu,esPool,fmtLimit } from "./subaccount-view";

import type { SubaccountsPageVm } from "./use-subaccounts-page";

export function SubaccountsList({
  loading,
  paginated,
  menuId,
  setMenuId,
  setDetailSub,
  openFondeo,
  verHistory,
  openEdit,
  changeStatus,
  setConfirmDelete,
  filtradas,
  page,
  pageSize,
  setPage,
  totalPages,
}: Pick<
  SubaccountsPageVm,
  | "loading"
  | "paginated"
  | "menuId"
  | "setMenuId"
  | "setDetailSub"
  | "openFondeo"
  | "verHistory"
  | "openEdit"
  | "changeStatus"
  | "setConfirmDelete"
  | "filtradas"
  | "page"
  | "pageSize"
  | "setPage"
  | "totalPages"
>) {
  return (
    <>
      {loading ? (
        <Card className="p-6 text-sm text-muted-foreground">Cargando subcuentas…</Card>
      ) : (
        <Card className="p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[11px] uppercase tracking-wide text-muted-foreground border-b bg-muted/30">
                  <th className="text-left px-4 py-2.5">Tipo</th>
                  <th className="text-left px-4 py-2.5">Nombre / Identificador</th>
                  <th className="text-left px-4 py-2.5">CVU</th>
                  <th className="text-right px-4 py-2.5">Saldo</th>
                  <th className="text-right px-4 py-2.5">Límite diario</th>
                  <th className="text-left px-4 py-2.5">Estado</th>
                  <th className="text-right px-4 py-2.5">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((s) => {
                  const holder = [s.n, s.apellido].filter(Boolean).join(" ");
                  return (
                    <tr key={s.id ?? s.n} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex flex-col items-start gap-0.5">
                          <Badge tone={esPool(s) ? "warn" : "neutral"}>
                            {esPool(s) ? "Pool" : "Individual"}
                          </Badge>
                          <span className="text-[11px] text-muted-foreground">
                            {KIND_LABEL[s.tipo] ?? s.tipo}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 min-w-[160px]">
                        <div className="font-semibold">{holder || "Sin nombre"}</div>
                        {s.email && (
                          <div className="text-xs text-muted-foreground truncate max-w-[220px]">
                            {s.email}
                          </div>
                        )}
                        {!s.email && esPool(s) && (
                          <div className="text-xs text-muted-foreground">Subcuenta del sistema</div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {s.cbu ? (
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-xs" title={s.cbu}>
                              {s.cbu}
                            </span>
                            <button
                              onClick={() => copiarCvu(s.cbu)}
                              className="h-6 w-6 shrink-0 inline-flex items-center justify-center rounded hover:bg-muted text-muted-foreground hover:text-foreground transition"
                              title="Copiar CVU"
                            >
                              <Copy size={12} />
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">Sin CVU</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <div className="font-display tabular-nums font-semibold">
                          {formatMoneyAmount(s.disp)}
                        </div>
                        {s.ret.cents > 0 && (
                          <div className="text-[11px] text-muted-foreground tabular-nums">
                            Retenido {formatMoneyAmount(s.ret)}
                          </div>
                        )}
                      </td>
                      <td
                        className={`px-4 py-3 text-right whitespace-nowrap tabular-nums ${s.lim ? "" : "text-muted-foreground"}`}
                      >
                        {fmtLimit(s.lim)}
                      </td>
                      <td className="px-4 py-3">
                        <Badge tone={s.e === "Activa" ? "success" : "warn"}>{s.e}</Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <RowMenu
                          open={menuId === s.id}
                          onToggle={() =>
                            setMenuId((cur) => (cur === s.id ? null : (s.id ?? null)))
                          }
                          onClose={() => setMenuId(null)}
                          items={[
                            {
                              icon: <Eye size={14} />,
                              label: "Ver detalle",
                              onClick: () => setDetailSub(s),
                            },
                            {
                              icon: <ArrowLeftRight size={14} />,
                              label: esPool(s)
                                ? "Transferir desde el pool"
                                : "Fondear / transferir",
                              onClick: () => openFondeo(s),
                            },
                            {
                              icon: <Copy size={14} />,
                              label: "Copiar CVU",
                              onClick: () => copiarCvu(s.cbu),
                            },
                            {
                              icon: <History size={14} />,
                              label: "Ver historial",
                              onClick: () => verHistory(s),
                            },
                            {
                              icon: <SlidersHorizontal size={14} />,
                              label: "Configurar límites y responsable",
                              onClick: () => openEdit(s),
                            },
                            {
                              icon: <Pencil size={14} />,
                              label: "Editar datos",
                              onClick: () => openEdit(s),
                            },
                            {
                              icon: s.e === "Activa" ? <Pause size={14} /> : <Play size={14} />,
                              label: s.e === "Activa" ? "Pausar subcuenta" : "Reactivar subcuenta",
                              onClick: () =>
                                changeStatus(s.id!, s.e === "Activa" ? "Pausada" : "Activa"),
                            },
                            {
                              icon: <Trash2 size={14} />,
                              label: "Eliminar",
                              danger: true,
                              onClick: () => setConfirmDelete(s),
                            },
                          ]}
                        />
                      </td>
                    </tr>
                  );
                })}
                {paginated.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-sm text-muted-foreground">
                      No hay subcuentas para mostrar.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <Pagination
            className="border-t px-4 py-3"
            page={page}
            pageSize={pageSize}
            total={filtradas.length}
            onPageChange={setPage}
          />
        </Card>
      )}
    </>
  );
}
