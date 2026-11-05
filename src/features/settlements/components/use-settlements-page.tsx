import { useConfirm } from "@/shared/ui/confirm-provider";
import { userMessage } from "@/shared/lib/errors";
import {
useAdvanceActions,
useAdvanceableOperations,
useSettlementsOverview,
useSettlementsSummary,
} from "../settlements.hooks";
import jsPDF from "jspdf";
import { useState } from "react";
import { toast } from "sonner";
import { downloadXlsx } from "@/shared/lib/download";
import { formatARS } from "@/features/collections/collections.data";
import "jspdf-autotable";
import {
type TabSection,
type Ticket,
type TicketStatus,
} from "@/features/settlements/settlements.types";
import {
STATUS_TICKET_LABEL,
fmtDateFull,
} from "@/features/settlements/settlements.rules";

/** Estado y acciones de SettlementsPage: el componente solo dibuja. */
export function useSettlementsPage() {
  const askConfirm = useConfirm();
  const overviewQuery = useSettlementsOverview();
  const loading = overviewQuery.isLoading;
  const {
    pendingCollection: faltaCollect,
    toCredit: byCredit,
    advancesInProgress: advancesEnCurso,
    availableForAdvance: available,
    advanceCap: cap,
    merchantId,
    days,
    tickets,
    fees,
    taxes,
    exceptions: excepciones,
  } = overviewQuery.overview;
  const advanceActions = useAdvanceActions();
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // tabs & paginación
  const [activeTab, setActiveTab] = useState<TabSection>("calendario");
  const [tickPage, setTickPage] = useState(1);
  const [tickPageSize, setTickPageSize] = useState(10);

  // form
  const [open, setOpen] = useState(false);
  const [operationId, setOperationId] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [detail, setDetail] = useState<Ticket | null>(null);
  const [aceptoOferta, setAceptoOferta] = useState(false);

  // Resumen del comercio (RPC comercio_liquidaciones_resumen): saldo,
  // pendiente de acreditacion, proxima acreditacion, vendido del mes,
  // adelanto a compensar y deuda por contracargos.
  const advanceOperationsQuery = useAdvanceableOperations(open);
  const summaryQ = useSettlementsSummary();
  const res = summaryQ.data;

  const ROWS_OPTIONS = [10, 20, 50];
  const tickTotalPages = Math.max(1, Math.ceil(tickets.length / tickPageSize));
  const tickPaginated = tickets.slice((tickPage - 1) * tickPageSize, tickPage * tickPageSize);

  const openForDate = (date: string) => {
    setSelectedDate(date);
    setOperationId("");
    setReason("");
    setOpen(true);
  };
  const openGeneral = () => {
    setSelectedDate(null);
    setOperationId("");
    setReason("");
    setOpen(true);
  };

  const handleCreate = async () => {
    if (!operationId) {
      toast.error("Elegí la operación que querés adelantar");
      return;
    }
    if (cap && !cap.cumpleAntiguedad) {
      toast.error(
        `El adelanto se habilita a partir de los ${cap.antiguedadMinima} días de operación`,
      );
      return;
    }
    setSaving(true);
    try {
      // El servidor valida la operacion, la antiguedad y el tope, y calcula el monto.
      const row = await advanceActions.request({
        transactionId: operationId,
        reason: reason || null,
      });
      setOpen(false);
      toast.success(
        `Adelanto ${String(row?.adelanto_id ?? "")
          .slice(0, 8)
          .toUpperCase()} solicitado. MoliPay te va a enviar una oferta con la tasa y el neto a recibir.`,
      );
    } catch (e) {
      toast.error(userMessage(e, "No se pudo solicitar el adelanto"));
    } finally {
      setSaving(false);
    }
  };

  // Aceptar la oferta (RPC adelanto_aceptar): exige confirmar la tasa y el neto.
  const handleAceptar = async (t: Ticket) => {
    if (!t.fullId) return;
    if (!aceptoOferta) {
      toast.error("Marcá que aceptás la tasa y el monto a recibir");
      return;
    }
    setSaving(true);
    try {
      await advanceActions.accept(t.fullId);
      toast.success("Oferta aceptada. MoliPay va a acreditar el neto en tu cuenta.");
      setDetail(null);
      setAceptoOferta(false);
    } catch (e) {
      toast.error(userMessage(e, "No se pudo aceptar la oferta"));
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = async (advanceId?: string) => {
    if (!advanceId) {
      toast.error("No se pudo identificar el adelantar");
      return;
    }
    setSaving(true);
    try {
      const row = await advanceActions.cancel(advanceId);
      setDetail((prev) =>
        prev && prev.fullId === advanceId
          ? { ...prev, estado: (row?.estado ?? "cancelado").toLowerCase() as TicketStatus }
          : null,
      );
      toast.success("Adelanto cancelado correctamente");
    } catch (e) {
      toast.error(userMessage(e, "No se pudo cancelar el adelantar"));
    } finally {
      setSaving(false);
    }
  };

  const exportExcel = () => {
    downloadXlsx(
      `liquidaciones-${new Date().toISOString().slice(0, 10)}.xlsx`,
      [
        { Metrica: "Falta cobrar (por cobrar)", Valor: formatARS(faltaCollect) },
        { Metrica: "Por acreditar (MollyPay te debe)", Valor: formatARS(byCredit) },
        { Metrica: "Disponible para adelanto", Valor: formatARS(available) },
        {},
        ...days.map((d) => ({
          Metrica: `Acredita ${fmtDateFull(d.date)}`,
          Valor: formatARS(d.monto),
          Cantidad: d.cantidad,
        })),
        {},
        ...tickets.map((t) => ({
          Ticket: t.id,
          Fecha: t.fecha,
          "Monto solicitado": formatARS(t.montoSolicitado),
          "Fecha acreditación": fmtDateFull(t.fechaAcreditacion),
          Estado: STATUS_TICKET_LABEL[t.estado],
        })),
      ],
      { sheetName: "SettlementsPage" },
    );
    toast.success("Excel descargado");
  };
  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFillColor(211, 0, 31);
    doc.rect(0, 0, 210, 24, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.text("MoliPay", 14, 16);
    doc.setTextColor(20, 20, 20);
    doc.setFontSize(10);
    doc.text(`SettlementsPage · ${new Date().toLocaleDateString("es-AR")}`, 196, 16, {
      align: "right",
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (doc as any).autoTable({
      startY: 30,
      head: [["Concepto", "Monto"]],
      body: [
        ["Falta cobrar", formatARS(faltaCollect)],
        ["Por acreditar", formatARS(byCredit)],
        ["Disponible adelanto", formatARS(available)],
      ],
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (doc as any).autoTable({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      startY: (doc as any).lastAutoTable.finalY + 8,
      head: [["Fecha acredita", "Monto", "Ops"]],
      body: days.map((d) => [fmtDateFull(d.date), formatARS(d.monto), String(d.cantidad)]),
      styles: { fontSize: 8 },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (doc as any).autoTable({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      startY: (doc as any).lastAutoTable.finalY + 8,
      head: [["Ticket", "Fecha", "Monto solicitado", "Acredita", "Estado"]],
      body: tickets.map((t) => [
        t.id,
        t.fecha,
        formatARS(t.montoSolicitado),
        fmtDateFull(t.fechaAcreditacion),
        STATUS_TICKET_LABEL[t.estado],
      ]),
      styles: { fontSize: 7 },
    });
    doc.save(`liquidaciones-${new Date().toISOString().slice(0, 10)}.pdf`);
    toast.success("PDF descargado");
  };

  // Desde el calendario se ven las operaciones de ese dia, si las hay.
  const allOperations = advanceOperationsQuery.data ?? [];
  const operationsOfDay = allOperations.filter((op) => op.batchDate === selectedDate);
  const advanceOperations = operationsOfDay.length > 0 ? operationsOfDay : allOperations;
  return {
    askConfirm,
    loading,
    faltaCollect,
    byCredit,
    advancesEnCurso,
    available,
    cap,
    merchantId,
    days,
    tickets,
    fees,
    taxes,
    excepciones,
    selectedDate,
    setSelectedDate,
    activeTab,
    setActiveTab,
    tickPage,
    setTickPage,
    tickPageSize,
    setTickPageSize,
    open,
    setOpen,
    advanceOperations,
    operationsLoading: advanceOperationsQuery.isPending,
    operationId,
    setOperationId,
    reason,
    setReason,
    saving,
    detail,
    setDetail,
    aceptoOferta,
    setAceptoOferta,
    summaryQ,
    res,
    ROWS_OPTIONS,
    tickTotalPages,
    tickPaginated,
    openForDate,
    openGeneral,
    handleCreate,
    handleAceptar,
    handleCancel,
    exportExcel,
    exportPDF,
  };
}

export type SettlementsPageVm = ReturnType<typeof useSettlementsPage>;
