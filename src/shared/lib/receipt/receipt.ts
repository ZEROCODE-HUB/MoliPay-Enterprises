/**
 * Comprobante de una transferencia enviada.
 *
 * Acá vive el TEXTO del comprobante (una sola fuente de verdad) y las acciones
 * de compartir. El PDF (`comprobante-pdf.ts`) reusa este mismo texto, así lo que
 * se descarga y lo que se comparte dicen siempre lo mismo.
 */

import { onlyDigits } from "@/shared/lib/text";

export type DataReceipt = {
  /** ISO. */
  fecha: string;
  monto: number;
  concepto?: string;
  comision?: number;
  impuesto?: number;
  estado?: string;
  txid: string;
  desde: { nombre: string; cuit: string; cbu: string };
  hacia: {
    nombre: string;
    cuit: string;
    cbu: string;
    banco?: string;
    alias?: string;
    tipoCuenta?: string;
  };
};

/** `1234.5` → `$ 1.234,50` (formato es-AR, sin depender del ICU del runtime). */
export function formatAmount(n: number): string {
  const value = Number.isFinite(n) ? Math.abs(n) : 0;
  const [ent, dec] = value.toFixed(2).split(".");
  const withMiles = ent.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `$ ${withMiles},${dec}`;
}

/** ISO → `2026-10-16 10:53:14` (hora local del navegador). */
export function formatDateReceipt(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const p = (v: number) => String(v).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

/** Texto del comprobante, con el mismo formato que se le muestra al cliente. */
export function formatReceiptText(d: DataReceipt): string {
  const lines: string[] = [];

  lines.push("Enviaste dinero");
  const date = formatDateReceipt(d.fecha);
  if (date) lines.push(date);
  lines.push("");
  lines.push(`Monto de operación: ${formatAmount(d.monto)}`);
  lines.push("");

  lines.push("Desde:");
  lines.push(`Nombre: ${d.desde.nombre || "—"}`);
  lines.push(`CUIT: ${onlyDigits(d.desde.cuit) || "—"}`);
  lines.push(`CBU/CVU: ${d.desde.cbu || "—"}`);
  lines.push("");

  lines.push("Hacia:");
  lines.push(`Nombre: ${d.hacia.nombre || "—"}`);
  lines.push(`CUIT: ${onlyDigits(d.hacia.cuit) || "—"}`);
  lines.push(`CBU/CVU: ${d.hacia.cbu || "—"}`);
  if (d.hacia.banco) lines.push(`Banco: ${d.hacia.banco}`);
  lines.push("");

  // El comprobante compartido es breve y consistente: muestra solamente los
  // datos bancarios principales de la operación.
  lines.push(`Estado: ${d.estado || "—"}`);
  lines.push(`ID de transacción: ${d.txid}`);
  lines.push("");
  lines.push("Comprobante no válido como factura");

  return lines.join("\n");
}

/** Nombre del archivo a descargar, ej. `comprobante-MOLI1792....pdf`. */
export function nameFileReceipt(d: DataReceipt, ext: "pdf" | "txt" | "png"): string {
  const id = (d.txid || "transferencia").replace(/[^a-zA-Z0-9-]/g, "");
  return `comprobante-${id}.${ext}`;
}
