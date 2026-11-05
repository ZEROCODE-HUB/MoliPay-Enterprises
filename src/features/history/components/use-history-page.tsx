import { useMemo,useState,useEffect } from "react";
import { toast } from "sonner";
import { useDebouncedValue } from "@/shared/hooks/use-debounced-value";
import { userMessage } from "@/shared/lib/errors";
import { useSubaccounts } from "@/features/accounts/accounts.hooks";
import { useCurrentCustomer } from "@/features/session/session.hooks";
import { useTransactionDetailLoader,useTransactionLines } from "../history.hooks";
import { lineTotals,singleAccountCbu,type ReceiptOwner } from "../history.rules";
import type {
HistoryFilters,
LineKind,
TransactionDetail,
TransactionLine,
} from "../history.types";
import { exportLinesPdf,exportLinesXlsx } from "./history-export";
import { downloadReceipt,shareReceipt } from "./receipt-actions";
import { route,PAGE_SIZE } from "@/features/history/history.rules";

/** Estado y acciones de HistoryPage: el componente solo dibuja. */
export function useHistoryPage() {
  // `?subcuenta=<nombre>` llega desde Subcuentas ("Ver historial") y preselecciona el filtro.
  const { subcuenta: initialSubaccount } = route.useSearch();
  const customer = useCurrentCustomer();
  const subaccountsQuery = useSubaccounts();
  const loadDetail = useTransactionDetailLoader();

  const [view, setView] = useState<"principal" | "sub">("principal");
  const [subaccountView, setSubaccountView] = useState("");
  const [detail, setDetail] = useState<TransactionDetail | null>(null);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [operation, setOperation] = useState("all");
  const [lineKind, setLineKind] = useState<LineKind | "all">("all");
  const [subaccountFilter, setSubaccountFilter] = useState(initialSubaccount ?? "");
  const [searchCbu, setSearchCbu] = useState("");
  const [searchCuit, setSearchCuit] = useState("");
  const [searchTxid, setSearchTxid] = useState("");
  const [searchRecipient, setSearchRecipient] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = PAGE_SIZE;
  const [serial] = useState(
    () => `RP-EMP-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 899999)}`,
  );

  const subaccounts = useMemo(
    () => [...(subaccountsQuery.data ?? [])].sort((a, b) => a.name.localeCompare(b.name, "es")),
    [subaccountsQuery.data],
  );
  const noSubaccounts = subaccounts.length === 0;
  const selectedSubaccount = subaccountView || subaccounts[0]?.name || "";
  const owner: ReceiptOwner = {
    name: customer.data?.name ?? "",
    cuit: customer.data?.cuit ?? "",
    // Si el cliente tiene varias cuentas distintas no se sabe cual se uso: queda vacio.
    cbu: singleAccountCbu(subaccounts.map((s) => s.cvu)),
  };

  // Texto libre con debounce: una consulta cuando se deja de escribir, no por tecla.
  // El objeto se memoriza: si cambiara de identidad en cada render, el debounce no terminaria nunca.
  const searchInput = useMemo(
    () => ({ cbu: searchCbu, cuit: searchCuit, txid: searchTxid, recipientName: searchRecipient }),
    [searchCbu, searchCuit, searchTxid, searchRecipient],
  );
  const search = useDebouncedValue(searchInput);
  const filters: HistoryFilters = {
    page,
    pageSize,
    from: fromDate,
    to: toDate,
    operation,
    lineKind,
    subaccountId: subaccounts.find((s) => s.name === subaccountFilter)?.id ?? null,
    ...search,
  };
  const linesQuery = useTransactionLines(filters);
  const lines = linesQuery.rows;
  const total = linesQuery.total;
  const loading = linesQuery.isLoading;
  const totals = useMemo(() => lineTotals(lines), [lines]);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  useEffect(() => {
    setPage(1);
  }, [fromDate, toDate, operation, lineKind, subaccountFilter, search]);

  /** Operacion completa de una linea (detalle y comprobante). */
  const fetchDetail = async (l: TransactionLine): Promise<TransactionDetail | null> => {
    try {
      return await loadDetail(l.transactionId);
    } catch (e) {
      toast.error(userMessage(e, "No se pudo cargar la operación."));
      return null;
    }
  };

  const openDetail = async (l: TransactionLine) => {
    const d = await fetchDetail(l);
    if (d) setDetail(d);
  };

  const downloadLineReceipt = async (l: TransactionLine) => {
    const d = await fetchDetail(l);
    if (d) downloadReceipt(d, owner);
  };

  const shareLineReceipt = async (l: TransactionLine) => {
    const d = await fetchDetail(l);
    if (d) await shareReceipt(d, owner);
  };

  function clearFilters() {
    setFromDate("");
    setToDate("");
    setOperation("all");
    setLineKind("all");
    setSubaccountFilter("");
    setSearchCbu("");
    setSearchCuit("");
    setSearchTxid("");
    setSearchRecipient("");
  }

  const exportExcel = () => exportLinesXlsx(lines);
  const exportPDF = () => exportLinesPdf(lines, serial);
  return {
    view,
    setView,
    setSubaccountView,
    detail,
    setDetail,
    fromDate,
    setFromDate,
    toDate,
    setToDate,
    operation,
    setOperation,
    lineKind,
    setLineKind,
    subaccountFilter,
    setSubaccountFilter,
    searchCbu,
    setSearchCbu,
    searchCuit,
    setSearchCuit,
    searchTxid,
    setSearchTxid,
    searchRecipient,
    setSearchRecipient,
    page,
    setPage,
    pageSize,
    subaccounts,
    noSubaccounts,
    selectedSubaccount,
    owner,
    filters,
    linesQuery,
    lines,
    total,
    loading,
    totals,
    totalPages,
    openDetail,
    downloadLineReceipt,
    shareLineReceipt,
    clearFilters,
    exportExcel,
    exportPDF,
  };
}

export type HistoryPageVm = ReturnType<typeof useHistoryPage>;
