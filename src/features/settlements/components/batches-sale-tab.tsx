import { Modal } from "@/shared/ui/modal";
import { useSaleDetail,useSalesByDay } from "../settlements.hooks";
import { useState } from "react";
import { Input,Label,Select } from "@/shared/ui/form-controls";
import { formatARS } from "@/features/collections/collections.data";
import { Badge } from "@/shared/ui/badge";
import { BtnOutline } from "@/shared/ui/button";
import { Eye,X } from "lucide-react";
import { fmtDateFull,isoLocal,statusCompany } from "@/features/settlements/settlements.rules";
import { type SaleDayCompany } from "@/features/settlements/settlements.types";
import { Pagination } from "@/shared/ui/pagination";

/** 9.3 Lotes de venta por dia: cuanto vendio, sin importar cuando cobra. */
export function BatchesSaleCompanyTab() {
  const h = new Date();
  const ini = new Date(h);
  ini.setDate(ini.getDate() - 30);
  const [from, setFrom] = useState(isoLocal(ini));
  const [to, setTo] = useState(isoLocal(h));
  const [brand, setBrand] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [detail, setDetail] = useState<SaleDayCompany | null>(null);
  const q = useSalesByDay(from, to);
  const det = useSaleDetail(detail?.fecha);
  const all = q.data ?? [];
  const brands = Array.from(new Set(all.flatMap((r) => Object.keys(r.por_bandera ?? {})))).sort();
  const rows = all.filter((r) => !brand || (r.por_bandera ?? {})[brand] != null);
  const pagina = rows.slice((page - 1) * pageSize, page * pageSize);
  const totalGross = rows.reduce((a, r) => a + Number(r.bruto), 0);

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
        </div>
        <div className="text-xs text-muted-foreground">
          Vendido en el período:{" "}
          <span className="font-mono font-semibold">{formatARS(totalGross)}</span>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
              <th className="text-left px-5 py-3">Fecha</th>
              <th className="text-right px-5 py-3">Ventas</th>
              <th className="text-right px-5 py-3">Rechazos</th>
              <th className="text-right px-5 py-3">Bruto vendido</th>
              <th className="text-left px-5 py-3">Por bandera</th>
              <th className="text-left px-5 py-3">Cobro estimado</th>
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
                  No se encontraron ventas en el período.
                </td>
              </tr>
            ) : (
              pagina.map((r) => (
                <tr key={r.fecha} className="hover:bg-muted/30">
                  <td className="px-5 py-3 text-xs">{fmtDateFull(r.fecha)}</td>
                  <td className="px-5 py-3 text-right font-mono tabular-nums">{r.ventas}</td>
                  <td className="px-5 py-3 text-right font-mono tabular-nums text-muted-foreground">
                    {r.rechazos}
                  </td>
                  <td className="px-5 py-3 text-right font-mono tabular-nums font-semibold">
                    {formatARS(r.bruto)}
                  </td>
                  <td className="px-5 py-3 text-xs">
                    {Object.entries(r.por_bandera ?? {}).map(([b, v]) => (
                      <div key={b}>
                        <span className="text-muted-foreground">{b}:</span>{" "}
                        <span className="font-mono">{formatARS(Number(v))}</span>
                      </div>
                    ))}
                  </td>
                  <td className="px-5 py-3 text-xs">
                    {r.proxima_acreditacion ? fmtDateFull(r.proxima_acreditacion) : "—"}
                  </td>
                  <td className="px-5 py-3 text-center">
                    <Badge tone={r.estado === "Abierto" ? "warn" : "neutral"}>{r.estado}</Badge>
                  </td>
                  <td className="px-5 py-3 text-center">
                    <BtnOutline className="h-8 px-2.5 text-xs" onClick={() => setDetail(r)}>
                      <Eye size={13} /> Ver detalle
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

      {detail && (
        <Modal open onClose={() => setDetail(null)} size="custom" className="max-w-3xl">
          <div className="min-h-0 flex-1 overflow-y-auto">
            <div className="sticky top-0 bg-card px-6 py-4 border-b flex items-center justify-between">
              <div>
                <div className="font-semibold">Ventas del {fmtDateFull(detail.fecha)}</div>
                <div className="text-xs text-muted-foreground">
                  {detail.ventas} ventas · {formatARS(detail.bruto)} · {detail.estado}
                </div>
              </div>
              <button onClick={() => setDetail(null)} className="p-1 hover:bg-muted rounded">
                <X size={16} />
              </button>
            </div>
            <div className="p-6">
              {det.isLoading ? (
                <p className="text-sm text-muted-foreground">Cargando…</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-xs uppercase tracking-wider text-muted-foreground">
                      <th className="text-left py-2 pr-3">Hora</th>
                      <th className="text-left py-2 pr-3">Operación</th>
                      <th className="text-left py-2 pr-3">Bandera</th>
                      <th className="text-right py-2 pr-3">Cuotas</th>
                      <th className="text-right py-2 pr-3">Monto</th>
                      <th className="text-left py-2 pr-3">Estado</th>
                      <th className="text-left py-2">Se cobra en</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {(det.data ?? []).map((v) => (
                      <tr key={v.id}>
                        <td className="py-2 pr-3 text-xs">
                          {new Date(v.fecha).toLocaleTimeString("es-AR", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>
                        <td className="py-2 pr-3 font-mono text-xs">{v.id_txn}</td>
                        <td className="py-2 pr-3">{v.bandera ?? "—"}</td>
                        <td className="py-2 pr-3 text-right">{v.cuotas}</td>
                        <td className="py-2 pr-3 text-right font-mono">{formatARS(v.monto)}</td>
                        <td className="py-2 pr-3">
                          <Badge tone="success">{v.estado}</Badge>
                        </td>
                        <td className="py-2 text-xs">
                          {v.lote
                            ? `${fmtDateFull(v.lote.fecha)} · ${statusCompany(v.lote.estado)}`
                            : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
