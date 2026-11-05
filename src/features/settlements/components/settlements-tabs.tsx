import {
ArrowUpRight,
CalendarDays,
CheckCircle2,
FileSpreadsheet,
FileText,
Percent,
} from "lucide-react";

import type { SettlementsPageVm } from "./use-settlements-page";

export function SettlementsTabs({
  setActiveTab,
  activeTab,
  tickets,
}: Pick<SettlementsPageVm, "setActiveTab" | "activeTab" | "tickets">) {
  return (
    <div className="flex border-b">
      <button
        onClick={() => setActiveTab("calendario")}
        className={`flex-1 px-5 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
          activeTab === "calendario"
            ? "border-b-2 border-primary text-primary bg-muted/30"
            : "text-muted-foreground hover:text-foreground hover:bg-muted/20"
        }`}
      >
        <CalendarDays size={15} /> Calendario de acreditaciones
      </button>
      <button
        onClick={() => setActiveTab("tickets")}
        className={`flex-1 px-5 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
          activeTab === "tickets"
            ? "border-b-2 border-primary text-primary bg-muted/30"
            : "text-muted-foreground hover:text-foreground hover:bg-muted/20"
        }`}
      >
        <FileText size={15} /> Adelantos
        {tickets.length > 0 && (
          <span className="ml-1 px-1.5 py-0.5 rounded-full bg-muted text-[10px] font-semibold">
            {tickets.length}
          </span>
        )}
      </button>
      <button
        onClick={() => setActiveTab("acreditaciones")}
        className={`flex-1 px-5 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
          activeTab === "acreditaciones"
            ? "border-b-2 border-primary text-primary bg-muted/30"
            : "text-muted-foreground hover:text-foreground hover:bg-muted/20"
        }`}
      >
        <CheckCircle2 size={15} /> Lotes de acreditación
      </button>
      <button
        onClick={() => setActiveTab("lotes-venta")}
        className={`flex-1 px-5 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
          activeTab === "lotes-venta"
            ? "border-b-2 border-primary text-primary bg-muted/30"
            : "text-muted-foreground hover:text-foreground hover:bg-muted/20"
        }`}
      >
        <FileSpreadsheet size={15} /> Lotes de venta
      </button>
      <button
        onClick={() => setActiveTab("contracargos")}
        className={`flex-1 px-5 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
          activeTab === "contracargos"
            ? "border-b-2 border-primary text-primary bg-muted/30"
            : "text-muted-foreground hover:text-foreground hover:bg-muted/20"
        }`}
      >
        <ArrowUpRight size={15} /> Contracargos
      </button>
      <button
        onClick={() => setActiveTab("comisiones")}
        className={`flex-1 px-5 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
          activeTab === "comisiones"
            ? "border-b-2 border-primary text-primary bg-muted/30"
            : "text-muted-foreground hover:text-foreground hover:bg-muted/20"
        }`}
      >
        <Percent size={15} /> Comisiones
      </button>
    </div>
  );
}
