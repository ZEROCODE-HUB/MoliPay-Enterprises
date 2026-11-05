import { statusCatalog,type BatchStatus } from "@/features/collections/collections.data";

export const STATUS_LABEL: Record<BatchStatus, string> = {
  cargado: "Cargado / Pendiente",
  en_proceso: "En proceso",
  finalizado: "Finalizado",
  pausado: "Pausado",
  eliminado: "Eliminado",
  error: "Con error",
};

export const statuses = Object.keys(statusCatalog) as BatchStatus[];
