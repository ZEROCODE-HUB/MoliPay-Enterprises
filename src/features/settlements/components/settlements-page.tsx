import { ErrorNotice } from "@/shared/ui/error-notice";
import { SettlementsKpis } from "./settlements-kpis";
import { SettlementsTabs } from "./settlements-tabs";
import { AdvanceTicketsTab } from "./advance-tickets-tab";
import { SettlementFeesTab } from "./settlement-fees-tab";
import { AdvanceRequestModal } from "./advance-request-modal";
import { AdvanceDetailModal } from "./advance-detail-modal";
import { useSettlementsPage } from "./use-settlements-page";
import { formatARS } from "@/features/collections/collections.data";
import { PageHeader } from "@/shared/ui/page-header";
import { BtnOutline,BtnPrimary } from "@/shared/ui/button";
import { CalendarDays,CheckCircle2,Download,FileSpreadsheet,Percent,Plus } from "lucide-react";
import { Card } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import "jspdf-autotable";
import { fmtDateFull } from "@/features/settlements/settlements.rules";
import { CalendarioCreditsTab } from "./credit-calendar-tab";
import { BatchesCreditCompanyTab } from "./batches-credit-tab";
import { BatchesSaleCompanyTab } from "./batches-sale-tab";
import { ChargebacksCompanyTab } from "./chargebacks-tab";

export function SettlementsPage() {
  const vm = useSettlementsPage();
  const {
    loading,
    faltaCollect,
    byCredit,
    advancesEnCurso,
    available,
    merchantId,
    tickets,
    taxes,
    excepciones,
    setSelectedDate,
    activeTab,
    setActiveTab,
    setDetail,
    res,
    openForDate,
    openGeneral,
    exportExcel,
    exportPDF,
  } = vm;

  return (
    <>
      <PageHeader
        title="SettlementsPage"
        description="Cuánta plata te falta cobrar, cuánto tenés por acreditar y calendario de acreditaciones. Solicitá el adelanto ahí mismo."
        action={
          <div className="flex gap-2">
            <BtnOutline onClick={exportExcel}>
              <FileSpreadsheet size={14} /> Excel
            </BtnOutline>
            <BtnOutline onClick={exportPDF}>
              <Download size={14} /> PDF
            </BtnOutline>
            <BtnPrimary onClick={openGeneral}>
              <Plus size={14} /> Solicitar adelanto
            </BtnPrimary>
          </div>
        }
      />

      {res?.saldo_negativo && (
        <ErrorNotice className="mb-4" icon={false}>
          Tenés una deuda de <b className="font-mono">{formatARS(res.deuda_contracargos)}</b> por
          contracargos o liquidaciones negativas. Se descuenta automáticamente de tus próximas
          acreditaciones y, mientras exista, los retiros pueden estar bloqueados.{" "}
          <button className="underline font-semibold" onClick={() => setActiveTab("contracargos")}>
            Ver contracargos
          </button>
        </ErrorNotice>
      )}

      {/* KPIs: saldo, pendiente de acreditación, próxima acreditación, adelanto a compensar */}
      <SettlementsKpis {...vm} />

      {/* Últimas 5 acreditaciones y próximas 5 programadas */}
      <div className="grid md:grid-cols-2 gap-3 mb-6">
        <Card>
          <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
            <CheckCircle2 size={12} /> Últimas acreditaciones
          </div>
          {(res?.ultimas_acreditaciones ?? []).length === 0 ? (
            <p className="text-xs text-muted-foreground">Todavía no tenés acreditaciones.</p>
          ) : (
            <div className="divide-y text-sm">
              {res!.ultimas_acreditaciones.map((a) => (
                <div key={a.lote_id} className="flex items-center justify-between py-1.5">
                  <span className="text-xs">
                    {fmtDateFull(a.fecha_acreditacion)} · <Badge tone="neutral">{a.bandera}</Badge>
                  </span>
                  <span className="font-mono font-semibold text-emerald-700">
                    {formatARS(a.neto)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
        <Card>
          <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
            <CalendarDays size={12} /> Próximas acreditaciones
          </div>
          {(res?.proximas_acreditaciones ?? []).length === 0 ? (
            <p className="text-xs text-muted-foreground">No hay acreditaciones programadas.</p>
          ) : (
            <div className="divide-y text-sm">
              {res!.proximas_acreditaciones.map((a) => (
                <div key={a.lote_id} className="flex items-center justify-between py-1.5">
                  <span className="text-xs">
                    {fmtDateFull(a.fecha)} · <Badge tone="neutral">{a.bandera}</Badge>
                  </span>
                  <span className="font-mono font-semibold">{formatARS(a.neto)}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Sección combinada: Calendario + Tickets */}
      <Card className="mb-6 p-0">
        {/* Tabs header */}
        <SettlementsTabs {...vm} />

        {/* Tab: Calendario — grilla mensual 7×N con desglose por día */}
        {activeTab === "calendario" && (
          <CalendarioCreditsTab
            comercioId={merchantId}
            loading={loading}
            faltaCobrar={faltaCollect}
            porAcreditar={byCredit}
            adelantosEnCurso={advancesEnCurso}
            disponible={available}
            tickets={tickets}
            onSelectDate={(d) => openForDate(d)}
            onClearSelection={() => setSelectedDate(null)}
            onOpenGeneral={openGeneral}
            onOpenDetalle={setDetail}
          />
        )}

        {/* Tab: Tickets */}
        <AdvanceTicketsTab {...vm} />

        {/* Tab: Acreditaciones (historial de lotes ya Acreditados) */}
        {activeTab === "acreditaciones" && <BatchesCreditCompanyTab />}

        {/* Tab: Lotes de venta */}
        {activeTab === "lotes-venta" && <BatchesSaleCompanyTab />}

        {/* Tab: Contracargos */}
        {activeTab === "contracargos" && <ChargebacksCompanyTab />}

        {/* Tab: Comisiones por bandera y cuota */}
        <SettlementFeesTab {...vm} />
      </Card>

      {/* Sección: Impuestos aplicables (solo Externo) */}
      {taxes.length > 0 && (
        <Card className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Percent size={16} className="text-muted-foreground" />
            <h3 className="font-semibold text-sm">Impuestos aplicables a tu comercio</h3>
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            Solo se muestran impuestos de ámbito Externo. Los impuestos internos de MoliPay no se
            visualizan.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="text-left px-4 py-2">Código</th>
                  <th className="text-left px-4 py-2">Descripción</th>
                  <th className="text-right px-4 py-2">Tipo</th>
                  <th className="text-right px-4 py-2">Alicuota / Fijo</th>
                  <th className="text-center px-4 py-2">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {taxes.map((imp) => {
                  const exento = excepciones.find(
                    (e) => e.impuestoCodigo === imp.codigo && e.estado === "Activo",
                  );
                  return (
                    <tr key={imp.id} className="hover:bg-muted/30">
                      <td className="px-4 py-2 font-mono text-xs">{imp.codigo}</td>
                      <td className="px-4 py-2 text-xs">{imp.descripcion}</td>
                      <td className="px-4 py-2 text-right text-xs">{imp.tipo}</td>
                      <td className="px-4 py-2 text-right font-mono text-xs tabular-nums">
                        {imp.tipo === "Porcentaje" ? `${imp.alicuota}%` : formatARS(imp.alicuota)}
                      </td>
                      <td className="px-4 py-2 text-center">
                        {exento ? (
                          <Badge tone="success">Exento</Badge>
                        ) : (
                          <Badge tone={imp.estado === "Activo" ? "warn" : "neutral"}>
                            {imp.estado}
                          </Badge>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {excepciones.length > 0 && (
            <div className="mt-3 border-t pt-3">
              <div className="text-xs font-semibold text-muted-foreground mb-1">
                Excepciones activas
              </div>
              {excepciones.map((exc, idx) => (
                <div key={idx} className="flex items-center gap-2 text-xs">
                  <Badge tone="success">Exento</Badge>
                  <span>
                    {exc.impuestoCodigo} — {exc.motivo}
                  </span>
                  {exc.vigenciaHasta && (
                    <span className="text-muted-foreground">
                      (hasta {fmtDateFull(exc.vigenciaHasta)})
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      <AdvanceRequestModal {...vm} />

      {/* Modal detalle ticket */}
      <AdvanceDetailModal {...vm} />
    </>
  );
}
