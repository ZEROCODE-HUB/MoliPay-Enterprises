import { useBatchesByRange } from "../settlements.hooks";
import { useState } from "react";
import { Input,Label,Select } from "@/shared/ui/form-controls";
import { formatARS } from "@/features/collections/collections.data";
import { Badge } from "@/shared/ui/badge";
import { BtnOutline } from "@/shared/ui/button";
import { Eye } from "lucide-react";
import { fmtDateFull,rangeDefault,statusCompany } from "@/features/settlements/settlements.rules";
import { Pagination } from "@/shared/ui/pagination";
import { BreakdownBatchModal } from "./batch-breakdown-modal";

/** 9.4 Lotes de acreditacion: una fila por bandera y fecha, con su liquidacion. */
export function BatchesCreditCompanyTab() {
  const [from, setFrom] = useState(rangeDefault().desde);
  const [to, setTo] = useState(rangeDefault().hasta);
  const [brand, setBrand] = useState("");
  const [onlyChargeback, setOnlyChargeback] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [breakdown, setBreakdown] = useState<string | null>(null);
  const q = useBatchesByRange(from, to);
  const all = q.data ?? [];
  const brands = Array.from(new Set(all.map((l) => l.bandera))).sort();
  const rows = all.filter(
    (l) =>
      (!brand || l.bandera === brand) && (!onlyChargeback || l.con_contracargo || l.es_negativo),
  );
  const pagina = rows.slice((page - 1) * pageSize, page * pageSize);
  const credited = rows
    .filter((l) => l.estado === "Acreditado")
    .reduce((a, l) => a + Number(l.neto), 0);
  const descuentos = rows.reduce((a, l) => a + Number(l.descuentos), 0);

  return (
    <div>
      <div className="px-5 py-3 border-b flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <Label>Desde</Label>
            <Input
              type="date"
              value={from}
              onChange={(e) => {
                setFrom(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <div>
            <Label>Hasta</Label>
            <Input
              type="date"
              value={to}
              onChange={(e) => {
                setTo(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <div>
            <Label>Bandera</Label>
            <Select
              value={brand}
              onChange={(e) => {
                setBrand(e.target.value);
                setPage(1);
              }}
            >
              <option value="">Todas</option>
              {brands.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </Select>
          </div>
          <label className="flex items-center gap-1.5 text-xs h-10">
            <input
              type="checkbox"
              checked={onlyChargeback}
              onChange={(e) => {
                setOnlyChargeback(e.target.checked);
                setPage(1);
              }}
            />{" "}
            Con contracargo
          </label>
        </div>
        <div className="text-xs text-muted-foreground text-right">
          Acreditado en el período:{" "}
          <span className="font-mono font-semibold text-emerald-700">{formatARS(credited)}</span>
          <br />
          Descuentos totales:{" "}
          <span className="font-mono font-semibold text-red-600">- {formatARS(descuentos)}</span>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
              <th className="text-left px-5 py-3">Fecha de acreditación</th>
              <th className="text-left px-5 py-3">Bandera</th>
              <th className="text-right px-5 py-3">Bruto</th>
              <th className="text-right px-5 py-3">Descuentos</th>
              <th className="text-right px-5 py-3">Compensaciones</th>
              <th className="text-right px-5 py-3">Neto acreditado</th>
              <th className="text-center px-5 py-3">Estado</th>
              <th className="text-center px-5 py-3">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {q.isLoading ? (
              <tr>
                <td colSpan={8} className="px-5 py-10 text-center text-sm text-muted-foreground">
                  Cargando…
                </td>
              </tr>
            ) : q.isError ? (
              <tr>
                <td colSpan={8} className="px-5 py-10 text-center text-sm text-red-700">
                  {(q.error as Error).message}
                </td>
              </tr>
            ) : pagina.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-5 py-10 text-center text-sm text-muted-foreground">
                  No hay lotes de acreditación en el período.
                </td>
              </tr>
            ) : (
              pagina.map((l) => (
                <tr key={l.id} className="hover:bg-muted/30">
                  <td className="px-5 py-3 text-xs">
                    <div className="font-mono">{fmtDateFull(l.fecha_acreditacion ?? l.fecha)}</div>
                    {!l.fecha_acreditacion && (
                      <div className="text-[10px] text-muted-foreground">estimada</div>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    <Badge tone="neutral">{l.bandera}</Badge>
                  </td>
                  <td className="px-5 py-3 text-right font-mono tabular-nums">
                    {formatARS(l.bruto)}
                  </td>
                  <td className="px-5 py-3 text-right font-mono tabular-nums text-red-600">
                    - {formatARS(l.descuentos)}
                  </td>
                  <td className="px-5 py-3 text-right font-mono tabular-nums text-muted-foreground">
                    {Number(l.compensaciones) > 0 ? `- ${formatARS(l.compensaciones)}` : "—"}
                  </td>
                  <td
                    className={`px-5 py-3 text-right font-mono tabular-nums font-semibold ${Number(l.neto) < 0 ? "text-red-600" : "text-emerald-700"}`}
                  >
                    {formatARS(l.neto)}
                  </td>
                  <td className="px-5 py-3 text-center">
                    <div className="flex flex-col items-center gap-1">
                      <Badge tone={l.estado === "Acreditado" ? "success" : "warn"}>
                        {statusCompany(l.estado)}
                      </Badge>
                      {(l.es_negativo || l.con_contracargo) && (
                        <Badge tone="danger">Contracargo</Badge>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-3 text-center">
                    <BtnOutline className="h-8 px-2.5 text-xs" onClick={() => setBreakdown(l.id)}>
                      <Eye size={13} /> Ver apertura
                    </BtnOutline>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <Pagination
        page={page}
        pageSize={pageSize}
        total={rows.length}
        onPageChange={setPage}
        onPageSizeChange={(n) => {
          setPageSize(n);
          setPage(1);
        }}
      />
      <BreakdownBatchModal loteId={breakdown} onClose={() => setBreakdown(null)} />
    </div>
  );
}
