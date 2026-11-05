/**
 * Comprobante en PNG para compartir. Se dibuja con Canvas para que WhatsApp y
 * el correo reciban una imagen simple, legible y con formato bancario.
 */
import {
formatAmount,
formatDateReceipt,
nameFileReceipt,
type DataReceipt,
} from "@/shared/lib/receipt/receipt";
import { onlyDigits } from "@/shared/lib/text";
import { downloadBlob } from "@/shared/lib/download";

const ANCHO = 900;
const PAD = 42;
const TEXT = "#222222";
const GRIS = "#6b7280";
const BORDE = "#e5e7eb";
const AZUL = "#0077ff";
const SOURCE = "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";
const MONO = "ui-monospace, Menlo, Consolas, 'Courier New', monospace";

type Section =
  | { t: "encabezado"; titulo: string; fecha: string }
  | { t: "monto"; texto: string }
  | { t: "seccion"; texto: string }
  | { t: "fila"; label: string; valor: string; mono?: boolean }
  | { t: "linea" }
  | { t: "espacio"; h: number }
  | { t: "pie"; texto: string };

const ALTO: Record<Section["t"], number> = {
  encabezado: 46,
  monto: 44,
  seccion: 29,
  fila: 26,
  linea: 1,
  espacio: 0,
  pie: 30,
};

function sections(d: DataReceipt): Section[] {
  return [
    { t: "encabezado", titulo: "Enviaste dinero", fecha: formatDateReceipt(d.fecha) },
    { t: "espacio", h: 12 },
    { t: "monto", texto: formatAmount(d.monto) },
    { t: "espacio", h: 12 },
    { t: "linea" },
    { t: "espacio", h: 20 },
    { t: "seccion", texto: "Desde:" },
    { t: "fila", label: "Nombre:", valor: d.desde.nombre || "—" },
    { t: "fila", label: "CUIT:", valor: onlyDigits(d.desde.cuit) || "—", mono: true },
    { t: "fila", label: "CBU/CVU:", valor: d.desde.cbu || "—", mono: true },
    { t: "espacio", h: 20 },
    { t: "linea" },
    { t: "espacio", h: 20 },
    { t: "seccion", texto: "Hacia:" },
    { t: "fila", label: "Nombre:", valor: d.hacia.nombre || "—" },
    { t: "fila", label: "CUIT:", valor: onlyDigits(d.hacia.cuit) || "—", mono: true },
    { t: "fila", label: "CBU/CVU:", valor: d.hacia.cbu || "—", mono: true },
    ...(d.hacia.banco ? [{ t: "fila" as const, label: "Banco:", valor: d.hacia.banco }] : []),
    { t: "espacio", h: 20 },
    { t: "linea" },
    { t: "espacio", h: 18 },
    { t: "fila", label: "Estado:", valor: d.estado || "—" },
    { t: "fila", label: "ID de transacción:", valor: d.txid, mono: true },
    { t: "espacio", h: 26 },
    { t: "pie", texto: "Comprobante no válido como factura" },
  ];
}

function recortar(ctx: CanvasRenderingContext2D, text: string, maxAncho: number): string {
  if (ctx.measureText(text).width <= maxAncho) return text;
  let corte = text;
  while (corte.length > 1 && ctx.measureText(corte + "…").width > maxAncho)
    corte = corte.slice(0, -1);
  return corte + "…";
}

function dibujar(d: DataReceipt): HTMLCanvasElement {
  const list = sections(d);
  const alto = PAD + list.reduce((s, x) => s + (x.t === "espacio" ? x.h : ALTO[x.t]), 0) + PAD;
  const dpr = Math.min(typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1, 2);
  const canvas = document.createElement("canvas");
  canvas.width = ANCHO * dpr;
  canvas.height = alto * dpr;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No se pudo generar la imagen del comprobante");
  ctx.scale(dpr, dpr);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, ANCHO, alto);

  let y = PAD;
  for (const x of list) {
    switch (x.t) {
      case "encabezado":
        ctx.fillStyle = TEXT;
        ctx.font = "700 17px " + SOURCE;
        ctx.textAlign = "left";
        ctx.fillText(x.titulo, PAD, y + 16);
        ctx.font = "400 13px " + SOURCE;
        ctx.textAlign = "right";
        ctx.fillText(x.fecha, ANCHO - PAD, y + 16);
        ctx.textAlign = "left";
        y += ALTO.encabezado;
        break;
      case "monto":
        ctx.fillStyle = TEXT;
        ctx.font = "700 16px " + SOURCE;
        ctx.fillText("Monto de operación:", PAD, y + 18);
        ctx.fillStyle = AZUL;
        ctx.textAlign = "right";
        ctx.fillText(x.texto, ANCHO - PAD, y + 18);
        ctx.textAlign = "left";
        y += ALTO.monto;
        break;
      case "seccion":
        ctx.fillStyle = TEXT;
        ctx.font = "400 16px " + SOURCE;
        ctx.fillText(x.texto, PAD, y + 18);
        y += ALTO.seccion;
        break;
      case "fila":
        ctx.fillStyle = TEXT;
        ctx.font = "700 15px " + SOURCE;
        ctx.fillText(x.label, PAD, y + 19);
        ctx.font = x.mono ? "600 15px " + MONO : "500 15px " + SOURCE;
        ctx.textAlign = "right";
        ctx.fillText(recortar(ctx, x.valor, ANCHO - PAD * 2 - 190), ANCHO - PAD, y + 19);
        ctx.textAlign = "left";
        y += ALTO.fila;
        break;
      case "linea":
        ctx.strokeStyle = BORDE;
        ctx.beginPath();
        ctx.moveTo(PAD, y + 0.5);
        ctx.lineTo(ANCHO - PAD, y + 0.5);
        ctx.stroke();
        y += ALTO.linea;
        break;
      case "espacio":
        y += x.h;
        break;
      case "pie":
        ctx.fillStyle = GRIS;
        ctx.font = "400 13px " + SOURCE;
        ctx.textAlign = "center";
        ctx.fillText(x.texto, ANCHO / 2, y + 16);
        ctx.textAlign = "left";
        y += ALTO.pie;
        break;
    }
  }
  return canvas;
}

export function generateReceiptPng(d: DataReceipt): Promise<Blob> {
  return new Promise((resolve, reject) => {
    try {
      dibujar(d).toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("No se pudo generar la imagen"))),
        "image/png",
      );
    } catch (e) {
      reject(e as Error);
    }
  });
}

export async function downloadReceiptPng(d: DataReceipt): Promise<void> {
  const blob = await generateReceiptPng(d);
  downloadBlob(nameFileReceipt(d, "png"), blob);
}

export type ResultShare = "compartido" | "descargado" | "cancelado" | "error";

export async function compartirComprobante(d: DataReceipt): Promise<ResultShare> {
  let file: File;
  try {
    file = new File([await generateReceiptPng(d)], nameFileReceipt(d, "png"), {
      type: "image/png",
    });
  } catch {
    return "error";
  }
  const nav = navigator as Navigator & {
    canShare?: (data: { files?: File[] }) => boolean;
    share?: (data: { files?: File[]; title?: string; text?: string }) => Promise<void>;
  };
  if (
    typeof nav.share === "function" &&
    (typeof nav.canShare !== "function" || nav.canShare({ files: [file] }))
  ) {
    try {
      await nav.share({
        files: [file],
        title: "Comprobante de transferencia",
        text: "Comprobante de la transferencia " + d.txid,
      });
      return "compartido";
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") return "cancelado";
    }
  }
  try {
    await downloadReceiptPng(d);
    return "descargado";
  } catch {
    return "error";
  }
}
