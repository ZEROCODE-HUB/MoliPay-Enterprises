import { createBatchActions } from "./collection-batch-actions";
import { CollectionBatchBody } from "./collection-batch-body";
import { useCollectionBatchPage } from "./use-collection-batch-page";
import { removeBatchDB,statusCatalog } from "@/features/collections/collections.data";
import { AlertCircle,ArrowLeft } from "lucide-react";
import { BtnOutline } from "@/shared/ui/button";
import { toast } from "sonner";
import { ConfirmDialog } from "@/shared/ui/confirm-dialog";
import { STATUS_STYLES } from "@/features/collections/collection-batch.rules";

export function CollectionBatchPage() {
  const vm = useCollectionBatchPage();
  const {
    id,
    navigate,
    page,
    setPage,
    pageSize,
    confirmRemove,
    setConfirmRemove,
    batch,
    records,
    loading,
    errorCarga,
    generatingLinks,
    setGeneratingLinks,
    recordsPaginados,
    totalPages,
    trigger,
  } = vm;

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">Cargando lote...</p>
      </div>
    );
  }

  if (!batch) {
    return (
      <div className="text-center py-12">
        <AlertCircle size={40} className="mx-auto mb-3 text-muted-foreground" />
        <h2 className="font-semibold">Lote no encontrado</h2>
        <p className="text-sm text-muted-foreground mt-1">
          El lote con ID {id} no existe o fue eliminado.
        </p>
        {errorCarga && (
          <p className="text-xs text-red-500 mt-2 font-mono bg-red-50 rounded px-3 py-2 inline-block">
            Error: {errorCarga}
          </p>
        )}
        <BtnOutline className="mt-4" onClick={() => navigate({ to: "/app/cobros/gestion" })}>
          Volver a gestion
        </BtnOutline>
      </div>
    );
  }

  const detail = createBatchActions({
    batch,
    records,
    onRefresh: trigger,
    onRequestRemove: () => setConfirmRemove(true),
    setGeneratingLinks,
  });

  const handleRemove = async () => {
    const result = await removeBatchDB(id);
    if (result.ok) {
      toast.success("Lote eliminado");
      navigate({ to: "/app/cobros/gestion" });
    }
  };
  return (
    <div>
      {/* Cabecera */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate({ to: "/app/cobros/gestion" })}
          className="inline-flex items-center justify-center w-9 h-9 rounded-md hover:bg-muted transition"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <h2 className="text-lg font-semibold">{batch.nombre}</h2>
          <p className="text-xs text-muted-foreground">
            ID: {batch.id} · Periodo: {batch.periodo}
          </p>
        </div>
        <span
          className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
            STATUS_STYLES[batch.estado]
          }`}
        >
          {statusCatalog[batch.estado]?.label ?? batch.estado}
        </span>
      </div>

      {/* Acciones */}
      <CollectionBatchBody
        batch={batch}
        records={records}
        generatingLinks={generatingLinks}
        detail={detail}
      />

      <ConfirmDialog
        confirmLabel="Eliminar"
        variant="danger"
        open={confirmRemove}
        title="¿Eliminar lote?"
        message="Esta accion no se puede deshacer. Los links de pago generados dejaran de funcionar."
        onClose={() => setConfirmRemove(false)}
        onConfirm={handleRemove}
      />
    </div>
  );
}
