import { X } from "lucide-react";
import { getBatchByIdDB,getRecordsByBatchIdDB } from "@/features/collections/collections.data";
import { STATUS_STYLES } from "@/features/collections/collection-batch.rules";
import { Modal } from "@/shared/ui/modal";
import { createBatchActions } from "./collection-batch-actions";
import { CollectionBatchBody } from "./collection-batch-body";
import type { CollectionsManagementPageVm } from "./use-collections-management-page";

export function CollectionBatchDetailModal({
  detailOpen,
  detailBatch,
  recordsDetail,
  setGeneratingLinks,
  setDetailBatch,
  setRecordsDetail,
  setTick,
  setConfirmRemoveId,
  setDetailOpen,
  generatingLinks,
}: Pick<
  CollectionsManagementPageVm,
  | "detailOpen"
  | "detailBatch"
  | "recordsDetail"
  | "setGeneratingLinks"
  | "setDetailBatch"
  | "setRecordsDetail"
  | "setTick"
  | "setConfirmRemoveId"
  | "setDetailOpen"
  | "generatingLinks"
>) {
  if (!detailOpen || !detailBatch) return null;
  const batch = detailBatch;

  const refresh = async () => {
    const fresh = await getBatchByIdDB(batch.id);
    if (fresh) setDetailBatch(fresh);
    setRecordsDetail(await getRecordsByBatchIdDB(batch.id));
    setTick((t) => t + 1);
  };
  const detail = createBatchActions({
    batch,
    records: recordsDetail,
    onRefresh: refresh,
    onRequestRemove: () => setConfirmRemoveId(batch.id),
    setGeneratingLinks,
  });

  return (
    <Modal open onClose={() => setDetailOpen(false)} size="custom" className="max-w-5xl">
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b bg-card px-6 py-4">
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-base font-semibold">{batch.nombre}</h2>
            <p className="text-xs text-muted-foreground">
              ID: {batch.id} &middot; Periodo: {batch.periodo}
            </p>
          </div>
          <span
            className={`inline-block shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${STATUS_STYLES[batch.estado]}`}
          >
            {batch.estado}
          </span>
          <button
            type="button"
            onClick={() => setDetailOpen(false)}
            className="shrink-0 rounded-md p-1.5 hover:bg-muted"
            aria-label="Cerrar"
          >
            <X size={18} />
          </button>
        </div>
        <div className="space-y-6 p-6">
          <CollectionBatchBody
            batch={batch}
            records={recordsDetail}
            generatingLinks={generatingLinks}
            detail={detail}
          />
        </div>
      </div>
    </Modal>
  );
}
