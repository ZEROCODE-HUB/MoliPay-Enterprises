import { Pagination } from "@/shared/ui/pagination";
import { FileText,Eye,Share2 } from "lucide-react";
import { Card } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { userMessage } from "@/shared/lib/errors";
import {
LINE_KIND_STYLE,
STATUS_LABEL,
STATUS_TONE,
formatSignedMoney,
lineLabel,
operationLabel,
} from "../history.rules";
import { formatLineDate } from "./history-export";

import type { HistoryPageVm } from "./use-history-page";

export function TransactionLinesTable({
  linesQuery,
  loading,
  lines,
  setSearchTxid,
  openDetail,
  downloadLineReceipt,
  shareLineReceipt,
  total,
  page,
  pageSize,
  setPage,
  totalPages,
}: Pick<
  HistoryPageVm,
  | "linesQuery"
  | "loading"
  | "lines"
  | "setSearchTxid"
  | "openDetail"
  | "downloadLineReceipt"
  | "shareLineReceipt"
  | "total"
  | "page"
  | "pageSize"
  | "setPage"
  | "totalPages"
>) {
  return (
    <Card className="p-0">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs uppercase tracking-wide text-muted-foreground border-b bg-muted/30">
              <th className="text-left px-4 py-3 font-semibold">Legajo</th>
              <th className="text-left px-4 py-3 font-semibold">ID transacción</th>
              <th className="text-left px-4 py-3 font-semibold">Tipo</th>
              <th className="text-left px-4 py-3 font-semibold">CVU</th>
              <th className="text-left px-4 py-3 font-semibold">Email</th>
              <th className="text-left px-4 py-3 font-semibold">Nombre</th>
              <th className="text-left px-4 py-3 font-semibold">Nombre destino</th>
              <th className="text-left px-4 py-3 font-semibold">CUIT</th>
              <th className="text-right px-4 py-3 font-semibold">Monto</th>
              <th className="text-left px-4 py-3 font-semibold">Fecha</th>
              <th className="text-left px-4 py-3 font-semibold">Estado</th>
              <th className="px-4 py-3 font-semibold text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {linesQuery.isError && (
              <tr>
                <td colSpan={12} className="text-center py-12 text-sm text-destructive">
                  {userMessage(linesQuery.error, "No se pudieron cargar los movimientos.")}
                </td>
              </tr>
            )}
            {!loading && !linesQuery.isError && lines.length === 0 && (
              <tr>
                <td colSpan={12} className="text-center py-12 text-sm text-muted-foreground">
                  Sin datos registrados.
                </td>
              </tr>
            )}
            {loading && (
              <tr>
                <td colSpan={12} className="text-center py-12 text-sm text-muted-foreground">
                  Cargando movimientos...
                </td>
              </tr>
            )}
            {!loading &&
              lines.map((l) => {
                return (
                  <tr
                    key={`${l.lineId}:${l.lineNo}`}
                    className="border-b last:border-0 hover:bg-muted/30 transition-colors"
                  >
                    <td className="px-4 py-3 text-xs font-mono tabular-nums whitespace-nowrap">
                      {l.legajo}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => setSearchTxid(l.txid)}
                        className="text-xs font-mono text-muted-foreground hover:text-foreground hover:underline underline-offset-2 text-left"
                        title="Ver todas las líneas de esta operación"
                      >
                        {l.txid}
                      </button>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${LINE_KIND_STYLE[l.lineKind]}`}
                        >
                          {lineLabel(l)}
                        </span>
                      </div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">
                        {operationLabel(l.operationKind)}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs font-mono text-muted-foreground whitespace-nowrap">
                      {l.cvu || "-"}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground truncate max-w-[200px]">
                      {l.email || "-"}
                    </td>
                    <td className="px-4 py-3 text-sm truncate max-w-[180px]">{l.name || "-"}</td>
                    <td className="px-4 py-3 text-sm font-medium truncate max-w-[200px]">
                      {l.recipientName || "-"}
                    </td>
                    <td className="px-4 py-3 text-xs font-mono text-muted-foreground">
                      {l.cuit || "-"}
                    </td>
                    <td
                      className={`px-4 py-3 font-mono tabular-nums text-right font-semibold whitespace-nowrap text-sm ${l.amount.cents >= 0 ? "text-emerald-700" : "text-red-700"}`}
                    >
                      {formatSignedMoney(l.amount)}
                    </td>
                    <td className="px-4 py-3 text-xs font-mono text-muted-foreground whitespace-nowrap">
                      {formatLineDate(l.occurredAt)}
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={STATUS_TONE[l.status]}>{STATUS_LABEL[l.status]}</Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex gap-1.5 justify-end">
                        <button
                          title="Ver detalle de la operación"
                          onClick={() => void openDetail(l)}
                          className="h-8 w-8 inline-flex items-center justify-center rounded-lg border bg-card hover:bg-accent hover:border-primary/40 transition"
                        >
                          <Eye size={14} />
                        </button>
                        <button
                          title="Descargar comprobante"
                          onClick={() => void downloadLineReceipt(l)}
                          className="h-8 w-8 inline-flex items-center justify-center rounded-lg border bg-card hover:bg-accent hover:border-primary/40 transition"
                        >
                          <FileText size={14} />
                        </button>
                        <button
                          title="Compartir comprobante"
                          onClick={() => void shareLineReceipt(l)}
                          className="h-8 w-8 inline-flex items-center justify-center rounded-lg border bg-card hover:bg-accent hover:border-primary/40 transition"
                        >
                          <Share2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>

      <Pagination
        className="border-t px-5 py-4"
        page={page}
        pageSize={pageSize}
        total={total}
        onPageChange={setPage}
      />
    </Card>
  );
}
