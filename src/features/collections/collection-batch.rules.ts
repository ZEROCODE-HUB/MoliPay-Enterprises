import { getRouteApi } from "@tanstack/react-router";

export const route = getRouteApi("/app/cobros/lote/$id");

export const STATUS_STYLES: Record<string, string> = {
  cargado: "bg-muted text-muted-foreground",
  en_proceso: "bg-amber-100 text-amber-800",
  finalizado: "bg-emerald-100 text-emerald-700",
  pausado: "bg-blue-100 text-blue-700",
  eliminado: "bg-red-100 text-red-700",
  error: "bg-red-100 text-red-700",
};

export const RECORD_STATUS_BADGE: Record<string, { label: string; style: string }> = {
  pendiente: {
    label: "Pendiente",
    style: "bg-amber-100 text-amber-800",
  },
  pagado_total: {
    label: "Pagado",
    style: "bg-emerald-100 text-emerald-700",
  },
  pagado_parcial: {
    label: "Pago parcial",
    style: "bg-blue-100 text-blue-700",
  },
  vencido: {
    label: "Vencido",
    style: "bg-red-100 text-red-700",
  },
  error: {
    label: "Error",
    style: "bg-red-100 text-red-700",
  },
};
