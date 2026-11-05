import type { Batch,RecordDeBatch } from "@/features/collections/collections.data";
import { type ReactNode } from "react";
import {
getLegajoUser,
pauseBatchDB,
resumeBatchDB,
startBatchDB,
} from "@/features/collections/collections.data";
import { LinkIcon,Pause,Play,PlayIcon,Trash2 } from "lucide-react";
import { toast } from "sonner";
import { buildResolvableUrl,toResolvableLinkPaymentUrl } from "@/shared/lib/pay-url";
import { downloadXlsx } from "@/shared/lib/download";
import { RECORD_STATUS_BADGE } from "@/features/collections/collection-batch.rules";

type BatchActionsParams = {
  batch: Batch;
  records: RecordDeBatch[];
  /** Vuelve a leer lote y registros despues de cada accion. */
  onRefresh: () => void | Promise<void>;
  onRequestRemove: () => void;
  setGeneratingLinks: (generating: boolean) => void;
};

/** Estadisticas y acciones del lote: las usan la pagina y el modal de detalle. */
export function createBatchActions({
  batch,
  records,
  onRefresh,
  onRequestRemove,
  setGeneratingLinks,
}: BatchActionsParams) {
  const id = batch.id;
  const totalRecords = records.length;
  const collecteds = records.filter((r) => r.estado === "pagado_total").length;
  const partials = records.filter((r) => r.estado === "pagado_parcial").length;
  const pendings = records.filter((r) => r.estado === "pendiente").length;
  const overdues = records.filter((r) => r.estado === "vencido").length;
  const withError = records.filter((r) => r.estado === "error").length;
  const amountTotal = records.reduce((s, r) => s + r.monto, 0);
  const amountCollected = records.reduce((s, r) => s + r.montoPagado, 0);
  const pctCollected = amountTotal > 0 ? Math.round((amountCollected / amountTotal) * 100) : 0;

  const handleStart = async () => {
    const legajo = await getLegajoUser();
    if (!legajo) {
      toast.error("No se pudo identificar el usuario");
      return;
    }
    setGeneratingLinks(true);
    try {
      const result = await startBatchDB(id, legajo);
      if (result.ok) {
        toast.success(`Lote iniciado - ${result.linksCount} links de pago creados`);
        await onRefresh();
      } else {
        toast.error(result.error ?? "El lote no esta en estado pendiente");
      }
    } finally {
      setGeneratingLinks(false);
    }
  };

  const handleRegenerarLinks = async () => {
    const legajo = await getLegajoUser();
    if (!legajo) {
      toast.error("No se pudo identificar el usuario");
      return;
    }
    setGeneratingLinks(true);
    try {
      const result = await startBatchDB(id, legajo, true);
      if (result.ok) {
        toast.success(`${result.linksCount} links regenerados`);
        await onRefresh();
      } else {
        toast.error(result.error ?? "No se pudieron regenerar los links");
      }
    } finally {
      setGeneratingLinks(false);
    }
  };

  const handlePause = async () => {
    const result = await pauseBatchDB(id);
    if (result.ok) {
      toast.success("Lote pausado");
      await onRefresh();
    } else toast.error(result.error ?? "No se pudo pausar el lote");
  };

  const handleResume = async () => {
    const result = await resumeBatchDB(id);
    if (result.ok) {
      toast.success("Lote reanudado");
      await onRefresh();
    } else toast.error(result.error ?? "No se pudo reanudar el lote");
  };

  const copyLink = async (url: string) => {
    // Resoluble real usando @/lib/pay-url (VITE_APP_URL > window.location.origin).
    const code = url.split("/").pop();
    const resolvable = code ? buildResolvableUrl(code) : toResolvableLinkPaymentUrl(url);
    navigator.clipboard.writeText(resolvable);
    toast.success("Link copiado al portapapeles");
  };

  const exportExcel = () => {
    const rows = records.map((r) => ({
      Descripcion: r.descripcion,
      Monto: r.monto,
      Pagado: r.montoPagado,
      "Fecha creacion": r.createdAt.slice(0, 10),
      "1er vencimiento": r.fechaVencimiento1 ?? "-",
      "2do vencimiento": r.fechaVencimiento2 ?? "-",
      "3er vencimiento": r.fechaVencimiento3 ?? "-",
      Email: r.email ?? "-",
      "Tipo entidad": r.tipoEntidad,
      "ID entidad": r.idEntidad,
      "Sub entidad": r.subEntidad,
      "Identificacion usuario": r.identificacionUsuario,
      "Fecha pago": r.fechaPago?.slice(0, 10) ?? "-",
      Estado: RECORD_STATUS_BADGE[r.estado]?.label ?? r.estado,
      "Link de pago": r.linkDePago ? toResolvableLinkPaymentUrl(r.linkDePago) : "-",
    }));
    downloadXlsx(`cobros-lote-${batch.id}-${batch.nombre.replace(/\s/g, "-")}.xlsx`, rows, {
      sheetName: "Registros",
    });
  };

  const renderActions = () => {
    const actions: {
      label: string;
      icon: ReactNode;
      onClick: () => void;
      variant: "primary" | "outline" | "danger";
    }[] = [];

    if (batch.estado === "cargado") {
      actions.push({
        label: "Iniciar lote",
        icon: <Play size={14} />,
        onClick: handleStart,
        variant: "primary",
      });
    }
    if (batch.estado === "en_proceso") {
      actions.push({
        label: "Pausar",
        icon: <Pause size={14} />,
        onClick: handlePause,
        variant: "outline",
      });
      actions.push({
        label: "Regenerar links",
        icon: <LinkIcon size={14} />,
        onClick: handleRegenerarLinks,
        variant: "primary",
      });
    }
    if (batch.estado === "pausado") {
      actions.push({
        label: "Reanudar",
        icon: <PlayIcon size={14} />,
        onClick: handleResume,
        variant: "primary",
      });
      actions.push({
        label: "Regenerar links",
        icon: <LinkIcon size={14} />,
        onClick: handleRegenerarLinks,
        variant: "primary",
      });
    }
    if (batch.estado !== "finalizado" && batch.estado !== "eliminado") {
      actions.push({
        label: "Eliminar",
        icon: <Trash2 size={14} />,
        onClick: onRequestRemove,
        variant: "danger",
      });
    }

    return actions;
  };

  const acciones = renderActions();

  return {
    totalRecords,
    collecteds,
    partials,
    pendings,
    overdues,
    withError,
    amountTotal,
    amountCollected,
    pctCollected,
    handleStart,
    handleRegenerarLinks,
    handlePause,
    handleResume,
    copyLink,
    exportExcel,
    renderActions,
    acciones,
  };
}

export type BatchActions = ReturnType<typeof createBatchActions>;
