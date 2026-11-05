import jsPDF from "jspdf";
import "jspdf-autotable";
import { toast } from "sonner";
import { downloadXlsx } from "@/shared/lib/download";
import { formatMoneyAmount,toDecimalString } from "@/shared/lib/money";
import {
STATUS_LABEL,
formatSignedMoney,
lineLabel,
lineTotals,
operationLabel,
} from "../history.rules";
import type { TransactionLine } from "../history.types";

/** 2026-11-02 14:05:09 (hora local). */
export const formatLineDate = (iso: string) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
};

const today = () => new Date().toISOString().slice(0, 10);

export function exportLinesXlsx(lines: TransactionLine[]) {
  const totals = lineTotals(lines);
  const body = lines.map((l) => ({
    Legajo: l.legajo,
    TXID: l.txid,
    Tipo: lineLabel(l),
    Operacion: operationLabel(l.operationKind),
    CVU: l.cvu ?? "",
    Email: l.email ?? "",
    Nombre: l.name ?? "",
    Nombre_destino: l.recipientName ?? "",
    CUIT: l.cuit ?? "",
    Monto: Number(toDecimalString(l.amount)),
    Fecha: formatLineDate(l.occurredAt),
    Estado: STATUS_LABEL[l.status],
  }));
  downloadXlsx(
    `historial-movimientos-${today()}.xlsx`,
    [
      { Resumen: "Ingresos", Valor: formatMoneyAmount(totals.income) },
      { Resumen: "Egresos", Valor: formatMoneyAmount(totals.expense) },
      { Resumen: "Neto", Valor: formatMoneyAmount(totals.net) },
      {
        Resumen: "Pendientes/Rechazados",
        Valor: String(totals.pendingCount + totals.rejectedCount),
      },
      {},
      ...body,
    ],
    { sheetName: "Movimientos" },
  );
  toast.success("Excel descargado");
}

export function exportLinesPdf(lines: TransactionLine[], serial: string) {
  const totals = lineTotals(lines);
  const doc = new jsPDF();
  doc.setFillColor(211, 0, 31);
  doc.rect(0, 0, 210, 26, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.text("MoliPay", 14, 17);
  doc.setFontSize(9);
  doc.text("Reporte de movimientos", 14, 23);
  doc.setTextColor(20, 20, 20);
  doc.setFontSize(10);
  doc.text(`Generado: ${new Date().toLocaleString("es-AR")}`, 196, 17, { align: "right" });
  doc.text(serial, 196, 23, { align: "right" });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (doc as any).autoTable({
    startY: 34,
    head: [["Ingresos", "Egresos", "Neto", "Pendientes/Rechazados"]],
    body: [
      [
        formatMoneyAmount(totals.income),
        formatMoneyAmount(totals.expense),
        formatSignedMoney(totals.net),
        String(totals.pendingCount + totals.rejectedCount),
      ],
    ],
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (doc as any).autoTable({
    startY: 52,
    head: [["TXID", "Fecha", "Tipo", "Operacion", "Nombre destino", "CUIT", "Monto", "Estado"]],
    body: lines.map((l) => [
      l.txid,
      formatLineDate(l.occurredAt),
      lineLabel(l),
      operationLabel(l.operationKind),
      l.recipientName ?? "-",
      l.cuit ?? "-",
      toDecimalString(l.amount),
      STATUS_LABEL[l.status],
    ]),
    styles: { fontSize: 7 },
  });
  doc.save(`historial-movimientos-${today()}.pdf`);
  toast.success("PDF descargado");
}
