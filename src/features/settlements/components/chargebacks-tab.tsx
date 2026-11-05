import { useSettlementChargebacks } from "../settlements.hooks";
import { useState } from "react";
import { Label,Select } from "@/shared/ui/form-controls";
import { formatARS } from "@/features/collections/collections.data";
import { Badge } from "@/shared/ui/badge";
import { fmtDateFull } from "@/features/settlements/settlements.rules";
import { Pagination } from "@/shared/ui/pagination";

/** 9.6 Contracargos: que venta le desconocieron y donde se le desconto. */
export function ChargebacksCompanyTab() {
  const [brand, setBrand] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const q = useSettlementChargebacks();
  const all = q.data?.contracargos ?? [];
  const brands = Array.from(new Set(all.map((c) => c.bandera ?? "—"))).sort();
  const rows = all.filter((c) => !brand || (c.bandera ?? "—") === brand);
  const pagina = rows.slice((page - 1) * pageSize, page * pageSize);
  const deuda = Number(q.data?.deuda_pendiente ?? 0);
  const tone = (e: string): "neutral" | "success" | "warn" | "danger" =>
    e === "Recuperado" || e === "Descontado" || e === "Devuelto"
      ? "success"
      : e === "Pendiente de recuperar"
        ? "danger"
        : "warn";

  return (
    <div>
      <div className="px-5 py-3 border-b flex flex-wrap items-end justify-between gap-3">
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
        <div className="text-xs text-right">
          <div className="text-muted-foreground">
            Contracargos: <b>{rows.length}</b> · Total{" "}
            <span className="font-mono font-semibold">
              {formatARS(rows.reduce((a, c) => a + Number(c.importe), 0))}
            </span>
          </div>
          {deuda > 0 && (
            <div className="text-red-700 font-semibold mt-0.5">
              Deuda pendiente: <span className="font-mono">{formatARS(deuda)}</span> · se descuenta
              de tus próximas acreditaciones
            </div>
          )}
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
              <th className="text-left px-5 py-3">Fecha</th>
              <th className="text-left px-5 py-3">Bandera</th>
              <th className="text-left px-5 py-3">Venta original</th>
              <th className="text-right px-5 py-3">Importe</th>
              <th className="text-left px-5 py-3">Lote</th>
              <th className="text-center px-5 py-3">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {q.isLoading ? (
              <tr>
                <td colSpan={6} className="px-5 py-10 text-center text-sm text-muted-foreground">
                  Cargando…
                </td>
              </tr>
            ) : q.isError ? (
              <tr>
                <td colSpan={6} className="px-5 py-10 text-center text-sm text-red-700">
                  {(q.error as Error).message}
                </td>
              </tr>
            ) : pagina.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-10 text-center text-sm text-muted-foreground">
                  No tenés contracargos.
                </td>
              </tr>
            ) : (
              pagina.map((c) => (
                <tr key={c.id} className="hover:bg-muted/30">
                  <td className="px-5 py-3 text-xs">
                    {new Date(c.fecha).toLocaleDateString("es-AR")}
                  </td>
                  <td className="px-5 py-3">
                    <Badge tone="neutral">{c.bandera ?? "—"}</Badge>
                  </td>
                  <td className="px-5 py-3 text-xs">
                    {c.venta_txn ? (
                      <>
                        <div className="font-mono">{c.venta_txn}</div>
                        <div className="text-muted-foreground">
                          {c.venta_fecha ? new Date(c.venta_fecha).toLocaleDateString("es-AR") : ""}{" "}
                          · {formatARS(c.venta_monto ?? 0)}
                        </div>
                      </>
                    ) : (
                      <span className="text-muted-foreground">{c.motivo ?? "—"}</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-right font-mono tabular-nums font-semibold text-red-600">
                    - {formatARS(c.importe)}
                  </td>
                  <td className="px-5 py-3 text-xs">
                    {c.lote_codigo
                      ? `${c.lote_codigo} · ${c.lote_fecha ? fmtDateFull(c.lote_fecha) : ""}`
                      : "—"}
                  </td>
                  <td className="px-5 py-3 text-center">
                    <div className="flex flex-col items-center gap-0.5">
                      <Badge tone={tone(c.estado)}>{c.estado}</Badge>
                      {c.mediacion && (
                        <span className="text-[10px] text-muted-foreground">{c.mediacion}</span>
                      )}
                      {Number(c.pendiente_recuperar) > 0 && (
                        <span className="text-[10px] text-red-700 font-mono">
                          debe {formatARS(c.pendiente_recuperar)}
                        </span>
                      )}
                    </div>
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
    </div>
  );
}
