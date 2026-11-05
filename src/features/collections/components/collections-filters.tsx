import { FileSpreadsheet,Download } from "lucide-react";
import { BtnOutline } from "@/shared/ui/button";
import { Input,Label } from "@/shared/ui/form-controls";
import { periodFilter } from "@/features/collections/collections.data";
import { presets } from "@/features/collections/collections.rules";
import type { CollectionsPageVm } from "./use-collections-page";

export function CollectionsFilters({
  setFilter,
  filter,
  customFrom,
  setCustomFrom,
  customTo,
  setCustomTo,
  exportExcel,
  exportPDF,
}: Pick<
  CollectionsPageVm,
  | "setFilter"
  | "filter"
  | "customFrom"
  | "setCustomFrom"
  | "customTo"
  | "setCustomTo"
  | "exportExcel"
  | "exportPDF"
>) {
  return (
    <div className="flex flex-wrap gap-2 mb-6">
      {presets.map((p) => (
        <button
          key={p.days}
          onClick={() => setFilter(periodFilter(p.label, p.days))}
          className={
            "px-4 py-2 rounded-lg text-xs font-semibold border transition " +
            (filter.label === p.label
              ? "bg-navy-50 text-navy-600 border-transparent"
              : "bg-card hover:bg-muted")
          }
        >
          {p.label}
        </button>
      ))}
      <div className="flex items-center gap-2 ml-auto">
        <div className="flex items-center gap-1.5">
          <Label>Desde</Label>
          <Input
            type="date"
            value={customFrom}
            onChange={(e) => {
              setCustomFrom(e.target.value);
              if (e.target.value && customTo) {
                setFilter(
                  periodFilter(
                    "Personalizado",
                    undefined,
                    new Date(e.target.value),
                    new Date(customTo),
                  ),
                );
              }
            }}
            className="h-9 w-36 text-xs"
          />
        </div>
        <div className="flex items-center gap-1.5">
          <Label>Hasta</Label>
          <Input
            type="date"
            value={customTo}
            onChange={(e) => {
              setCustomTo(e.target.value);
              if (customFrom && e.target.value) {
                setFilter(
                  periodFilter(
                    "Personalizado",
                    undefined,
                    new Date(customFrom),
                    new Date(e.target.value),
                  ),
                );
              }
            }}
            className="h-9 w-36 text-xs"
          />
        </div>
      </div>
      <BtnOutline className="h-9 px-3 text-xs" onClick={exportExcel}>
        <FileSpreadsheet size={14} /> Excel
      </BtnOutline>
      <BtnOutline className="h-9 px-3 text-xs" onClick={exportPDF}>
        <Download size={14} /> PDF
      </BtnOutline>
    </div>
  );
}
