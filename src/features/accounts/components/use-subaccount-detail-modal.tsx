import { useMemo,useState } from "react";
import { toast } from "sonner";
import jsPDF from "jspdf";
import "jspdf-autotable";
import { downloadXlsx } from "@/shared/lib/download";
import { sumMoney,toDecimalString } from "@/shared/lib/money";
import { useSubaccountMovements } from "../accounts.hooks";
import { toMovView,type Sub } from "./subaccount-view";
import { useConfirm } from "@/shared/ui/confirm-provider";
import { useModalTitleId } from "@/shared/ui/modal";

/** Estado y acciones de SubaccountDetailModal: el componente solo dibuja. */
export function useSubaccountDetailModal({
  sub,
  onClose,
  onCambiarEstado: onChangeStatus,
  onFondear,
  onVerHistorial: onVerHistory,
}: {
  sub: Sub;
  onClose: () => void;
  onCambiarEstado: (id: string, status: "Activa" | "Pausada") => void;
  onFondear: () => void;
  onVerHistorial: () => void;
}) {
  const [editEmail, setEditEmail] = useState(false);
  const [emailVal, setEmailVal] = useState(sub.email);
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterKind, setFilterKind] = useState<"todos" | "ingreso" | "egreso">("todos");
  const [filterSearch, setFilterSearch] = useState("");
  const movesQuery = useSubaccountMovements(sub.id ? { id: sub.id, cvu: sub.cbu } : null);
  const moves = useMemo(() => (movesQuery.data ?? []).map(toMovView), [movesQuery.data]);
  const loadingMoves = movesQuery.isPending && !!sub.id;

  const allMoves = moves;
  const filtMoves = allMoves.filter((m) => {
    if (filterKind !== "todos" && m.tipo !== filterKind) return false;
    if (filterSearch) {
      const q = filterSearch.toLowerCase();
      if (
        !m.txid.toLowerCase().includes(q) &&
        !m.entidad.toLowerCase().includes(q) &&
        !m.cbu.includes(q)
      )
        return false;
    }
    return true;
  });

  const totalDepositos = sumMoney(allMoves.filter((m) => m.tipo === "ingreso").map((m) => m.monto));
  const totalRetiros = sumMoney(allMoves.filter((m) => m.tipo === "egreso").map((m) => m.monto));

  const confirm = useConfirm();
  const titleId = useModalTitleId();
  const confirmAction = (action: string, detail: string) =>
    confirm({ title: `¿Seguro que querés ${action}?`, message: detail, variant: "danger" });

  const downloadReport = (formato: "excel" | "pdf") => {
    const name = (sub.n || sub.cbu || "subcuenta").replace(/\s+/g, "_");
    if (formato === "excel") {
      downloadXlsx(
        `subcuenta-${name}.xlsx`,
        [
          { Subcuenta: sub.n, CVU: sub.cbu, Estado: sub.e, Tipo: sub.tipo, Email: sub.email },
          {},
          ...allMoves.map((m) => ({
            Fecha: m.fecha,
            Hora: m.hora,
            Tipo: m.tipo === "ingreso" ? "Ingreso" : "Egreso",
            Concepto: m.titulo,
            TXID: m.txid,
            "CVU contraparte": m.cbu,
            Monto: Number(toDecimalString(m.monto)),
          })),
        ],
        { sheetName: "Movimientos" },
      );
      toast.success("Reporte Excel descargado");
    } else {
      const doc = new jsPDF();
      doc.setFillColor(211, 0, 31);
      doc.rect(0, 0, 210, 22, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(14);
      doc.text("MoliPay", 14, 15);
      doc.setTextColor(20, 20, 20);
      doc.setFontSize(10);
      doc.text(`Subcuenta: ${sub.n || sub.cbu}`, 14, 32);
      doc.text(`Estado: ${sub.e} · CVU: ${sub.cbu}`, 14, 38);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (doc as any).autoTable({
        startY: 44,
        head: [["Fecha", "Hora", "Tipo", "Concepto", "TXID", "Monto"]],
        body: allMoves.map((m) => [
          m.fecha,
          m.hora,
          m.tipo === "ingreso" ? "Ingreso" : "Egreso",
          m.titulo,
          m.txid,
          toDecimalString(m.monto),
        ]),
        styles: { fontSize: 7 },
      });
      doc.save(`subcuenta-${name}.pdf`);
      toast.success("Reporte PDF descargado");
    }
  };
  return {
    sub,
    onClose,
    onChangeStatus,
    onFondear,
    onVerHistory,
    editEmail,
    setEditEmail,
    emailVal,
    setEmailVal,
    filterOpen,
    setFilterOpen,
    filterKind,
    setFilterKind,
    filterSearch,
    setFilterSearch,
    loadingMoves,
    allMoves,
    filtMoves,
    totalDepositos,
    totalRetiros,
    titleId,
    confirmAction,
    downloadReport,
  };
}

export type SubaccountDetailModalVm = ReturnType<typeof useSubaccountDetailModal>;
