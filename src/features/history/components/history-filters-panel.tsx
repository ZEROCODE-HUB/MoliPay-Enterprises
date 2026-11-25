import {
  ClearFiltersButton,
  FilterBar,
  FilterField,
  filterControlCls,
} from "@/shared/ui/filter-bar";
import { LINE_KIND_OPTIONS, OPERATION_FILTERS } from "../history.rules";
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
  const active = [
    searchCbu,
    searchCuit,
    searchTxid,
    searchRecipient,
    subaccountFilter,
    lineKind !== "all" ? lineKind : "",
  ].filter(Boolean).length;
  const text = (value: string, set: (v: string) => void, label: string, placeholder: string) => (
    <FilterField label={label} className="min-w-[160px] flex-1">
      <input
        value={value}
        onChange={(e) => set(e.target.value)}
        placeholder={placeholder}
        className={`${filterControlCls} w-full placeholder:text-muted-foreground/60`}
      />
    </FilterField>
  );
  return (
    <FilterBar>
      <FilterField label="Fecha">
        <div className="flex items-center gap-1.5">
          <input
            type="date"
            aria-label="Fecha de inicio"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className={`${filterControlCls} w-[150px] px-2`}
          />
          <span className="text-xs text-muted-foreground">a</span>
          <input
            type="date"
            aria-label="Fecha de fin"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            min={fromDate || undefined}
            className={`${filterControlCls} w-[150px] px-2`}
          />
        </div>
      </FilterField>
      <FilterField label="Tipo">
        <select
          value={lineKind}
          onChange={(e) => setLineKind(e.target.value as LineKind | "all")}
          className={`${filterControlCls} min-w-[150px]`}
        >
          {LINE_KIND_OPTIONS.map(({ key, label }) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
      </FilterField>
      <FilterField label="Operación">
        <select
          value={operation}
          onChange={(e) => setOperation(e.target.value)}
          className={`${filterControlCls} min-w-[170px]`}
        >
          {OPERATION_FILTERS.map(({ key, label }) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
      </FilterField>
      {!noSubaccounts && (
        <FilterField label="Subcuenta">
          <select
            value={subaccountFilter}
            onChange={(e) => setSubaccountFilter(e.target.value)}
            className={`${filterControlCls} min-w-[150px]`}
          >
            <option value="">Todas</option>
            {subaccounts.map((s) => (
              <option key={s.id}>{s.name}</option>
            ))}
          </select>
        </FilterField>
      )}
      {text(searchCbu, setSearchCbu, "CBU / CVU", "22 dígitos o alias")}
      {text(searchCuit, setSearchCuit, "CUIT", "Sin guiones")}
      {text(searchTxid, setSearchTxid, "TXID / N° de operación", "TXID")}
      {text(searchRecipient, setSearchRecipient, "Nombre destino", "Nombre")}
      {active > 0 && <ClearFiltersButton onClick={clearFilters} count={active} />}
      <span className="ml-auto self-center text-xs tabular-nums text-muted-foreground">
        {loading ? "Cargando…" : `${total} líneas`}
      </span>
    </FilterBar>
  );
}
