import jsPDF from "jspdf";
import { useNavigate } from "@tanstack/react-router";
import { useEffect,useMemo,useState } from "react";
import {
formatARS,
getBatchByIdDB,
getBatchesGestionDB,
getRecordsByBatchIdDB,
removeBatchDB,
type Batch,
type BatchStatus,
type RecordDeBatch,
} from "@/features/collections/collections.data";
import { toast } from "sonner";
import { downloadXlsx } from "@/shared/lib/download";
import "jspdf-autotable";
import { STATUS_LABEL } from "@/features/collections/collections-management.rules";

/** Estado y acciones de CollectionsManagementPage: el componente solo dibuja. */
export function useCollectionsManagementPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<BatchStatus | "todos">("todos");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [detailBatch, setDetailBatch] = useState<Batch | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const [batchesData, setBatchesData] = useState<Awaited<ReturnType<typeof getBatchesGestionDB>>>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [recordsDetail, setRecordsDetail] = useState<RecordDeBatch[]>([]);
  const [generatingLinks, setGeneratingLinks] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const data = await getBatchesGestionDB();
      if (!cancelled) {
        setBatchesData(data);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tick]);

  const runRemove = async () => {
    if (confirmRemoveId === null) return;
    const result = await removeBatchDB(confirmRemoveId);
    if (result.ok) {
      toast.success("Lote eliminado");
      setDetailOpen(false);
      setDetailBatch(null);
      setTick((t) => t + 1);
    } else {
      toast.error(result.error ?? "No se pudo eliminar");
    }
  };

  const batches = useMemo(() => {
    let data = batchesData;
    if (search) {
      const q = search.toLowerCase();
      data = data.filter(
        (l) =>
          l.nombre.toLowerCase().includes(q) ||
          l.id.toLowerCase().includes(q) ||
          l.periodo.includes(q),
      );
    }
    if (filterStatus !== "todos") {
      data = data.filter((l) => l.estado === filterStatus);
    }
    if (dateFrom) {
      data = data.filter((l) => l.createdAt.slice(0, 10) >= dateFrom);
    }
    if (dateTo) {
      data = data.filter((l) => l.createdAt.slice(0, 10) <= dateTo);
    }
    return data;
  }, [batchesData, search, filterStatus, dateFrom, dateTo]);

  useEffect(() => {
    setPage(1);
  }, [search, filterStatus, dateFrom, dateTo]);

  const totalPages = Math.max(1, Math.ceil(batches.length / pageSize));
  const paginated = batches.slice((page - 1) * pageSize, page * pageSize);

  const openDetail = async (id: string) => {
    const batch = await getBatchByIdDB(id);
    if (batch) {
      setDetailBatch(batch);
      const regs = await getRecordsByBatchIdDB(id);
      setRecordsDetail(regs);
      setDetailOpen(true);
    }
  };

  const ROWS_OPTIONS = [10, 20, 50];

  const downloadPlantilla = () => {
    const headers = [
      "tipo_entidad",
      "id_entidad",
      "sub_entidad",
      "identificacion_usuario",
      "monto",
      "descripcion",
      "email",
      "periodo_facturacion",
      "id_unico_beneficiario",
      "fecha_vencimiento_1",
      "fecha_vencimiento_2",
      "fecha_vencimiento_3",
      "tasa_interes",
      "medios_de_pago",
      "pagos_parciales_habilitado",
    ];
    const rows = [
      [
        "edificio",
        "6",
        "UF 3D",
        "Perez, Juan",
        48200,
        "Expensas mensuales - Edificio 6",
        "juan@email.com",
        "",
        "",
        "2026-04-15",
        "2026-04-30",
        "2026-05-15",
        10,
        "TRANSFERENCIA|TARJETA_CREDITO",
        true,
      ],
      [
        "club",
        "12",
        "Socio 145",
        "Romero, Pablo",
        15000,
        "Cuota social",
        "pablo.romero@email.com",
        "",
        "",
        "2026-04-10",
        "2026-04-25",
        "2026-05-10",
        5,
        "TRANSFERENCIA|QR",
        false,
      ],
    ];
    downloadXlsx(
      "plantilla-cobros-masivos.xlsx",
      rows.map((r) => Object.fromEntries(headers.map((h, i) => [h, r[i]]))),
      { sheetName: "Plantilla" },
    );
    toast.success("Plantilla descargada");
  };

  const exportExcel = () => {
    const rows = batches.map((l) => ({
      ID: l.id,
      Nombre: l.nombre,
      Periodo: l.periodo,
      Estado: STATUS_LABEL[l.estado],
      "Fecha creacion": l.createdAt,
      "Fecha finalizacion": l.fechaFinalizacion ?? "-",
      Progreso: `${l.progreso}%`,
      "Pagos completos": l.cantidadPagos,
      "Pagos parciales": l.cantidadParciales,
      Pendientes: l.cantidadPendientes,
      "Monto total": l.montoTotal,
      "Monto cobrado": l.montoCobrado,
      "Por cobrar": l.montoPorCobrar,
    }));
    downloadXlsx("cobros-masivos-lotes.xlsx", rows, { sheetName: "Lotes" });
  };

  const exportPDF = () => {
    const doc = new jsPDF("landscape");
    doc.text("Reporte de Lotes - Cobros Masivos", 14, 20);
    const total = batches.reduce((s, l) => s + l.montoTotal, 0);
    const collected = batches.reduce((s, l) => s + l.montoCobrado, 0);
    doc.text(
      `Monto total: ${formatARS(total)} | Cobrado: ${formatARS(collected)} | Tasa: ${total > 0 ? Math.round((collected / total) * 100) : 0}%`,
      14,
      30,
    );
    const body = batches.map((l) => [
      l.nombre,
      STATUS_LABEL[l.estado],
      `${l.progreso}%`,
      formatARS(l.montoTotal),
      formatARS(l.montoCobrado),
    ]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (doc as any).autoTable({
      startY: 38,
      head: [["Nombre", "Estado", "Progreso", "Monto total", "Cobrado"]],
      body,
    });
    doc.save("cobros-masivos-lotes.pdf");
  };
  return {
    navigate,
    search,
    setSearch,
    filterStatus,
    setFilterStatus,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    page,
    setPage,
    pageSize,
    setPageSize,
    detailBatch,
    setDetailBatch,
    detailOpen,
    setDetailOpen,
    confirmRemoveId,
    setConfirmRemoveId,
    setTick,
    recordsDetail,
    setRecordsDetail,
    generatingLinks,
    setGeneratingLinks,
    runRemove,
    batches,
    totalPages,
    paginated,
    openDetail,
    ROWS_OPTIONS,
    downloadPlantilla,
    exportExcel,
    exportPDF,
  };
}

export type CollectionsManagementPageVm = ReturnType<typeof useCollectionsManagementPage>;
