import { Download,FileSpreadsheet } from "lucide-react";
import { Card } from "@/shared/ui/card";
import { Input,Select } from "@/shared/ui/form-controls";
import { BtnOutline,BtnPrimary } from "@/shared/ui/button";
import { LINE_KIND_OPTIONS,OPERATION_FILTERS } from "../history.rules";
import type { LineKind } from "../history.types";

import type { HistoryPageVm } from "./use-history-page";

export function HistoryFiltersPanel({
  fromDate,
  setFromDate,
  toDate,
  setToDate,
  lineKind,
  setLineKind,
  operation,
  setOperation,
  noSubaccounts,
  subaccountFilter,
  setSubaccountFilter,
  subaccounts,
  searchCbu,
  setSearchCbu,
  searchCuit,
  setSearchCuit,
  searchTxid,
  setSearchTxid,
  searchRecipient,
  setSearchRecipient,
  loading,
  total,
  clearFilters,
  exportExcel,
  exportPDF,
}: Pick<
  HistoryPageVm,
  | "fromDate"
  | "setFromDate"
  | "toDate"
  | "setToDate"
  | "lineKind"
  | "setLineKind"
  | "operation"
  | "setOperation"
  | "noSubaccounts"
  | "subaccountFilter"
  | "setSubaccountFilter"
  | "subaccounts"
  | "searchCbu"
  | "setSearchCbu"
  | "searchCuit"
  | "setSearchCuit"
  | "searchTxid"
  | "setSearchTxid"
  | "searchRecipient"
  | "setSearchRecipient"
  | "loading"
  | "total"
  | "clearFilters"
  | "exportExcel"
  | "exportPDF"
>) {
  return (
    <Card className="mb-6">
      <div className="flex flex-wrap items-end gap-4 mb-5">
        <div className="min-w-0">
          <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
            Fecha de inicio
          </label>
          <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
        </div>
        <div className="min-w-0">
          <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
            Fecha de fin
          </label>
          <Input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            min={fromDate || undefined}
          />
        </div>
        <div className="min-w-0">
          <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
            Tipo de movimiento
          </label>
          <Select
            value={lineKind}
            onChange={(e) => setLineKind(e.target.value as LineKind | "all")}
            className="sm:w-auto sm:min-w-[150px]"
          >
            {LINE_KIND_OPTIONS.map(({ key, label }) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </Select>
        </div>
        <div className="min-w-0">
          <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
            Operación
          </label>
          <Select
            value={operation}
            onChange={(e) => setOperation(e.target.value)}
            className="sm:w-auto sm:min-w-[170px]"
          >
            {OPERATION_FILTERS.map(({ key, label }) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </Select>
        </div>
        <div className="min-w-0">
          <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
            Subcuenta
          </label>
          {noSubaccounts ? (
            <span className="inline-flex h-10 items-center text-xs text-muted-foreground">
              Sin subcuentas asociadas
            </span>
          ) : (
            <Select
              value={subaccountFilter}
              onChange={(e) => setSubaccountFilter(e.target.value)}
              className="sm:w-auto sm:min-w-[150px]"
            >
              <option value="">Todas</option>
              {subaccounts.map((s) => (
                <option key={s.id}>{s.name}</option>
              ))}
            </Select>
          )}
        </div>
      </div>

      <div className="border-t pt-4 mb-4">
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          Busquedas especificas
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs text-muted-foreground mb-1">CBU / CVU</label>
            <Input
              placeholder="Buscar por CBU/CVU..."
              value={searchCbu}
              onChange={(e) => setSearchCbu(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">CUIT</label>
            <Input
              placeholder="Buscar por CUIT..."
              value={searchCuit}
              onChange={(e) => setSearchCuit(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">TXID / N° Operacion</label>
            <Input
              placeholder="Buscar por TXID..."
              value={searchTxid}
              onChange={(e) => setSearchTxid(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Nombre destino</label>
            <Input
              placeholder="Buscar por nombre destino..."
              value={searchRecipient}
              onChange={(e) => setSearchRecipient(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center border-t pt-4">
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span>{loading ? "Cargando..." : `${total} líneas`}</span>
        </div>
        <div className="flex gap-2">
          <BtnOutline className="h-8 px-4 text-xs" onClick={clearFilters}>
            Limpiar filtros
          </BtnOutline>
          <BtnOutline className="h-8 px-4 text-xs" onClick={exportExcel}>
            <FileSpreadsheet size={13} /> Excel
          </BtnOutline>
          <BtnPrimary className="h-8 px-4 text-xs" onClick={exportPDF}>
            <Download size={13} /> PDF
          </BtnPrimary>
        </div>
      </div>
    </Card>
  );
}
