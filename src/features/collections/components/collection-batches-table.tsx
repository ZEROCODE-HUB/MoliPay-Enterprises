import { formatARS } from "@/features/collections/collections.data";
import { BtnOutline } from "@/shared/ui/button";
import { Eye } from "lucide-react";
import { Card } from "@/shared/ui/card";
import { STATUS_LABEL } from "@/features/collections/collections-management.rules";
import { STATUS_STYLES as STATUS_BADGE } from "@/features/collections/collection-batch.rules";

import type { CollectionsManagementPageVm } from "./use-collections-management-page";

export function CollectionBatchesTable({
  paginated,
  openDetail,
  batches,
}: Pick<CollectionsManagementPageVm, "paginated" | "openDetail" | "batches">) {
  return (
    <Card className="p-0 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="text-left px-5 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">
                Nombre
              </th>
              <th className="text-left px-5 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">
                Fecha creacion
              </th>
              <th className="text-left px-5 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">
                Finalizacion
              </th>
              <th className="text-left px-5 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">
                Estado
              </th>
              <th className="text-left px-5 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">
                Progreso
              </th>
              <th className="text-right px-5 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">
                Pagos
              </th>
              <th className="text-right px-5 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">
                Parciales
              </th>
              <th className="text-right px-5 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">
                Pend.
              </th>
              <th className="text-right px-5 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">
                Monto total
              </th>
              <th className="text-right px-5 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">
                Cobrado
              </th>
              <th className="text-right px-5 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">
                Por cobrar
              </th>
              <th className="text-center px-5 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">
                Accion
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {paginated.map((l) => (
              <tr key={l.id} className="hover:bg-muted/30 transition-colors">
                <td className="px-5 py-3 font-semibold">{l.nombre}</td>
                <td className="px-5 py-3 text-xs text-muted-foreground">
                  {l.createdAt.slice(0, 10)}
                </td>
                <td className="px-5 py-3 text-xs text-muted-foreground">
                  {l.fechaFinalizacion?.slice(0, 10) ?? "-"}
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
                    <div className="w-16 h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${l.progreso}%` }}
                      />
                    </div>
                    <span className="text-xs font-semibold">{l.progreso}%</span>
                  </div>
                </td>
                <td className="px-5 py-3 font-mono tabular-nums text-right">{l.cantidadPagos}</td>
                <td className="px-5 py-3 font-mono tabular-nums text-right text-amber-600">
                  {l.cantidadParciales}
                </td>
                <td className="px-5 py-3 font-mono tabular-nums text-right text-muted-foreground">
                  {l.cantidadPendientes}
                </td>
                <td className="px-5 py-3 font-mono tabular-nums text-right font-semibold">
                  {formatARS(l.montoTotal)}
                </td>
                <td className="px-5 py-3 font-mono tabular-nums text-right text-emerald-600 font-semibold">
                  {formatARS(l.montoCobrado)}
                </td>
                <td className="px-5 py-3 font-mono tabular-nums text-right text-amber-600 font-semibold">
                  {formatARS(l.montoPorCobrar)}
                </td>
                <td className="px-5 py-3 text-center">
                  <BtnOutline
                    onClick={() => openDetail(l.id)}
                    className="h-8 px-2.5 text-xs"
                    title="Ver detalle"
                  >
                    <Eye size={14} /> Ver
                  </BtnOutline>
                </td>
              </tr>
            ))}
            {batches.length === 0 && (
              <tr>
                <td colSpan={12} className="px-5 py-8 text-center text-sm text-muted-foreground">
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
