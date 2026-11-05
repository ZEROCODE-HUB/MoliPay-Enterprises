import { type BatchStatus } from "@/features/collections/collections.data";

export const presets = [
  { label: "7 dias", days: 7 },
  { label: "15 dias", days: 15 },
  { label: "30 dias", days: 30 },
  { label: "60 dias", days: 60 },
  { label: "90 dias", days: 90 },
  { label: "Todos", days: 9999 },
];

export const METHOD_COLORS: Record<string, string> = {
  TRANSFERENCIA: "#324595",
  TARJETA_CREDITO: "#D3001F",
  TARJETA_DEBITO: "#000000",
  QR: "#1E8E3E",
};

export const VENC_COLORS = ["#1E8E3E", "#E37B1A", "#D3001F"];

export const STATUS_BADGE: Record<BatchStatus, string> = {
  cargado: "bg-plata-200 text-black-600",
  en_proceso: "bg-warning-bg text-warning",
  finalizado: "bg-success-bg text-success",
  pausado: "bg-navy-50 text-navy-500",
  eliminado: "bg-error-bg text-error",
  error: "bg-error-bg text-error",
};
