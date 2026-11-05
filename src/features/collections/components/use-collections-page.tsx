import { useNavigate } from "@tanstack/react-router";
import { useState,useEffect } from "react";
import {
periodFilter,
computeDashboardKPI,
computeByMethod,
computeByDue,
computeNoCobradas,
computeTrend,
computeBatchesRecents,
formatARS,
methodPaymentLabels,
type PeriodFilter,
type DashboardKPI,
type MethodPaymentData,
type DueData,
type NoCobradasData,
type TrendData,
type BatchSummary,
} from "@/features/collections/collections.data";
import jsPDF from "jspdf";
import "jspdf-autotable";
import { downloadXlsx } from "@/shared/lib/download";

/** Estado y acciones de CollectionsPage: el componente solo dibuja. */
export function useCollectionsPage() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<PeriodFilter>(periodFilter("30 dias", 30));
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  const [kpi, setKpi] = useState<DashboardKPI>({
    totalLotes: 0,
    enProceso: 0,
    finalizados: 0,
    conError: 0,
    montoTotal: 0,
    montoCobrado: 0,
    montoPendiente: 0,
  });
  const [byMethod, setByMethod] = useState<MethodPaymentData[]>([]);
  const [byDue, setByDue] = useState<DueData[]>([]);
  const [noCobradas, setNoCobradas] = useState<NoCobradasData>({
    totalOperaciones: 0,
    vencidas: 0,
    vigentes: 0,
    montoNoCobrado: 0,
    porcentajeNoCobrado: 0,
  });
  const [trend, setTrend] = useState<TrendData[]>([]);
  const [batchesRecents, setBatchesRecents] = useState<BatchSummary[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [k, pm, pv, nc, ev, lr] = await Promise.all([
        computeDashboardKPI(filter),
        computeByMethod(filter),
        computeByDue(filter),
        computeNoCobradas(filter),
        computeTrend(filter),
        computeBatchesRecents(filter),
      ]);
      if (!cancelled) {
        setKpi(k);
        setByMethod(pm);
        setByDue(pv);
        setNoCobradas(nc);
        setTrend(ev);
        setBatchesRecents(lr);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [filter]);

  const exportExcel = () => {
    downloadXlsx(
      `cobros-masivos-dashboard-${filter.label}.xlsx`,
      [
        { Metrica: "Total de lotes", Valor: kpi.totalLotes },
        { Metrica: "En proceso", Valor: kpi.enProceso },
        { Metrica: "Finalizados", Valor: kpi.finalizados },
        { Metrica: "Con error", Valor: kpi.conError },
        { Metrica: "Monto total", Valor: formatARS(kpi.montoTotal) },
        { Metrica: "Monto cobrado", Valor: formatARS(kpi.montoCobrado) },
        { Metrica: "Monto pendiente", Valor: formatARS(kpi.montoPendiente) },
        ...byMethod.map((m) => ({
          Metrica: `Monto ${methodPaymentLabels[m.medio as keyof typeof methodPaymentLabels] || m.medio}`,
          Valor: formatARS(m.monto),
        })),
        ...byDue.map((v) => ({
          Metrica: v.label,
          Valor: `${v.cantidad} ops - ${formatARS(v.monto)}`,
        })),
        {
          Metrica: "Operaciones no cobradas",
          Valor: `${noCobradas.porcentajeNoCobrado}% - ${formatARS(noCobradas.montoNoCobrado)}`,
        },
      ],
      { sheetName: "CollectionsPage" },
    );
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.text("CollectionsPage - Cobros Masivos", 14, 20);
    doc.text(`Periodo: ${filter.label}`, 14, 30);
    const body = [
      ["Total de lotes", String(kpi.totalLotes)],
      ["En proceso", String(kpi.enProceso)],
      ["Finalizados", String(kpi.finalizados)],
      ["Con error", String(kpi.conError)],
      ["Monto total", formatARS(kpi.montoTotal)],
      ["Monto cobrado", formatARS(kpi.montoCobrado)],
      ["Monto pendiente", formatARS(kpi.montoPendiente)],
      [
        "Tasa de cobranza",
        kpi.montoTotal > 0 ? `${Math.round((kpi.montoCobrado / kpi.montoTotal) * 100)}%` : "0%",
      ],
    ];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (doc as any).autoTable({ startY: 38, head: [["Metrica", "Valor"]], body });
    doc.save(`cobros-masivos-dashboard-${filter.label}.pdf`);
  };
  return {
    navigate,
    filter,
    setFilter,
    customFrom,
    setCustomFrom,
    customTo,
    setCustomTo,
    kpi,
    byMethod,
    byDue,
    noCobradas,
    trend,
    batchesRecents,
    exportExcel,
    exportPDF,
  };
}

export type CollectionsPageVm = ReturnType<typeof useCollectionsPage>;
