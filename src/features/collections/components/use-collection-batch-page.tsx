import { useNavigate } from "@tanstack/react-router";
import { useEffect,useState } from "react";
import {
getBatchByIdDB,
getRecordsByBatchIdDB,
type Batch,
type RecordDeBatch,
} from "@/features/collections/collections.data";
import { route } from "@/features/collections/collection-batch.rules";

/** Estado y acciones de CollectionBatchPage: el componente solo dibuja. */
export function useCollectionBatchPage() {
  const { id } = route.useParams();
  const navigate = useNavigate();
  const [refresh, setRefresh] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [batch, setBatch] = useState<Batch | null>(null);
  const [records, setRecords] = useState<RecordDeBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);
  const [generatingLinks, setGeneratingLinks] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setErrorCarga(null);
      try {
        const [l, r] = await Promise.all([getBatchByIdDB(id), getRecordsByBatchIdDB(id)]);
        if (!cancelled) {
          setBatch(l);
          setRecords(r);
        }
      } catch (e) {
        if (!cancelled) setErrorCarga(String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, refresh]);

  const recordsPaginados = records.slice((page - 1) * pageSize, page * pageSize);
  const totalPages = Math.max(1, Math.ceil(records.length / pageSize));

  useEffect(() => {
    setPage(1);
  }, [records.length]);

  const trigger = () => setRefresh((r) => r + 1);
  return {
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
  };
}

export type CollectionBatchPageVm = ReturnType<typeof useCollectionBatchPage>;
