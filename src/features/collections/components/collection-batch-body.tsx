import { Pagination } from "@/shared/ui/pagination";
import type { Batch,RecordDeBatch } from "@/features/collections/collections.data";
import {
formatARS,
methodPaymentLabels,
statusCatalog,
} from "@/features/collections/collections.data";
import { Copy,ExternalLink,FileSpreadsheet } from "lucide-react";
import { BtnOutline,BtnPrimary } from "@/shared/ui/button";
import { toResolvableLinkPaymentUrl } from "@/shared/lib/pay-url";
import { Card } from "@/shared/ui/card";
import { RECORD_STATUS_BADGE } from "@/features/collections/collection-batch.rules";
import { useState } from "react";
import type { BatchActions } from "./collection-batch-actions";

const PAGE_SIZE = 25;

/** Acciones, datos y registros del lote. El encabezado lo pone quien lo muestra. */
export function CollectionBatchBody({
  batch,
  records,
  generatingLinks,
  detail,
}: {
  batch: Batch;
  records: RecordDeBatch[];
  generatingLinks: boolean;
  detail: BatchActions;
}) {
  const {
    totalRecords,
    collecteds,
    partials,
    pendings,
    overdues,
    withError,
    amountTotal,
    amountCollected,
    pctCollected,
    copyLink,
    exportExcel,
    acciones,
  } = detail;
  const [page, setPage] = useState(1);
  const pageSize = PAGE_SIZE;
  const recordsPaginados = records.slice((page - 1) * pageSize, page * pageSize);

  return (
    <>
      <div className="flex flex-wrap gap-2 mb-6">
        {acciones.map((a) => {
          const Comp = a.variant === "primary" ? BtnPrimary : BtnOutline;
          const extraClass =
            a.variant === "danger" ? "border-red-200 text-red-700 hover:bg-red-50" : "";
          const isLoading =
            generatingLinks && (a.label === "Iniciar lote" || a.label === "Regenerar links");
          return (
            <Comp
              key={a.label}
              className={`h-9 px-3 text-xs ${extraClass}`}
              onClick={a.onClick}
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="inline-flex items-center gap-1.5">
                  <span className="animate-spin inline-block w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full" />
                  Generando…
                </span>
              ) : (
                <>
                  {a.icon} {a.label}
                </>
              )}
            </Comp>
          );
        })}
        <div className="flex-1" />
        <BtnOutline className="h-9 px-3 text-xs" onClick={exportExcel}>
          <FileSpreadsheet size={14} /> Exportar Excel
        </BtnOutline>
      </div>

      {/* 4 bloques de informacion */}
      <div className="grid md:grid-cols-2 gap-4 mb-6">
        {/* Info general */}
        <Card>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
            Informacion general
          </h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">ID</span>
              <span className="font-semibold">{batch.id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Estado</span>
              <span>{statusCatalog[batch.estado]?.label}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Creacion</span>
              <span>{batch.createdAt.slice(0, 10)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Inicio</span>
              <span>{batch.fechaInicio?.slice(0, 10) ?? "-"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Finalizacion</span>
              <span>{batch.fechaFinalizacion?.slice(0, 10) ?? "-"}</span>
            </div>
          </div>
        </Card>

        {/* Estadisticas */}
        <Card>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
            Estadisticas
          </h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total registros</span>
              <span className="font-semibold">{totalRecords}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">% Cobrado</span>
              <span className="font-semibold text-emerald-600">{pctCollected}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Pagos completos</span>
              <span className="font-semibold text-emerald-600">{collecteds}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Pagos parciales</span>
              <span className="font-semibold text-amber-600">{partials}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Pendientes</span>
              <span className="font-semibold text-muted-foreground">{pendings}</span>
            </div>
            {overdues > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Vencidos</span>
                <span className="font-semibold text-red-600">{overdues}</span>
              </div>
            )}
            {withError > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Con error</span>
                <span className="font-semibold text-red-600">{withError}</span>
              </div>
            )}
          </div>
        </Card>

        {/* Configuracion */}
        <Card>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
            Configuracion
          </h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Medios de pago</span>
              <span className="font-semibold text-right max-w-[180px]">
                {batch.mediosPago
                  .map((m) => methodPaymentLabels[m as keyof typeof methodPaymentLabels])
                  .join(", ")}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Pagos parciales</span>
              <span
                className={`font-semibold ${batch.pagosParcialesHabilitado ? "text-emerald-600" : "text-muted-foreground"}`}
              >
                {batch.pagosParcialesHabilitado ? "Habilitados" : "Deshabilitados"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Notificaciones</span>
              <span
                className={`font-semibold ${batch.notificacionesHabilitado ? "text-emerald-600" : "text-muted-foreground"}`}
              >
                {batch.notificacionesHabilitado ? "Habilitadas" : "Deshabilitadas"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Cuenta</span>
              <span className="font-semibold">Operaciones</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tasa interes</span>
              <span className="font-semibold">{batch.tasaInteres}%</span>
            </div>
          </div>
        </Card>

        {/* Montos */}
        <Card>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
            Montos
          </h4>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total</span>
              <span className="font-display tabular-nums font-semibold text-lg">
                {formatARS(amountTotal)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Cobrado</span>
              <span className="font-display tabular-nums font-semibold text-emerald-600">
                {formatARS(amountCollected)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Pendiente</span>
              <span className="font-display tabular-nums font-semibold text-amber-600">
                {formatARS(amountTotal - amountCollected)}
              </span>
            </div>
            <div className="h-3 rounded-full bg-muted overflow-hidden mt-2">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${pctCollected}%` }}
              />
            </div>
            <div className="text-xs text-muted-foreground text-center">{pctCollected}% cobrado</div>
          </div>
        </Card>
      </div>

      {/* Tabla de registros */}
      <Card className="p-0 overflow-hidden">
        <div className="px-5 py-4 border-b flex items-center justify-between">
          <div>
            <div className="font-semibold">Registros del lote</div>
            <div className="text-xs text-muted-foreground">{totalRecords} registros</div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left px-3 py-3 font-semibold text-xs uppercase">Descripcion</th>
                <th className="text-right px-3 py-3 font-semibold text-xs uppercase">Monto</th>
                <th className="text-right px-3 py-3 font-semibold text-xs uppercase">Pagado</th>
                <th className="text-left px-3 py-3 font-semibold text-xs uppercase">Entidad</th>
                <th className="text-left px-3 py-3 font-semibold text-xs uppercase">Usuario</th>
                <th className="text-left px-3 py-3 font-semibold text-xs uppercase">
                  Vencimientos
                </th>
                <th className="text-left px-3 py-3 font-semibold text-xs uppercase">Medios</th>
                <th className="text-left px-3 py-3 font-semibold text-xs uppercase">Estado</th>
                <th className="text-left px-3 py-3 font-semibold text-xs uppercase">Link</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {recordsPaginados.map((r) => {
                return (
                  <tr key={r.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-3 py-3 max-w-[180px]">
                      <div className="font-semibold truncate" title={r.descripcion}>
                        {r.descripcion}
                      </div>
                      <div className="text-[10px] text-muted-foreground font-mono">{r.id}</div>
                    </td>
                    <td className="px-3 py-3 text-right font-semibold whitespace-nowrap">
                      <span className="font-mono tabular-nums">{formatARS(r.monto)}</span>
                    </td>
                    <td className="px-3 py-3 text-right whitespace-nowrap">
                      <span
                        className={
                          r.montoPagado >= r.monto
                            ? "text-emerald-600 font-semibold font-mono tabular-nums"
                            : r.montoPagado > 0
                              ? "text-amber-600 font-semibold font-mono tabular-nums"
                              : "text-muted-foreground font-mono tabular-nums"
                        }
                      >
                        {formatARS(r.montoPagado)}
                      </span>
                    </td>
                    <td
                      className="px-3 py-3 text-xs"
                      title={`${r.tipoEntidad} ${r.idEntidad} - ${r.subEntidad}`}
                    >
                      <div className="font-medium">
                        {r.tipoEntidad} {r.idEntidad}
                      </div>
                      <div className="text-muted-foreground">{r.subEntidad}</div>
                    </td>
                    <td className="px-3 py-3 text-xs">
                      <div className="font-medium">{r.identificacionUsuario}</div>
                      {r.email && (
                        <div
                          className="text-muted-foreground truncate max-w-[120px]"
                          title={r.email}
                        >
                          {r.email}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-3 text-[11px] whitespace-nowrap">
                      <div>1º: {r.fechaVencimiento1?.slice(0, 10) ?? "-"}</div>
                      {r.fechaVencimiento2 && <div>2º: {r.fechaVencimiento2.slice(0, 10)}</div>}
                      {r.fechaVencimiento3 && <div>3º: {r.fechaVencimiento3.slice(0, 10)}</div>}
                    </td>
                    <td className="px-3 py-3 text-[11px]">
                      {(r.mediosPago ?? batch.mediosPago).map((m) => (
                        <span
                          key={m}
                          className="inline-block px-1.5 py-0.5 rounded bg-muted mr-1 mb-0.5"
                        >
                          {methodPaymentLabels[m as keyof typeof methodPaymentLabels]}
                        </span>
                      ))}
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                          RECORD_STATUS_BADGE[r.estado]?.style ?? ""
                        }`}
                      >
                        {RECORD_STATUS_BADGE[r.estado]?.label ?? r.estado}
                      </span>
                      <div className="mt-1 text-[10px] text-muted-foreground">
                        {r.fechaPago && `Pagado: ${r.fechaPago.slice(0, 10)}`}
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      {r.linkDePago ? (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => copyLink(r.linkDePago!)}
                            className="inline-flex items-center justify-center w-7 h-7 rounded hover:bg-muted transition"
                            title="Copiar link"
                          >
                            <Copy size={13} className="text-muted-foreground" />
                          </button>
                          <a
                            href={toResolvableLinkPaymentUrl(r.linkDePago!)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center w-7 h-7 rounded hover:bg-muted transition"
                            title="Abrir link"
                          >
                            <ExternalLink size={13} className="text-muted-foreground" />
                          </a>
                        </div>
                      ) : (
                        <span className="text-[11px] text-muted-foreground">-</span>
                      )}
                      {r.emailEnviado && (
                        <div className="text-[10px] text-emerald-600 mt-0.5">Email enviado</div>
                      )}
                    </td>
                  </tr>
                );
              })}
              {records.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-5 py-8 text-center text-sm text-muted-foreground">
                    No hay registros.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {records.length > pageSize && (
          <Pagination
            page={page}
            pageSize={pageSize}
            total={records.length}
            onPageChange={setPage}
          />
        )}
      </Card>
    </>
  );
}
