import { Modal } from "@/shared/ui/modal";
import { useBatchBreakdown } from "../settlements.hooks";
import jsPDF from "jspdf";
import { downloadText } from "@/shared/lib/download";
import { formatARS } from "@/features/collections/collections.data";
import { Download,FileSpreadsheet,X } from "lucide-react";
import { Badge } from "@/shared/ui/badge";
import { BtnOutline,BtnPrimary } from "@/shared/ui/button";
import "jspdf-autotable";
import { type BreakdownBatch } from "@/features/settlements/settlements.types";
import { fmtDateFull,statusCompany } from "@/features/settlements/settlements.rules";

/** Comprobante de la liquidacion de un lote (CSV o PDF). */
export function downloadReceipt(a: BreakdownBatch, formato: "csv" | "pdf") {
  const rows: [string, number][] = [
    ["Importe bruto", Number(a.bruto)],
    ["Impuestos (referencia, Payway)", -Number(a.impuestos_payway ?? 0)],
    ["Menos impuestos", Number(a.bruto) - Number(a.impuestos_payway ?? 0)],
    ["Tasa de interés PayWay", -Number(a.costo_servicio_payway ?? 0)],
    [`Tasa de interés MoliPay (${a.tasa_pct}%)`, -Number(a.tasa_monto ?? 0)],
    ...(Number(a.iva_tasa_monto ?? 0) > 0
      ? [["IVA sobre la tasa MoliPay", -Number(a.iva_tasa_monto)] as [string, number]]
      : []),
    [`Comisión cierre de lote (${a.cierre_pct ?? 0}%)`, -Number(a.cierre_monto ?? 0)],
    ...(a.impuestos ?? [])
      .filter((i) => Number(i.monto) > 0)
      .map((i): [string, number] => [`${i.nombre} (${i.codigo})`, -Number(i.monto)]),
    ["Contracargo retenido", -Number(a.retencion_contracargos ?? 0)],
    ["Compensación de adelantos", -Number(a.compensacion_adelantos ?? 0)],
    ["Recuperación de deuda", -Number(a.recuperacion_deuda ?? 0)],
    ["Importe final acreditado", Number(a.neto)],
  ];
  const name = `liquidacion_${a.codigo}`;
  if (formato === "csv") {
    const lines = [
      `Lote;${a.codigo}`,
      `Bandera;${a.bandera}`,
      `Fecha de liquidación;${fmtDateFull(a.fecha)}`,
      `Fecha de acreditación;${a.fecha_acreditacion ? fmtDateFull(a.fecha_acreditacion) : "—"}`,
      "",
      "Concepto;Importe",
      ...rows.map(([c, v]) => `${c};${v.toFixed(2).replace(".", ",")}`),
      "",
      "Ventas incluidas",
      "Fecha;Operación;Cuotas;Monto",
      ...a.ventas.map(
        (v) =>
          `${new Date(v.fecha).toLocaleString("es-AR")};${v.id_txn};${v.cuotas};${Number(v.monto).toFixed(2).replace(".", ",")}`,
      ),
    ];
    downloadText(`${name}.csv`, "\uFEFF" + lines.join("\r\n"), "text/csv;charset=utf-8");
    return;
  }
  const doc = new jsPDF();
  doc.setFontSize(14);
  doc.text(`Comprobante de liquidación · ${a.codigo}`, 14, 16);
  doc.setFontSize(9);
  doc.text(
    `${a.bandera} · Liquidación ${fmtDateFull(a.fecha)} · Acreditación ${a.fecha_acreditacion ? fmtDateFull(a.fecha_acreditacion) : "—"}`,
    14,
    23,
  );
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (doc as any).autoTable({
    startY: 28,
    head: [["Concepto", "Importe"]],
    body: rows.map(([c, v]) => [c, formatARS(v)]),
    styles: { fontSize: 8 },
  });
  if (a.ventas.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (doc as any).autoTable({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      startY: (doc as any).lastAutoTable.finalY + 6,
      head: [["Fecha", "Operación", "Cuotas", "Monto"]],
      body: a.ventas.map((v) => [
        new Date(v.fecha).toLocaleString("es-AR"),
        v.id_txn,
        String(v.cuotas),
        formatARS(v.monto),
      ]),
      styles: { fontSize: 7 },
    });
  }
  doc.save(`${name}.pdf`);
}

/**
 * Apertura de un lote para la empresa: como se formo el neto y que ventas
 * incluye. Se usa desde el calendario y desde Lotes de acreditacion.
 */
export function BreakdownBatchModal({
  loteId: batchId,
  onClose,
}: {
  loteId: string | null;
  onClose: () => void;
}) {
  const q = useBatchBreakdown(batchId);
  if (!batchId) return null;
  const a = q.data;
  const row = (label: string, v: number, fuerte = false) => (
    <div className={`flex justify-between ${fuerte ? "font-semibold border-t pt-1.5 mt-1" : ""}`}>
      <span className={fuerte ? "" : "text-muted-foreground"}>{label}</span>
      <span className={`font-mono tabular-nums ${v < 0 ? "text-red-600" : ""}`}>
        {v < 0 ? `- ${formatARS(-v)}` : formatARS(v)}
      </span>
    </div>
  );
  return (
    <Modal open onClose={onClose} size="custom" className="max-w-2xl">
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="sticky top-0 bg-card px-6 py-4 border-b flex items-center justify-between">
          <div>
            <div className="font-semibold">Liquidación del lote</div>
            {a && (
              <div className="text-xs text-muted-foreground">
                {a.codigo} · {a.bandera} · {fmtDateFull(a.fecha)}
              </div>
            )}
          </div>
          <button onClick={onClose} className="p-1 hover:bg-muted rounded">
            <X size={16} />
          </button>
        </div>
        <div className="p-6 space-y-4 text-sm">
          {q.isLoading ? (
            <p className="text-muted-foreground">Cargando…</p>
          ) : q.isError || !a ? (
            <p className="text-red-700">
              {(q.error as Error)?.message ?? "No se pudo cargar el lote"}
            </p>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <Badge tone={a.estado === "Acreditado" ? "success" : "warn"}>
                  {statusCompany(a.estado)}
                </Badge>
                {a.es_negativo && <Badge tone="danger">Negativo</Badge>}
                {a.fecha_acreditacion && (
                  <span className="text-xs text-muted-foreground">
                    Acreditado el {fmtDateFull(a.fecha_acreditacion)}
                  </span>
                )}
              </div>
              {a.origen === "archivo" ? (
                <div className="rounded-md border p-3 space-y-1">
                  {row("Importe bruto", Number(a.bruto))}
                  {row(
                    "Impuestos (referencia, informados por Payway)",
                    -Number(a.impuestos_payway ?? 0),
                  )}
                  {row("Menos impuestos", Number(a.bruto) - Number(a.impuestos_payway ?? 0))}
                  {row(
                    `Tasa de interés PayWay (${Number(a.bruto) > 0 ? Math.round((Number(a.costo_servicio_payway ?? 0) / Number(a.bruto)) * 10000) / 100 : 0}%)`,
                    -Number(a.costo_servicio_payway ?? 0),
                  )}
                  {row(`Tasa de interés MoliPay (${a.tasa_pct}%)`, -Number(a.tasa_monto ?? 0))}
                  {Number(a.iva_tasa_monto ?? 0) > 0 &&
                    row("IVA sobre la tasa MoliPay", -Number(a.iva_tasa_monto ?? 0))}
                  {row(
                    `Comisión cierre de lote (${a.cierre_pct ?? 0}%)`,
                    -Number(a.cierre_monto ?? 0),
                  )}
                  {(a.impuestos ?? [])
                    .filter((i) => Number(i.monto) > 0)
                    .map((i) => (
                      <div key={i.asignacion_id}>
                        {row(
                          `${i.nombre} (${i.codigo}${i.alicuota != null ? ` · ${i.alicuota}%` : ""})`,
                          -Number(i.monto),
                        )}
                      </div>
                    ))}
                  {Number(a.retencion_contracargos ?? 0) > 0 &&
                    row(
                      "Contracargo retenido (se libera si ganás la disputa)",
                      -Number(a.retencion_contracargos),
                    )}
                  {Number(a.compensacion_adelantos) > 0 &&
                    row("Compensación de adelantos", -Number(a.compensacion_adelantos))}
                  {Number(a.recuperacion_deuda) > 0 &&
                    row("Recuperación de deuda (contracargos)", -Number(a.recuperacion_deuda))}
                  {row(
                    a.estado === "Acreditado" ? "Importe acreditado" : "Importe final a acreditar",
                    Number(a.neto),
                    true,
                  )}
                </div>
              ) : (
                <div className="rounded-md border p-3 space-y-1">
                  {row("Bruto vendido", Number(a.bruto))}
                  {row("Neto estimado", Number(a.neto), true)}
                  <p className="text-[11px] text-muted-foreground pt-1">
                    Payway todavía no liquidó estas ventas: el neto definitivo se conoce cuando
                    llega la liquidación.
                  </p>
                </div>
              )}
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
                  Ventas incluidas ({a.ventas.length})
                </div>
                {a.ventas.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Sin ventas vinculadas.</p>
                ) : (
                  <div className="max-h-56 overflow-y-auto rounded-md border">
                    <table className="w-full text-xs">
                      <thead className="sticky top-0 bg-muted/60 text-muted-foreground">
                        <tr className="text-left">
                          <th className="px-2 py-1.5">Fecha</th>
                          <th className="px-2 py-1.5">Operación</th>
                          <th className="px-2 py-1.5">Cuotas</th>
                          <th className="px-2 py-1.5 text-right">Monto</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {a.ventas.map((v) => (
                          <tr key={v.id_txn}>
                            <td className="px-2 py-1">
                              {new Date(v.fecha).toLocaleString("es-AR", {
                                day: "2-digit",
                                month: "2-digit",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </td>
                            <td className="px-2 py-1 font-mono">{v.id_txn}</td>
                            <td className="px-2 py-1">{v.cuotas}</td>
                            <td className="px-2 py-1 text-right font-mono">{formatARS(v.monto)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
              {a.origen === "archivo" && (
                <div className="flex gap-2 pt-2">
                  <BtnOutline className="flex-1" onClick={() => downloadReceipt(a, "csv")}>
                    <FileSpreadsheet size={14} /> Comprobante CSV
                  </BtnOutline>
                  <BtnPrimary className="flex-1" onClick={() => downloadReceipt(a, "pdf")}>
                    <Download size={14} /> Comprobante PDF
                  </BtnPrimary>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </Modal>
  );
}
