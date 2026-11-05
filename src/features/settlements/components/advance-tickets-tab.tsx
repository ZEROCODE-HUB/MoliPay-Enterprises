import { Pagination } from "@/shared/ui/pagination";
import { formatARS } from "@/features/collections/collections.data";
import { BtnOutline,BtnPrimary } from "@/shared/ui/button";
import { Eye,Plus } from "lucide-react";
import { Badge } from "@/shared/ui/badge";
import {
STATUS_TICKET_LABEL,
STATUS_TICKET_TONE,
fmtDateFull,
pendingCompensar,
} from "@/features/settlements/settlements.rules";

import type { SettlementsPageVm } from "./use-settlements-page";

export function AdvanceTicketsTab({
  activeTab,
  tickets,
  openGeneral,
  tickPaginated,
  setAceptoOferta,
  setDetail,
  tickPageSize,
  setTickPageSize,
  setTickPage,
  ROWS_OPTIONS,
  tickPage,
  tickTotalPages,
}: Pick<
  SettlementsPageVm,
  | "activeTab"
  | "tickets"
  | "openGeneral"
  | "tickPaginated"
  | "setAceptoOferta"
  | "setDetail"
  | "tickPageSize"
  | "setTickPageSize"
  | "setTickPage"
  | "ROWS_OPTIONS"
  | "tickPage"
  | "tickTotalPages"
>) {
  return (
    <>
      {activeTab === "tickets" && (
        <div>
          <div className="px-5 py-3 border-b flex items-center justify-between gap-3">
            <div className="text-xs text-muted-foreground">{tickets.length} solicitudes</div>
            <BtnPrimary className="h-9 px-3 text-xs" onClick={openGeneral}>
              <Plus size={14} /> Nuevo ticket
            </BtnPrimary>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="text-left px-5 py-3">Número</th>
                  <th className="text-left px-5 py-3">Fecha</th>
                  <th className="text-right px-5 py-3">Monto pedido</th>
                  <th className="text-right px-5 py-3">Tasa</th>
                  <th className="text-right px-5 py-3">Neto a recibir</th>
                  <th className="text-left px-5 py-3">Estado</th>
                  <th className="text-right px-5 py-3">Pendiente de compensar</th>
                  <th className="text-center px-5 py-3">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {tickets.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-5 py-10 text-center text-sm text-muted-foreground"
                    >
                      Aún no solicitaste adelantos. Elegí un día del calendario o tocá "Solicitar
                      adelanto".
                    </td>
                  </tr>
                ) : (
                  tickPaginated.map((t) => (
                    <tr key={t.id} className="hover:bg-muted/30">
                      <td className="px-5 py-3 font-mono font-semibold">{t.id}</td>
                      <td className="px-5 py-3 text-xs text-muted-foreground">
                        {fmtDateFull(t.fecha)}
                      </td>
                      <td className="px-5 py-3 font-mono tabular-nums text-right font-semibold">
                        {formatARS(t.montoSolicitado)}
                      </td>
                      <td className="px-5 py-3 font-mono tabular-nums text-right text-xs">
                        {t.tasaInteres != null ? `${t.tasaInteres}%` : "—"}
                      </td>
                      <td className="px-5 py-3 font-mono tabular-nums text-right">
                        {t.netoARecibir != null ? formatARS(t.netoARecibir) : "—"}
                      </td>
                      <td className="px-5 py-3">
                        <Badge tone={STATUS_TICKET_TONE[t.estado] ?? "neutral"}>
                          {STATUS_TICKET_LABEL[t.estado] ?? t.estado}
                        </Badge>
                      </td>
                      <td className="px-5 py-3 font-mono tabular-nums text-right text-xs">
                        {t.estado === "acreditado" || t.estado === "compensado"
                          ? formatARS(pendingCompensar(t))
                          : "—"}
                      </td>
                      <td className="px-5 py-3 text-center">
                        <BtnOutline
                          className="h-8 px-2.5 text-xs"
                          onClick={() => {
                            setAceptoOferta(false);
                            setDetail(t);
                          }}
                        >
                          <Eye size={13} /> {t.estado === "aprobado" ? "Ver oferta" : "Ver"}
                        </BtnOutline>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {/* Paginación tickets */}
          {tickets.length > 0 && (
            <Pagination
              page={tickPage}
              pageSize={tickPageSize}
              total={tickets.length}
              onPageChange={setTickPage}
              onPageSizeChange={(n) => {
                setTickPageSize(n);
                setTickPage(1);
              }}
            />
          )}
        </div>
      )}
    </>
  );
}
