import { Eye } from "lucide-react";
import { Card } from "@/shared/ui/card";
import { BtnOutline } from "@/shared/ui/button";
import { formatARS } from "@/features/collections/collections.data";
import { STATUS_BADGE } from "@/features/collections/collections.rules";
import { STATUS_LABEL } from "@/features/collections/collections-management.rules";
import type { CollectionsPageVm } from "./use-collections-page";

export function CollectionsRecentBatches({
  batchesRecents,
  navigate,
}: Pick<CollectionsPageVm, "batchesRecents" | "navigate">) {
  return (
    <Card className="p-0 overflow-hidden">
      <div className="px-5 py-4 border-b flex items-center justify-between">
        <div>
          <div className="font-semibold">Lotes recientes</div>
          <div className="text-xs text-muted-foreground">
            {batchesRecents.length} lotes en el periodo seleccionado
          </div>
        </div>
        <BtnOutline
          className="h-9 px-3 text-xs"
          onClick={() => navigate({ to: "/app/cobros/gestion" })}
        >
          Ver todos
        </BtnOutline>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="text-left px-5 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">
                Nombre / Monto
              </th>
              <th className="text-left px-5 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">
                Estado
              </th>
              <th className="text-left px-5 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">
                Progreso
              </th>
              <th className="text-right px-5 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">
                Monto total
              </th>
              <th className="text-right px-5 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">
                Cobrado
              </th>
              <th className="text-right px-5 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">
                Pendiente
              </th>
              <th className="text-center px-5 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">
                Accion
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {batchesRecents.slice(0, 10).map((l) => (
              <tr key={l.id} className="hover:bg-muted/30 transition-colors">
                <td className="px-5 py-3">
                  <div className="font-semibold">{l.nombre}</div>
                  <div className="text-xs text-muted-foreground">
                    {l.cantidadPagos + l.cantidadParciales + l.cantidadPendientes} registros
                  </div>
                </td>
                <td className="px-5 py-3">
                  <span
                    className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                      STATUS_BADGE[l.estado]
                    }`}
                  >
                    {STATUS_LABEL[l.estado]}
                  </span>
                </td>
                <td className="px-5 py-3">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden max-w-[100px]">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${l.progreso}%` }}
                      />
                    </div>
                    <span className="text-xs font-semibold min-w-[3rem]">{l.progreso}%</span>
                  </div>
                </td>
                <td className="px-5 py-3 font-mono tabular-nums text-right font-semibold">
                  {formatARS(l.montoTotal)}
                </td>
                <td className="px-5 py-3 font-mono tabular-nums text-right text-emerald-600 font-semibold">
                  {formatARS(l.montoCobrado)}
                </td>
                <td className="px-5 py-3 font-mono tabular-nums text-right text-amber-600 font-semibold">
                  {formatARS(l.montoTotal - l.montoCobrado)}
                </td>
                <td className="px-5 py-3 text-center">
                  <button
                    onClick={() => navigate({ to: "/app/cobros/lote/$id", params: { id: l.id } })}
                    className="inline-flex items-center justify-center w-8 h-8 rounded-md hover:bg-muted transition"
                    title="Ver detalle"
                  >
                    <Eye size={15} className="text-muted-foreground" />
                  </button>
                </td>
              </tr>
            ))}
            {batchesRecents.length === 0 && (
              <tr>
                <td colSpan={7} className="px-5 py-8 text-center text-sm text-muted-foreground">
                  No hay registros.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
