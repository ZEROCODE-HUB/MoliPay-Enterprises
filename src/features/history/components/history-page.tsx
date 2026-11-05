import { useHistoryPage } from "@/features/history/components/use-history-page";
import { PageHeader } from "@/shared/ui/page-header";
import { BtnOutline,BtnPrimary } from "@/shared/ui/button";
import { Download,FileSpreadsheet,Wallet } from "lucide-react";
import { Card } from "@/shared/ui/card";
import { formatMoneyAmount } from "@/shared/lib/money";
import { formatSignedMoney } from "@/features/history/history.rules";
import { HistoryFiltersPanel } from "@/features/history/components/history-filters-panel";
import { TransactionLinesTable } from "@/features/history/components/transaction-lines-table";
import { TransactionDetailModal } from "@/features/history/components/transaction-detail-modal";

export function HistoryPage() {
  const vm = useHistoryPage();
  const {
    view,
    setView,
    setSubaccountView,
    detail,
    setDetail,
    subaccounts,
    noSubaccounts,
    selectedSubaccount,
    owner,
    totals,
    exportExcel,
    exportPDF,
  } = vm;

  return (
    <>
      <PageHeader
        title="Historial"
        description="Auditoria completa de movimientos con filtros, exportacion y detalle de transacciones."
        action={
          <div className="flex gap-2">
            <BtnOutline onClick={exportExcel}>
              <FileSpreadsheet size={14} /> Excel
            </BtnOutline>
            <BtnPrimary onClick={exportPDF}>
              <Download size={14} /> PDF
            </BtnPrimary>
          </div>
        }
      />

      {/* Vista tabs */}
      <Card className="mb-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 text-sm">
            <Wallet size={14} className="text-muted-foreground" />
            <span className="font-semibold">Vista:</span>
          </div>
          <div className="flex gap-1.5">
            {(
              [
                ["principal", "Cuenta principal"],
                ["sub", "Por subcuenta"],
              ] as const
            ).map(([k, l]) => (
              <button
                key={k}
                onClick={() => setView(k)}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold border transition ${
                  view === k
                    ? "bg-[color:var(--brand-soft)] text-[color:var(--brand-dark)] border-transparent"
                    : "bg-card hover:bg-muted"
                }`}
              >
                {l}
              </button>
            ))}
          </div>
          {view === "sub" &&
            (noSubaccounts ? (
              <span className="text-xs text-muted-foreground">Sin subcuentas asociadas</span>
            ) : (
              <select
                value={selectedSubaccount}
                onChange={(e) => setSubaccountView(e.target.value)}
                className="h-9 px-3 rounded-md border bg-card text-sm"
              >
                {subaccounts.map((s) => (
                  <option key={s.id}>{s.name}</option>
                ))}
              </select>
            ))}
          <span className="ml-auto text-xs text-muted-foreground">
            {view === "principal"
              ? "Mostrando consolidado de cuenta madre"
              : noSubaccounts
                ? "Sin subcuentas asociadas"
                : `Filtrando movimientos de ${selectedSubaccount}`}
          </span>
        </div>
      </Card>

      {/* KPIs resumen */}
      <div className="grid md:grid-cols-4 gap-5 mb-6">
        <Card className="p-5">
          <div className="text-xs text-muted-foreground mb-1">Ingresos del periodo</div>
          <div className="font-display tabular-nums text-xl md:text-2xl font-bold text-emerald-700">
            {formatMoneyAmount(totals.income)}
          </div>
          <div className="text-xs text-muted-foreground mt-1">{totals.incomeCount} líneas</div>
        </Card>
        <Card className="p-5">
          <div className="text-xs text-muted-foreground mb-1">Egresos del periodo</div>
          <div className="text-xl md:text-2xl font-bold text-foreground">
            {formatMoneyAmount(totals.expense)}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {totals.expenseCount} líneas (incluye comisiones e impuestos)
          </div>
        </Card>
        <Card className="p-5">
          <div className="text-xs text-muted-foreground mb-1">Neto</div>
          <div
            className={`font-display tabular-nums text-xl md:text-2xl font-bold ${totals.net.cents >= 0 ? "text-emerald-700" : "text-red-600"}`}
          >
            {formatSignedMoney(totals.net)}
          </div>
        </Card>
        <Card className="p-5">
          <div className="text-xs text-muted-foreground mb-1">Pendientes / Rechazados</div>
          <div className="font-display tabular-nums text-xl md:text-2xl font-bold text-foreground">
            {totals.pendingCount + totals.rejectedCount}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {totals.pendingCount} pendientes, {totals.rejectedCount} rechazadas
          </div>
        </Card>
      </div>

      {/* Filtros */}
      <HistoryFiltersPanel {...vm} />

      {/* Tabla */}
      <TransactionLinesTable {...vm} />

      <TransactionDetailModal detail={detail} owner={owner} onClose={() => setDetail(null)} />
    </>
  );
}
