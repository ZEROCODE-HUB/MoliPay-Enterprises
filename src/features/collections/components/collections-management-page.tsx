import { Pagination } from "@/shared/ui/pagination";
import { CollectionFilters } from "./collection-filters";
import { CollectionBatchesTable } from "./collection-batches-table";
import { CollectionBatchDetailModal } from "./collection-batch-detail-modal";
import { useCollectionsManagementPage } from "./use-collections-management-page";
import { BtnOutline,BtnPrimary } from "@/shared/ui/button";
import { Download,FileSpreadsheet,Plus } from "lucide-react";
import { ConfirmDialog } from "@/shared/ui/confirm-dialog";
import "jspdf-autotable";

export function CollectionsManagementPage() {
  const vm = useCollectionsManagementPage();
  const {
    navigate,
    page,
    setPage,
    pageSize,
    setPageSize,
    confirmRemoveId,
    setConfirmRemoveId,
    runRemove,
    batches,
    totalPages,
    ROWS_OPTIONS,
    downloadPlantilla,
    exportExcel,
    exportPDF,
  } = vm;

  return (
    <>
      {/* Acciones globales */}
      <div className="flex flex-wrap gap-3 mb-6 items-center">
        <BtnPrimary
          className="h-9 px-3 text-xs"
          onClick={() => navigate({ to: "/app/cobros/nuevo" })}
        >
          <Plus size={14} /> Nuevo lote
        </BtnPrimary>
        <BtnOutline className="h-9 px-3 text-xs" onClick={downloadPlantilla}>
          <Download size={14} /> Descargar plantilla
        </BtnOutline>
        <BtnOutline className="h-9 px-3 text-xs" onClick={exportExcel}>
          <FileSpreadsheet size={14} /> Excel
        </BtnOutline>
        <BtnOutline className="h-9 px-3 text-xs" onClick={exportPDF}>
          <Download size={14} /> PDF
        </BtnOutline>
      </div>

      {/* Filtros */}
      <CollectionFilters {...vm} />

      {/* Tabla de lotes */}
      <CollectionBatchesTable {...vm} />

      {/* Paginacion */}
      <Pagination
        className="mt-4"
        page={page}
        pageSize={pageSize}
        total={batches.length}
        onPageChange={setPage}
        onPageSizeChange={(n) => {
          setPageSize(n);
          setPage(1);
        }}
      />

      {/* Modal: Detalle del lote */}
      <CollectionBatchDetailModal {...vm} />

      <ConfirmDialog
        confirmLabel="Eliminar"
        variant="danger"
        open={confirmRemoveId !== null}
        title="¿Eliminar lote?"
        message="Esta accion no se puede deshacer. Los links de pago generados dejaran de funcionar."
        onClose={() => setConfirmRemoveId(null)}
        onConfirm={runRemove}
      />
    </>
  );
}
