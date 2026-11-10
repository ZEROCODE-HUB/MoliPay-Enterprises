import { useEffect,useMemo,useState } from "react";
import { toast } from "sonner";
import { useSubaccounts } from "@/features/accounts/accounts.hooks";
import { useCurrentCustomer } from "@/features/session/session.hooks";
import { sumMoney,formatMoneyAmount,toDecimalString } from "@/shared/lib/money";
import { useDashboardTransactions } from "../dashboard.hooks";
import { dailySeries,summarize } from "../dashboard.rules";
import jsPDF from "jspdf";
import "jspdf-autotable";
import { downloadXlsx } from "@/shared/lib/download";
import { type PeriodKey } from "@/features/dashboard/dashboard.types";
import { QUICK } from "@/features/dashboard/dashboard.rules";

/** Estado y acciones de DashboardPage: el componente solo dibuja. */
export function useDashboardPage() {
  const [period, setPeriod] = useState<PeriodKey>("30d");
  const [day, setDay] = useState(() => new Date().toISOString().slice(0, 10));
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const range = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (period === "day") {
      const d = new Date(day + "T00:00:00");
      return {
        start: d,
        end: new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999),
      };
    }
    if (period === "range") {
      const s = from ? new Date(from + "T00:00:00") : today;
      const e = to
        ? new Date(to + "T23:59:59")
        : new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);
      return { start: s, end: e };
    }
    const days = QUICK.find((p) => p.k === period)?.days ?? 30;
    const s = new Date(today);
    s.setDate(today.getDate() - (days - 1));
    const e = new Date(today);
    e.setHours(23, 59, 59, 999);
    return { start: s, end: e };
  }, [period, day, from, to]);

  const customer = useCurrentCustomer();
  const subaccounts = useSubaccounts();
  const transactionsQuery = useDashboardTransactions(range);
  const movs = useMemo(() => transactionsQuery.data ?? [], [transactionsQuery.data]);
  const subs = useMemo(() => subaccounts.data ?? [], [subaccounts.data]);
  // Los CVU se asignan en las subcuentas; la ficha del cliente queda de respaldo.
  const withCvu = subs.filter((s) => s.cvu);
  const cbuLabel =
    withCvu.length > 1
      ? `${withCvu.length} CVU asignadas`
      : withCvu.length === 1
        ? `CVU ${withCvu[0].cvu}`
        : customer.data?.alias
          ? `Alias ${customer.data.alias}`
          : customer.data?.cbu
            ? `CVU ${customer.data.cbu}`
            : "";
  // Saldo total = disponible + retenido de todas las subcuentas (en centavos).
  const balanceTotal = useMemo(
    () => sumMoney(subs.flatMap((sub) => [sub.available, sub.held])),
    [subs],
  );
  const balanceHeld = useMemo(() => sumMoney(subs.map((sub) => sub.held)), [subs]);
  const accounts = subs.length;
  const accountsWithCvu = withCvu.length;

  // Saldos y movimientos los mueve el backend: se releen cada 30 s mientras el panel esta abierto.
  const { refetch: refetchSubs } = subaccounts;
  const { refetch: refetchMovs } = transactionsQuery;
  useEffect(() => {
    const t = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      void refetchSubs();
      void refetchMovs();
    }, 30_000);
    return () => window.clearInterval(t);
  }, [refetchSubs, refetchMovs]);

  const data = useMemo(() => dailySeries(movs, range), [movs, range]);

  const kpis = useMemo(() => {
    const summary = summarize(movs);
    return {
      saldo: balanceTotal,
      retenido: balanceHeld,
      cuentasConCvu: accountsWithCvu,
      depositos: summary.deposits,
      opsDep: summary.depositCount,
      retiros: summary.withdrawals,
      opsRet: summary.withdrawalCount,
      cuentas: accounts,
      cobrosLink: summary.cardCollections,
      opsLink: summary.cardCollectionCount,
      cobrosQR: summary.qrCollections,
      opsCobrosQR: summary.qrCollectionCount,
      pagosQR: summary.qrPayments,
      opsPagosQR: summary.qrPaymentCount,
    };
  }, [movs, balanceTotal, balanceHeld, accounts, accountsWithCvu]);

  const doExport = (fmt: "xlsx" | "pdf") => {
    const rows = movs.map((m) => ({
      Fecha: m.occurredAt.slice(0, 16).replace("T", " "),
      Tipo: m.kind,
      Monto: Number(toDecimalString(m.amount)),
    }));
    if (fmt === "xlsx") {
      downloadXlsx(
        `dashboard-movimientos-${new Date().toISOString().slice(0, 10)}.xlsx`,
        [
          { Resumen: "Saldo total", Valor: formatMoneyAmount(kpis.saldo) },
          { Resumen: "Depósitos", Valor: formatMoneyAmount(kpis.depositos) },
          { Resumen: "Retiros", Valor: formatMoneyAmount(kpis.retiros) },
          { Resumen: "Cobros Link de Pago", Valor: formatMoneyAmount(kpis.cobrosLink) },
          { Resumen: "Cobros QR", Valor: formatMoneyAmount(kpis.cobrosQR) },
          { Resumen: "Pagos QR", Valor: formatMoneyAmount(kpis.pagosQR) },
          { Resumen: "Cuentas", Valor: String(kpis.cuentas) },
          {},
          ...rows,
        ],
        { sheetName: "Dashboard" },
      );
      toast.success("Excel descargado");
    } else {
      const doc = new jsPDF();
      doc.setFillColor(211, 0, 31);
      doc.rect(0, 0, 210, 24, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16);
      doc.text("MoliPay", 14, 16);
      doc.setTextColor(20, 20, 20);
      doc.setFontSize(10);
      doc.text(`Dashboard · ${periodLabel}`, 196, 12, { align: "right" });
      doc.text(new Date().toLocaleString("es-AR"), 196, 18, { align: "right" });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (doc as any).autoTable({
        startY: 32,
        head: [["KPI", "Valor"]],
        body: [
          ["Saldo total", formatMoneyAmount(kpis.saldo)],
          ["Depósitos", formatMoneyAmount(kpis.depositos)],
          ["Retiros", formatMoneyAmount(kpis.retiros)],
          ["Cobros Link de Pago", formatMoneyAmount(kpis.cobrosLink)],
          ["Cobros QR", formatMoneyAmount(kpis.cobrosQR)],
          ["Pagos QR", formatMoneyAmount(kpis.pagosQR)],
          ["Cuentas", String(kpis.cuentas)],
        ],
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (doc as any).autoTable({
        startY: (doc as any).lastAutoTable.finalY + 8,
        head: [["Fecha", "Tipo", "Monto"]],
        body: rows.map((r) => [r.Fecha, r.Tipo, r.Monto.toFixed(2)]),
        styles: { fontSize: 7 },
      });
      doc.save(`dashboard-movimientos-${new Date().toISOString().slice(0, 10)}.pdf`);
      toast.success("PDF descargado");
    }
  };

  const periodLabel = useMemo(() => {
    if (period === "day") return day;
    if (period === "range") return `${from || "?"} – ${to || "?"}`;
    return QUICK.find((p) => p.k === period)?.l ?? "30 días";
  }, [period, day, from, to]);
  return {
    period,
    setPeriod,
    day,
    setDay,
    from,
    setFrom,
    to,
    setTo,
    range,
    cbuLabel,
    data,
    kpis,
    doExport,
    periodLabel,
  };
}

export type DashboardPageVm = ReturnType<typeof useDashboardPage>;
