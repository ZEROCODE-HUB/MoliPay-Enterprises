import jsPDF from "jspdf";
import {
formatAmount,
formatDateReceipt,
nameFileReceipt,
type DataReceipt,
} from "@/shared/lib/receipt/receipt";

function onlyDigits(v: string): string {
  return v.replace(/\D/g, "") || "—";
}

/** Descargable con el mismo comprobante simple que se comparte como imagen. */
export function generateReceiptPdf(d: DataReceipt): jsPDF {
  const doc = new jsPDF();
  const izquierda = 14;
  const derecha = 196;
  let y = 18;
  const line = () => {
    doc.setDrawColor(229, 231, 235);
    doc.line(izquierda, y, derecha, y);
    y += 11;
  };
  const row = (label: string, value: string, mono = false) => {
    doc.setTextColor(34, 34, 34);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(label, izquierda, y);
    doc.setFont(mono ? "courier" : "helvetica", mono ? "bold" : "normal");
    doc.text(value || "—", derecha, y, { align: "right" });
    y += 8;
  };

  doc.setTextColor(34, 34, 34);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Enviaste dinero", izquierda, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(formatDateReceipt(d.fecha), derecha, y, { align: "right" });
  y += 16;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("Monto de operación:", izquierda, y);
  doc.setTextColor(0, 119, 255);
  doc.text(formatAmount(d.monto), derecha, y, { align: "right" });
  y += 10;
  line();

  doc.setTextColor(34, 34, 34);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("Desde:", izquierda, y);
  y += 8;
  row("Nombre:", d.desde.nombre);
  row("CUIT:", onlyDigits(d.desde.cuit), true);
  row("CBU/CVU:", d.desde.cbu || "—", true);
  line();
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("Hacia:", izquierda, y);
  y += 8;
  row("Nombre:", d.hacia.nombre);
  row("CUIT:", onlyDigits(d.hacia.cuit), true);
  row("CBU/CVU:", d.hacia.cbu || "—", true);
  if (d.hacia.banco) row("Banco:", d.hacia.banco);
  line();
  row("Estado:", d.estado || "—");
  row("ID de transacción:", d.txid, true);
  y += 9;
  line();
  doc.setTextColor(107, 114, 128);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text("Comprobante no válido como factura", 105, y, { align: "center" });
  return doc;
}

export function downloadReceiptPdf(d: DataReceipt): void {
  generateReceiptPdf(d).save(nameFileReceipt(d, "pdf"));
}
