import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Wallet,
  Clock,
  CalendarDays,
  TrendingUp,
  ArrowUpRight,
  FileText,
  Download,
  FileSpreadsheet,
  Plus,
  Eye,
  X,
  Percent,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from "lucide-react";
import {
  PageHeader,
  Card,
  BtnPrimary,
  BtnOutline,
  Badge,
  Input,
  Label,
} from "@/components/portal-shell";
import { toast } from "sonner";
import { requireSupabase } from "@/lib/supabase";
import { formatARS } from "@/data/cobros-masivos";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import "jspdf-autotable";

export const Route = createFileRoute("/app/liquidaciones")({ component: Liquidaciones });

// pendiente = Solicitado, aprobado = Oferta recibida (con tasa). La empresa
// acepta o cancela; MoliPay acredita; el sistema lo marca Compensado cuando
// ya se descontó de las liquidaciones siguientes.
type TicketEstado = "pendiente" | "aprobado" | "aceptado" | "cancelado" | "rechazado" | "acreditado" | "compensado";
type Ticket = {
  id: string;
  fullId?: string;
  fecha: string;
  montoSolicitado: number;
  montoPorAcreditar: number;
  fechaAcreditacion: string;
  estado: TicketEstado;
  motivo?: string;
  tasaInteres?: number | null;
  plazoAdelantado?: number | null;
  /** Monto aprobado en la oferta. */
  montoOfertado?: number | null;
  /** Descuento por tasa (monto × tasa). */
  descuento?: number | null;
  /** Lo que se acredita en la cuenta. */
  netoARecibir?: number | null;
  /** Ya descontado de liquidaciones posteriores. */
  compensado?: number;
  rechazoMotivo?: string | null;
};

/** Tope y condiciones para pedir un adelanto (RPC adelanto_tope). */
type TopeAdelanto = {
  tope: number;
  vendidoNoAcreditado: number;
  adelantosVigentes: number;
  cumpleAntiguedad: boolean;
  antiguedadDias: number | null;
  antiguedadMinima: number;
  deuda: number;
};

type DiaAcreditacion = {
  date: string; // YYYY-MM-DD
  label: string; // DD/MM
  monto: number;
  cantidad: number;
};

type LoteVenta = {
  id: string;
  fecha: string;
  bandera: string;
  cantidadOperaciones: number;
  montoOperaciones: number;
  comision: number;
  impuesto: number;
  montoCobrado: number;
};

type LoteAcredDetalle = {
  id: string;
  fullId?: string;
  fecha: string;
  fechaAcreditacion?: string;
  fechaCobroReal?: string | null;
  bandera: string;
  cantidadOperaciones: number;
  importeNeto: number;
  comisionCierrePct: number | null;
  comisionCierreMonto: number | null;
  estado?: string;
};

type ComisionBandera = {
  bandera: string;
  cuotas: number;
  tasaMensual: number;
  estado: string;
};

type Impuesto = {
  id: string;
  codigo: string;
  descripcion: string;
  tipo: string;
  alicuota: number;
  estado: string;
};

type Excepcion = {
  impuestoCodigo: string;
  motivo: string;
  estado: string;
  vigenciaHasta: string | null;
};

const ESTADO_TICKET_LABEL: Record<TicketEstado, string> = {
  pendiente: "Solicitado",
  aprobado: "Oferta recibida",
  aceptado: "Aceptado",
  cancelado: "Cancelado",
  rechazado: "Rechazado",
  acreditado: "Acreditado",
  compensado: "Compensado",
};
const ESTADO_TICKET_TONE: Record<TicketEstado, "neutral" | "success" | "warn" | "danger"> = {
  pendiente: "warn",
  aprobado: "warn",
  aceptado: "neutral",
  cancelado: "neutral",
  rechazado: "danger",
  acreditado: "success",
  compensado: "success",
};

/** Lo que falta descontar de un adelanto acreditado. */
function pendienteCompensar(t: Ticket) {
  if (t.estado !== "acreditado" && t.estado !== "compensado") return 0;
  return Math.max(0, Number(t.montoOfertado ?? t.montoSolicitado) - Number(t.compensado ?? 0));
}

function fmtDate(iso: string) {
  if (!iso) return "—";
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" });
}
function fmtDateFull(iso: string) {
  if (!iso) return "—";
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });
}
function toISO(d: Date) {
  return d.toISOString().slice(0, 10);
}
function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

type TabSeccion = "calendario" | "tickets" | "lotes-venta" | "comisiones" | "acreditaciones" | "contracargos";

// ============================================================================
// CalendarioAcreditacionesTab
// ============================================================================
// Grilla mensual 7×N con desglose del día. Mismo shape que la pantalla
// admin/calendario-acreditaciones pero filtrado al comercio del usuario
// logueado y con textos/acciones del lado commerce.
//
// Datos: consume las RPCs `calendario_acreditaciones_v2`,
// `calendario_adelantos_por_dia`, `calendario_exportar_dia` y
// `calendario_resumen_saldos` (las 4 viven en el mismo proyecto Supabase).
// ============================================================================

const DIAS_SEMANA_CAL = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const MESES_CAL = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

function isoLocal(d: Date) {
  const p = (x: number) => String(x).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

type DiaCalV3 = { fecha: string; no_habil: boolean; programado: number; acreditado: number; total: number };

type LoteEmpresa = {
  id: string;
  codigo: string;
  fecha: string;
  bandera: string;
  origen: "venta" | "archivo";
  estado: string;
  fecha_acreditacion: string | null;
  cantidad_operaciones: number;
  bruto: number;
  descuentos: number;
  compensaciones: number;
  neto: number;
  es_negativo: boolean;
  con_contracargo: boolean;
};

type AperturaLote = {
  id: string;
  codigo: string;
  fecha: string;
  bandera: string;
  estado: string;
  origen: "venta" | "archivo";
  establecimiento: string | null;
  fecha_acreditacion: string | null;
  bruto: number;
  costo_servicio_payway: number | null;
  impuestos_payway: number | null;
  neto_payway: number | null;
  tasa_pct: number;
  tasa_monto: number;
  iva_tasa_monto: number | null;
  cierre_pct: number | null;
  cierre_monto: number | null;
  impuestos: { asignacion_id: string; codigo: string; nombre: string; alicuota: number | null; monto: number }[] | null;
  retencion_contracargos: number | null;
  compensacion_adelantos: number;
  recuperacion_deuda: number;
  neto: number;
  es_negativo: boolean;
  ventas: { id_txn: string; fecha: string; bandera: string | null; cuotas: number; monto: number; tipo: string }[];
};

/** Para la empresa un lote es Programado (Payway todavia no pago o falta acreditar) o Acreditado. */
function estadoEmpresa(estado: string): "Programada" | "Acreditada" {
  return estado === "Acreditado" ? "Acreditada" : "Programada";
}

async function cargarApertura(loteId: string): Promise<AperturaLote> {
  const sb = requireSupabase();
  const { data, error } = await sb.rpc("comercio_lote_apertura", { p_lote_id: loteId });
  if (error) throw new Error(error.message);
  return data as AperturaLote;
}

/** Comprobante de la liquidacion de un lote (CSV o PDF). */
function descargarComprobante(a: AperturaLote, formato: "csv" | "pdf") {
  const filas: [string, number][] = [
    ["Importe bruto", Number(a.bruto)],
    ["Impuestos (referencia, Payway)", -Number(a.impuestos_payway ?? 0)],
    ["Menos impuestos", Number(a.bruto) - Number(a.impuestos_payway ?? 0)],
    ["Tasa de interés PayWay", -Number(a.costo_servicio_payway ?? 0)],
    [`Tasa de interés MoliPay (${a.tasa_pct}%)`, -Number(a.tasa_monto ?? 0)],
    ...(Number(a.iva_tasa_monto ?? 0) > 0 ? [["IVA sobre la tasa MoliPay", -Number(a.iva_tasa_monto)] as [string, number]] : []),
    [`Comisión cierre de lote (${a.cierre_pct ?? 0}%)`, -Number(a.cierre_monto ?? 0)],
    ...(a.impuestos ?? []).filter((i) => Number(i.monto) > 0).map((i): [string, number] => [`${i.nombre} (${i.codigo})`, -Number(i.monto)]),
    ["Contracargo retenido", -Number(a.retencion_contracargos ?? 0)],
    ["Compensación de adelantos", -Number(a.compensacion_adelantos ?? 0)],
    ["Recuperación de deuda", -Number(a.recuperacion_deuda ?? 0)],
    ["Importe final acreditado", Number(a.neto)],
  ];
  const nombre = `liquidacion_${a.codigo}`;
  if (formato === "csv") {
    const lineas = [
      `Lote;${a.codigo}`,
      `Bandera;${a.bandera}`,
      `Fecha de liquidación;${fmtDateFull(a.fecha)}`,
      `Fecha de acreditación;${a.fecha_acreditacion ? fmtDateFull(a.fecha_acreditacion) : "—"}`,
      "",
      "Concepto;Importe",
      ...filas.map(([c, v]) => `${c};${v.toFixed(2).replace(".", ",")}`),
      "",
      "Ventas incluidas",
      "Fecha;Operación;Cuotas;Monto",
      ...a.ventas.map((v) => `${new Date(v.fecha).toLocaleString("es-AR")};${v.id_txn};${v.cuotas};${Number(v.monto).toFixed(2).replace(".", ",")}`),
    ];
    const blob = new Blob(["\uFEFF" + lineas.join("\r\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const el = document.createElement("a");
    el.href = url;
    el.download = `${nombre}.csv`;
    el.click();
    URL.revokeObjectURL(url);
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
    body: filas.map(([c, v]) => [c, formatARS(v)]),
    styles: { fontSize: 8 },
  });
  if (a.ventas.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (doc as any).autoTable({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      startY: (doc as any).lastAutoTable.finalY + 6,
      head: [["Fecha", "Operación", "Cuotas", "Monto"]],
      body: a.ventas.map((v) => [new Date(v.fecha).toLocaleString("es-AR"), v.id_txn, String(v.cuotas), formatARS(v.monto)]),
      styles: { fontSize: 7 },
    });
  }
  doc.save(`${nombre}.pdf`);
}

/**
 * Apertura de un lote para la empresa: como se formo el neto y que ventas
 * incluye. Se usa desde el calendario y desde Lotes de acreditacion.
 */
function AperturaLoteModal({ loteId, onClose }: { loteId: string | null; onClose: () => void }) {
  const q = useQuery({ queryKey: ["empresa-lote-apertura", loteId], queryFn: () => cargarApertura(loteId!), enabled: !!loteId });
  if (!loteId) return null;
  const a = q.data;
  const fila = (label: string, v: number, fuerte = false) => (
    <div className={`flex justify-between ${fuerte ? "font-semibold border-t pt-1.5 mt-1" : ""}`}>
      <span className={fuerte ? "" : "text-muted-foreground"}>{label}</span>
      <span className={`font-mono tabular-nums ${v < 0 ? "text-red-600" : ""}`}>{v < 0 ? `- ${formatARS(-v)}` : formatARS(v)}</span>
    </div>
  );
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-card rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl">
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
            <p className="text-red-700">{(q.error as Error)?.message ?? "No se pudo cargar el lote"}</p>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <Badge tone={a.estado === "Acreditado" ? "success" : "warn"}>{estadoEmpresa(a.estado)}</Badge>
                {a.es_negativo && <Badge tone="danger">Negativo</Badge>}
                {a.fecha_acreditacion && <span className="text-xs text-muted-foreground">Acreditado el {fmtDateFull(a.fecha_acreditacion)}</span>}
              </div>
              {a.origen === "archivo" ? (
                <div className="rounded-md border p-3 space-y-1">
                  {fila("Importe bruto", Number(a.bruto))}
                  {fila("Impuestos (referencia, informados por Payway)", -Number(a.impuestos_payway ?? 0))}
                  {fila("Menos impuestos", Number(a.bruto) - Number(a.impuestos_payway ?? 0))}
                  {fila(
                    `Tasa de interés PayWay (${Number(a.bruto) > 0 ? Math.round((Number(a.costo_servicio_payway ?? 0) / Number(a.bruto)) * 10000) / 100 : 0}%)`,
                    -Number(a.costo_servicio_payway ?? 0),
                  )}
                  {fila(`Tasa de interés MoliPay (${a.tasa_pct}%)`, -Number(a.tasa_monto ?? 0))}
                  {Number(a.iva_tasa_monto ?? 0) > 0 && fila("IVA sobre la tasa MoliPay", -Number(a.iva_tasa_monto ?? 0))}
                  {fila(`Comisión cierre de lote (${a.cierre_pct ?? 0}%)`, -Number(a.cierre_monto ?? 0))}
                  {(a.impuestos ?? []).filter((i) => Number(i.monto) > 0).map((i) => (
                    <div key={i.asignacion_id}>{fila(`${i.nombre} (${i.codigo}${i.alicuota != null ? ` · ${i.alicuota}%` : ""})`, -Number(i.monto))}</div>
                  ))}
                  {Number(a.retencion_contracargos ?? 0) > 0 && fila("Contracargo retenido (se libera si ganás la disputa)", -Number(a.retencion_contracargos))}
                  {Number(a.compensacion_adelantos) > 0 && fila("Compensación de adelantos", -Number(a.compensacion_adelantos))}
                  {Number(a.recuperacion_deuda) > 0 && fila("Recuperación de deuda (contracargos)", -Number(a.recuperacion_deuda))}
                  {fila(a.estado === "Acreditado" ? "Importe acreditado" : "Importe final a acreditar", Number(a.neto), true)}
                </div>
              ) : (
                <div className="rounded-md border p-3 space-y-1">
                  {fila("Bruto vendido", Number(a.bruto))}
                  {fila("Neto estimado", Number(a.neto), true)}
                  <p className="text-[11px] text-muted-foreground pt-1">
                    Payway todavía no liquidó estas ventas: el neto definitivo se conoce cuando llega la liquidación.
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
                            <td className="px-2 py-1">{new Date(v.fecha).toLocaleString("es-AR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</td>
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
                  <BtnOutline className="flex-1" onClick={() => descargarComprobante(a, "csv")}>
                    <FileSpreadsheet size={14} /> Comprobante CSV
                  </BtnOutline>
                  <BtnPrimary className="flex-1" onClick={() => descargarComprobante(a, "pdf")}>
                    <Download size={14} /> Comprobante PDF
                  </BtnPrimary>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Calendario de acreditaciones de la empresa (9.2): por dia habil, cuanto
 * esta Programado y cuanto se Acredito. Pendiente y Vencida son estados
 * internos del backoffice: la empresa los ve como Programada.
 */
function CalendarioAcreditacionesTab({
  loading: parentLoading,
  onSelectDate,
  onOpenGeneral,
}: {
  comercioId: string | null;
  loading: boolean;
  faltaCobrar: number;
  porAcreditar: number;
  adelantosEnCurso: number;
  disponible: number;
  tickets: Ticket[];
  onSelectDate: (date: string) => void;
  onClearSelection: () => void;
  onOpenGeneral: () => void;
  onOpenDetalle: (t: Ticket) => void;
}) {
  const hoy = new Date();
  const [mes, setMes] = useState(new Date(hoy.getFullYear(), hoy.getMonth(), 1));
  const [dia, setDia] = useState<string | null>(null);
  const [bandera, setBandera] = useState("");
  const [abierto, setAbierto] = useState<string | null>(null);
  const [apertura, setApertura] = useState<string | null>(null);

  const desde = isoLocal(mes);
  const hasta = isoLocal(new Date(mes.getFullYear(), mes.getMonth() + 1, 0));
  const q = useQuery({
    queryKey: ["empresa-calendario", desde, hasta],
    queryFn: async () => {
      const sb = requireSupabase();
      const { data, error } = await sb.rpc("calendario_acreditaciones_v3", { p_desde: desde, p_hasta: hasta, p_comercio_id: null });
      if (error) throw new Error(error.message);
      return ((data as { dias?: DiaCalV3[] } | null)?.dias ?? []) as DiaCalV3[];
    },
  });
  const porFecha = useMemo(() => new Map((q.data ?? []).map((d) => [d.fecha, d])), [q.data]);
  const totMes = (q.data ?? []).reduce((a, d) => ({ prog: a.prog + Number(d.programado), acr: a.acr + Number(d.acreditado) }), { prog: 0, acr: 0 });

  const lotesDia = useQuery({
    queryKey: ["empresa-calendario-dia", dia],
    enabled: !!dia,
    queryFn: async () => {
      const sb = requireSupabase();
      const { data, error } = await sb.rpc("comercio_lotes_acreditacion", { p_desde: dia, p_hasta: dia });
      if (error) throw new Error(error.message);
      return (data ?? []) as LoteEmpresa[];
    },
  });
  const ventasLote = useQuery({ queryKey: ["empresa-lote-apertura", abierto], queryFn: () => cargarApertura(abierto!), enabled: !!abierto });

  const celdas = useMemo(() => {
    const offset = (new Date(mes.getFullYear(), mes.getMonth(), 1).getDay() + 6) % 7;
    const dias = new Date(mes.getFullYear(), mes.getMonth() + 1, 0).getDate();
    const out: (string | null)[] = Array(offset).fill(null);
    for (let i = 1; i <= dias; i++) out.push(isoLocal(new Date(mes.getFullYear(), mes.getMonth(), i)));
    while (out.length % 7) out.push(null);
    return out;
  }, [mes]);

  const lotes = (lotesDia.data ?? []).filter((l) => !bandera || l.bandera === bandera);
  const banderasDia = Array.from(new Set((lotesDia.data ?? []).map((l) => l.bandera))).sort();
  const progDia = lotes.filter((l) => l.estado !== "Acreditado");
  const acrDia = lotes.filter((l) => l.estado === "Acreditado");
  const sum = (ls: LoteEmpresa[]) => ls.reduce((a, l) => a + Number(l.neto), 0);
  const hoyIso = isoLocal(hoy);

  return (
    <div className="p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="h-9 w-9 inline-flex items-center justify-center rounded-md border border-black-100 bg-white text-black-600 shadow-sm hover:bg-plata-200"
            onClick={() => setMes(new Date(mes.getFullYear(), mes.getMonth() - 1, 1))}
            aria-label="Mes anterior"
          >
            <ChevronLeft size={18} strokeWidth={2.5} />
          </button>
          <div className="min-w-[160px] text-center font-semibold">
            {MESES_CAL[mes.getMonth()]} {mes.getFullYear()}
          </div>
          <button
            type="button"
            className="h-9 w-9 inline-flex items-center justify-center rounded-md border border-black-100 bg-white text-black-600 shadow-sm hover:bg-plata-200"
            onClick={() => setMes(new Date(mes.getFullYear(), mes.getMonth() + 1, 1))}
            aria-label="Mes siguiente"
          >
            <ChevronRight size={18} strokeWidth={2.5} />
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-xs">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-amber-400" /> Programado del mes:{" "}
            <b className="font-mono">{formatARS(totMes.prog)}</b>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Acreditado del mes:{" "}
            <b className="font-mono">{formatARS(totMes.acr)}</b>
          </span>
          <BtnPrimary className="h-9 px-3 text-xs" onClick={onOpenGeneral}>
            <Plus size={14} /> Solicitar adelanto
          </BtnPrimary>
        </div>
      </div>

      {q.isLoading || parentLoading ? (
        <div className="py-10 text-center text-sm text-muted-foreground">
          <Loader2 size={16} className="inline animate-spin mr-2" /> Cargando calendario…
        </div>
      ) : q.isError ? (
        <div className="py-10 text-center text-sm text-red-700">{(q.error as Error).message}</div>
      ) : (
        <div>
          <div className="grid grid-cols-7 gap-1 text-[11px] text-muted-foreground mb-1">
            {DIAS_SEMANA_CAL.map((d) => (
              <div key={d} className="px-1 font-semibold">
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {celdas.map((f, i) => {
              if (!f) return <div key={`v${i}`} />;
              const d = porFecha.get(f);
              const noHabil = d?.no_habil ?? [0, 6].includes(new Date(`${f}T12:00:00`).getDay());
              const prog = Number(d?.programado ?? 0);
              const acr = Number(d?.acreditado ?? 0);
              return (
                <button
                  key={f}
                  type="button"
                  onClick={() => {
                    setDia(f);
                    setBandera("");
                    setAbierto(null);
                  }}
                  className={`min-h-[78px] rounded-md border p-1.5 text-left text-[11px] transition ${noHabil ? "bg-muted/50" : "bg-card hover:bg-muted/30"}`}
                >
                  <div className={`font-semibold ${f === hoyIso ? "text-primary" : "text-muted-foreground"}`}>{Number(f.slice(8))}</div>
                  {prog !== 0 && (
                    <div className="flex items-center gap-1 mt-0.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                      <span className="font-mono">{formatARS(prog)}</span>
                    </div>
                  )}
                  {acr !== 0 && (
                    <div className="flex items-center gap-1 mt-0.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      <span className="font-mono">{formatARS(acr)}</span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
          <p className="text-[11px] text-muted-foreground mt-2">
            Los sábados, domingos y feriados aparecen sombreados: los plazos de Payway son en días hábiles.
          </p>
        </div>
      )}

      {dia && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setDia(null)} />
          <div className="relative bg-card rounded-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="sticky top-0 bg-card px-6 py-4 border-b flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Acreditaciones del día</div>
                <div className="font-semibold capitalize">
                  {new Date(`${dia}T12:00:00`).toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" })}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {banderasDia.length > 1 && (
                  <select value={bandera} onChange={(e) => setBandera(e.target.value)} className="h-9 rounded-md border bg-card px-2 text-sm">
                    <option value="">Todas las banderas</option>
                    {banderasDia.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                )}
                <button onClick={() => setDia(null)} className="p-1 hover:bg-muted rounded">
                  <X size={16} />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              {lotesDia.isLoading ? (
                <p className="text-sm text-muted-foreground">Cargando…</p>
              ) : lotes.length === 0 ? (
                <div className="rounded-lg border border-dashed py-10 text-center text-sm text-muted-foreground">Sin acreditaciones este día.</div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-lg border-2 border-amber-200 bg-amber-50/50 p-4">
                      <div className="flex items-center gap-1.5 text-sm font-semibold">
                        <span className="h-2.5 w-2.5 rounded-full bg-amber-400" /> Programado
                      </div>
                      <div className="font-mono text-xl font-bold mt-1 text-amber-700">{formatARS(sum(progDia))}</div>
                      <div className="text-xs text-muted-foreground">{progDia.length} lote(s) · todavía no es saldo</div>
                    </div>
                    <div className="rounded-lg border-2 border-emerald-200 bg-emerald-50/50 p-4">
                      <div className="flex items-center gap-1.5 text-sm font-semibold">
                        <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Acreditado
                      </div>
                      <div className="font-mono text-xl font-bold mt-1 text-emerald-700">{formatARS(sum(acrDia))}</div>
                      <div className="text-xs text-muted-foreground">{acrDia.length} lote(s) · ya está en tu cuenta</div>
                    </div>
                  </div>
                  <table className="w-full text-sm">
                    <thead className="text-xs text-muted-foreground">
                      <tr className="text-left border-b">
                        <th className="py-1.5 pr-3">Bandera</th>
                        <th className="py-1.5 pr-3 text-right">Ops</th>
                        <th className="py-1.5 pr-3 text-right">Bruto</th>
                        <th className="py-1.5 pr-3 text-right">Neto</th>
                        <th className="py-1.5 pr-3">Estado</th>
                        <th className="py-1.5" />
                      </tr>
                    </thead>
                    <tbody>
                      {lotes.map((l) => (
                        <FilaLoteEmpresa
                          key={l.id}
                          l={l}
                          abierto={abierto === l.id}
                          ventas={abierto === l.id ? (ventasLote.data?.ventas ?? null) : null}
                          cargandoVentas={abierto === l.id && ventasLote.isLoading}
                          onToggle={() => setAbierto(abierto === l.id ? null : l.id)}
                          onApertura={() => setApertura(l.id)}
                        />
                      ))}
                    </tbody>
                  </table>
                  {progDia.length > 0 && dia >= hoyIso && (
                    <div className="flex items-center justify-between gap-3 rounded-lg border bg-muted/30 px-4 py-3">
                      <span className="text-sm text-muted-foreground">¿Necesitás cobrar antes? Pedí un adelanto sobre lo programado.</span>
                      <BtnPrimary
                        className="h-9 px-3 text-xs"
                        onClick={() => {
                          setDia(null);
                          onSelectDate(dia);
                        }}
                      >
                        <Plus size={14} /> Solicitar adelanto
                      </BtnPrimary>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
      <AperturaLoteModal loteId={apertura} onClose={() => setApertura(null)} />
    </div>
  );
}

function FilaLoteEmpresa({
  l,
  abierto,
  ventas,
  cargandoVentas,
  onToggle,
  onApertura,
}: {
  l: LoteEmpresa;
  abierto: boolean;
  ventas: AperturaLote["ventas"] | null;
  cargandoVentas: boolean;
  onToggle: () => void;
  onApertura: () => void;
}) {
  return (
    <>
      <tr className="border-b">
        <td className="py-2 pr-3">{l.bandera}</td>
        <td className="py-2 pr-3 text-right font-mono">{l.cantidad_operaciones}</td>
        <td className="py-2 pr-3 text-right font-mono">{formatARS(l.bruto)}</td>
        <td className={`py-2 pr-3 text-right font-mono font-semibold ${Number(l.neto) < 0 ? "text-red-600" : ""}`}>{formatARS(l.neto)}</td>
        <td className="py-2 pr-3">
          <Badge tone={l.estado === "Acreditado" ? "success" : "warn"}>{estadoEmpresa(l.estado)}</Badge>
          {(l.es_negativo || l.con_contracargo) && (
            <span className="ml-1">
              <Badge tone="danger">Contracargo</Badge>
            </span>
          )}
        </td>
        <td className="py-2 text-right whitespace-nowrap">
          <button type="button" className="text-xs text-primary hover:underline mr-3" onClick={onToggle}>
            {abierto ? "Ocultar ventas" : "Ver ventas"}
          </button>
          <button type="button" className="text-xs text-primary hover:underline" onClick={onApertura}>
            Ver liquidación
          </button>
        </td>
      </tr>
      {abierto && (
        <tr className="bg-muted/20">
          <td colSpan={6} className="px-3 py-2">
            {cargandoVentas ? (
              <p className="text-xs text-muted-foreground">Cargando ventas…</p>
            ) : !ventas || ventas.length === 0 ? (
              <p className="text-xs text-muted-foreground">Sin ventas vinculadas a este lote.</p>
            ) : (
              <table className="w-full text-xs">
                <tbody className="divide-y">
                  {ventas.map((v) => (
                    <tr key={v.id_txn}>
                      <td className="py-1 pr-3">{new Date(v.fecha).toLocaleString("es-AR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</td>
                      <td className="py-1 pr-3 font-mono">{v.id_txn}</td>
                      <td className="py-1 pr-3">{v.cuotas} cuota(s)</td>
                      <td className="py-1 text-right font-mono">{formatARS(v.monto)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </td>
        </tr>
      )}
    </>
  );
}


// ============================================================================
// Pestañas del portal que leen con RPCs del comercio (migracion 20261030140000)
// ============================================================================

function Paginador({
  page,
  pageSize,
  total,
  onPage,
  onPageSize,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPage: (p: number) => void;
  onPageSize: (n: number) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (total === 0) return null;
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-3 border-t">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span>Filas por página:</span>
        <select className="h-8 px-2 rounded border bg-card text-xs" value={pageSize} onChange={(e) => onPageSize(Number(e.target.value))}>
          {[10, 20, 50].map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
        <span>{`${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, total)} de ${total}`}</span>
      </div>
      <div className="flex gap-1">
        <BtnOutline className="h-8 px-3 text-xs" disabled={page <= 1} onClick={() => onPage(1)}>
          Primero
        </BtnOutline>
        <BtnOutline className="h-8 px-3 text-xs" disabled={page <= 1} onClick={() => onPage(page - 1)}>
          Anterior
        </BtnOutline>
        <span className="flex items-center px-3 text-xs text-muted-foreground">
          {page} / {totalPages}
        </span>
        <BtnOutline className="h-8 px-3 text-xs" disabled={page >= totalPages} onClick={() => onPage(page + 1)}>
          Siguiente
        </BtnOutline>
        <BtnOutline className="h-8 px-3 text-xs" disabled={page >= totalPages} onClick={() => onPage(totalPages)}>
          Último
        </BtnOutline>
      </div>
    </div>
  );
}

function rangoDefault() {
  const h = new Date();
  const d = new Date(h);
  d.setDate(d.getDate() - 60);
  const f = new Date(h);
  f.setDate(f.getDate() + 60);
  return { desde: isoLocal(d), hasta: isoLocal(f) };
}

/** 9.4 Lotes de acreditacion: una fila por bandera y fecha, con su liquidacion. */
function LotesAcreditacionEmpresaTab() {
  const [desde, setDesde] = useState(rangoDefault().desde);
  const [hasta, setHasta] = useState(rangoDefault().hasta);
  const [bandera, setBandera] = useState("");
  const [soloContracargo, setSoloContracargo] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [apertura, setApertura] = useState<string | null>(null);
  const q = useQuery({
    queryKey: ["empresa-lotes-acreditacion", desde, hasta],
    queryFn: async () => {
      const { data, error } = await requireSupabase().rpc("comercio_lotes_acreditacion", { p_desde: desde, p_hasta: hasta });
      if (error) throw new Error(error.message);
      return (data ?? []) as LoteEmpresa[];
    },
  });
  const todos = q.data ?? [];
  const banderas = Array.from(new Set(todos.map((l) => l.bandera))).sort();
  const filas = todos.filter((l) => (!bandera || l.bandera === bandera) && (!soloContracargo || l.con_contracargo || l.es_negativo));
  const pagina = filas.slice((page - 1) * pageSize, page * pageSize);
  const acreditado = filas.filter((l) => l.estado === "Acreditado").reduce((a, l) => a + Number(l.neto), 0);
  const descuentos = filas.reduce((a, l) => a + Number(l.descuentos), 0);

  return (
    <div>
      <div className="px-5 py-3 border-b flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <Label>Desde</Label>
            <Input type="date" value={desde} onChange={(e) => { setDesde(e.target.value); setPage(1); }} />
          </div>
          <div>
            <Label>Hasta</Label>
            <Input type="date" value={hasta} onChange={(e) => { setHasta(e.target.value); setPage(1); }} />
          </div>
          <div>
            <Label>Bandera</Label>
            <select value={bandera} onChange={(e) => { setBandera(e.target.value); setPage(1); }} className="h-10 px-3 rounded-md border bg-card text-sm">
              <option value="">Todas</option>
              {banderas.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>
          <label className="flex items-center gap-1.5 text-xs h-10">
            <input type="checkbox" checked={soloContracargo} onChange={(e) => { setSoloContracargo(e.target.checked); setPage(1); }} /> Con contracargo
          </label>
        </div>
        <div className="text-xs text-muted-foreground text-right">
          Acreditado en el período: <span className="font-mono font-semibold text-emerald-700">{formatARS(acreditado)}</span>
          <br />
          Descuentos totales: <span className="font-mono font-semibold text-red-600">- {formatARS(descuentos)}</span>
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
                    {!l.fecha_acreditacion && <div className="text-[10px] text-muted-foreground">estimada</div>}
                  </td>
                  <td className="px-5 py-3">
                    <Badge tone="neutral">{l.bandera}</Badge>
                  </td>
                  <td className="px-5 py-3 text-right font-mono tabular-nums">{formatARS(l.bruto)}</td>
                  <td className="px-5 py-3 text-right font-mono tabular-nums text-red-600">- {formatARS(l.descuentos)}</td>
                  <td className="px-5 py-3 text-right font-mono tabular-nums text-muted-foreground">
                    {Number(l.compensaciones) > 0 ? `- ${formatARS(l.compensaciones)}` : "—"}
                  </td>
                  <td className={`px-5 py-3 text-right font-mono tabular-nums font-semibold ${Number(l.neto) < 0 ? "text-red-600" : "text-emerald-700"}`}>
                    {formatARS(l.neto)}
                  </td>
                  <td className="px-5 py-3 text-center">
                    <div className="flex flex-col items-center gap-1">
                      <Badge tone={l.estado === "Acreditado" ? "success" : "warn"}>{estadoEmpresa(l.estado)}</Badge>
                      {(l.es_negativo || l.con_contracargo) && <Badge tone="danger">Contracargo</Badge>}
                    </div>
                  </td>
                  <td className="px-5 py-3 text-center">
                    <BtnOutline className="h-8 px-2.5 text-xs" onClick={() => setApertura(l.id)}>
                      <Eye size={13} /> Ver apertura
                    </BtnOutline>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <Paginador page={page} pageSize={pageSize} total={filas.length} onPage={setPage} onPageSize={(n) => { setPageSize(n); setPage(1); }} />
      <AperturaLoteModal loteId={apertura} onClose={() => setApertura(null)} />
    </div>
  );
}

type VentaDiaEmpresa = {
  fecha: string;
  ventas: number;
  rechazos: number;
  bruto: number;
  por_bandera: Record<string, number>;
  proxima_acreditacion: string | null;
  liquidado: number;
  pendiente_liquidar: number;
  estado: "Abierto" | "Cerrado";
};

type VentaDetalleEmpresa = {
  id: string;
  id_txn: string;
  fecha: string;
  bandera: string | null;
  cuotas: number;
  monto: number;
  estado: string;
  lote: { codigo: string; estado: string; fecha: string; origen: string } | null;
};

/** 9.3 Lotes de venta por dia: cuanto vendio, sin importar cuando cobra. */
function LotesVentaEmpresaTab() {
  const h = new Date();
  const ini = new Date(h);
  ini.setDate(ini.getDate() - 30);
  const [desde, setDesde] = useState(isoLocal(ini));
  const [hasta, setHasta] = useState(isoLocal(h));
  const [bandera, setBandera] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [detalle, setDetalle] = useState<VentaDiaEmpresa | null>(null);
  const q = useQuery({
    queryKey: ["empresa-ventas-dia", desde, hasta],
    queryFn: async () => {
      const { data, error } = await requireSupabase().rpc("comercio_ventas_dia", { p_desde: desde, p_hasta: hasta });
      if (error) throw new Error(error.message);
      return (data ?? []) as VentaDiaEmpresa[];
    },
  });
  const det = useQuery({
    queryKey: ["empresa-ventas-detalle", detalle?.fecha],
    enabled: !!detalle,
    queryFn: async () => {
      const { data, error } = await requireSupabase().rpc("comercio_ventas_detalle", { p_fecha: detalle!.fecha });
      if (error) throw new Error(error.message);
      return (data ?? []) as VentaDetalleEmpresa[];
    },
  });
  const todos = q.data ?? [];
  const banderas = Array.from(new Set(todos.flatMap((r) => Object.keys(r.por_bandera ?? {})))).sort();
  const filas = todos.filter((r) => !bandera || (r.por_bandera ?? {})[bandera] != null);
  const pagina = filas.slice((page - 1) * pageSize, page * pageSize);
  const totalBruto = filas.reduce((a, r) => a + Number(r.bruto), 0);

  return (
    <div>
      <div className="px-5 py-3 border-b flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <Label>Desde</Label>
            <Input type="date" value={desde} onChange={(e) => { setDesde(e.target.value); setPage(1); }} />
          </div>
          <div>
            <Label>Hasta</Label>
            <Input type="date" value={hasta} onChange={(e) => { setHasta(e.target.value); setPage(1); }} />
          </div>
          <div>
            <Label>Bandera</Label>
            <select value={bandera} onChange={(e) => { setBandera(e.target.value); setPage(1); }} className="h-10 px-3 rounded-md border bg-card text-sm">
              <option value="">Todas</option>
              {banderas.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="text-xs text-muted-foreground">
          Vendido en el período: <span className="font-mono font-semibold">{formatARS(totalBruto)}</span>
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
                  <td className="px-5 py-3 text-right font-mono tabular-nums text-muted-foreground">{r.rechazos}</td>
                  <td className="px-5 py-3 text-right font-mono tabular-nums font-semibold">{formatARS(r.bruto)}</td>
                  <td className="px-5 py-3 text-xs">
                    {Object.entries(r.por_bandera ?? {}).map(([b, v]) => (
                      <div key={b}>
                        <span className="text-muted-foreground">{b}:</span> <span className="font-mono">{formatARS(Number(v))}</span>
                      </div>
                    ))}
                  </td>
                  <td className="px-5 py-3 text-xs">{r.proxima_acreditacion ? fmtDateFull(r.proxima_acreditacion) : "—"}</td>
                  <td className="px-5 py-3 text-center">
                    <Badge tone={r.estado === "Abierto" ? "warn" : "neutral"}>{r.estado}</Badge>
                  </td>
                  <td className="px-5 py-3 text-center">
                    <BtnOutline className="h-8 px-2.5 text-xs" onClick={() => setDetalle(r)}>
                      <Eye size={13} /> Ver detalle
                    </BtnOutline>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <Paginador page={page} pageSize={pageSize} total={filas.length} onPage={setPage} onPageSize={(n) => { setPageSize(n); setPage(1); }} />

      {detalle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setDetalle(null)} />
          <div className="relative bg-card rounded-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="sticky top-0 bg-card px-6 py-4 border-b flex items-center justify-between">
              <div>
                <div className="font-semibold">Ventas del {fmtDateFull(detalle.fecha)}</div>
                <div className="text-xs text-muted-foreground">
                  {detalle.ventas} ventas · {formatARS(detalle.bruto)} · {detalle.estado}
                </div>
              </div>
              <button onClick={() => setDetalle(null)} className="p-1 hover:bg-muted rounded">
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
                        <td className="py-2 pr-3 text-xs">{new Date(v.fecha).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}</td>
                        <td className="py-2 pr-3 font-mono text-xs">{v.id_txn}</td>
                        <td className="py-2 pr-3">{v.bandera ?? "—"}</td>
                        <td className="py-2 pr-3 text-right">{v.cuotas}</td>
                        <td className="py-2 pr-3 text-right font-mono">{formatARS(v.monto)}</td>
                        <td className="py-2 pr-3">
                          <Badge tone="success">{v.estado}</Badge>
                        </td>
                        <td className="py-2 text-xs">
                          {v.lote ? `${fmtDateFull(v.lote.fecha)} · ${estadoEmpresa(v.lote.estado)}` : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

type ContracargoEmpresa = {
  id: string;
  fecha: string;
  bandera: string | null;
  venta_fecha: string | null;
  venta_txn: string | null;
  venta_monto: number | null;
  importe: number;
  motivo: string | null;
  lote_codigo: string | null;
  lote_fecha: string | null;
  estado: string;
  mediacion: string | null;
  pendiente_recuperar: number;
};

/** 9.6 Contracargos: que venta le desconocieron y donde se le desconto. */
function ContracargosEmpresaTab() {
  const [bandera, setBandera] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const q = useQuery({
    queryKey: ["empresa-contracargos"],
    queryFn: async () => {
      const { data, error } = await requireSupabase().rpc("comercio_contracargos");
      if (error) throw new Error(error.message);
      return data as { deuda_pendiente: number; contracargos: ContracargoEmpresa[] };
    },
  });
  const todos = q.data?.contracargos ?? [];
  const banderas = Array.from(new Set(todos.map((c) => c.bandera ?? "—"))).sort();
  const filas = todos.filter((c) => !bandera || (c.bandera ?? "—") === bandera);
  const pagina = filas.slice((page - 1) * pageSize, page * pageSize);
  const deuda = Number(q.data?.deuda_pendiente ?? 0);
  const tono = (e: string): "neutral" | "success" | "warn" | "danger" =>
    e === "Recuperado" || e === "Descontado" || e === "Devuelto" ? "success" : e === "Pendiente de recuperar" ? "danger" : "warn";

  return (
    <div>
      <div className="px-5 py-3 border-b flex flex-wrap items-end justify-between gap-3">
        <div>
          <Label>Bandera</Label>
          <select value={bandera} onChange={(e) => { setBandera(e.target.value); setPage(1); }} className="h-10 px-3 rounded-md border bg-card text-sm">
            <option value="">Todas</option>
            {banderas.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </div>
        <div className="text-xs text-right">
          <div className="text-muted-foreground">
            Contracargos: <b>{filas.length}</b> · Total <span className="font-mono font-semibold">{formatARS(filas.reduce((a, c) => a + Number(c.importe), 0))}</span>
          </div>
          {deuda > 0 && (
            <div className="text-red-700 font-semibold mt-0.5">
              Deuda pendiente: <span className="font-mono">{formatARS(deuda)}</span> · se descuenta de tus próximas acreditaciones
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
                  <td className="px-5 py-3 text-xs">{new Date(c.fecha).toLocaleDateString("es-AR")}</td>
                  <td className="px-5 py-3">
                    <Badge tone="neutral">{c.bandera ?? "—"}</Badge>
                  </td>
                  <td className="px-5 py-3 text-xs">
                    {c.venta_txn ? (
                      <>
                        <div className="font-mono">{c.venta_txn}</div>
                        <div className="text-muted-foreground">
                          {c.venta_fecha ? new Date(c.venta_fecha).toLocaleDateString("es-AR") : ""} · {formatARS(c.venta_monto ?? 0)}
                        </div>
                      </>
                    ) : (
                      <span className="text-muted-foreground">{c.motivo ?? "—"}</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-right font-mono tabular-nums font-semibold text-red-600">- {formatARS(c.importe)}</td>
                  <td className="px-5 py-3 text-xs">{c.lote_codigo ? `${c.lote_codigo} · ${c.lote_fecha ? fmtDateFull(c.lote_fecha) : ""}` : "—"}</td>
                  <td className="px-5 py-3 text-center">
                    <div className="flex flex-col items-center gap-0.5">
                      <Badge tone={tono(c.estado)}>{c.estado}</Badge>
                      {c.mediacion && <span className="text-[10px] text-muted-foreground">{c.mediacion}</span>}
                      {Number(c.pendiente_recuperar) > 0 && (
                        <span className="text-[10px] text-red-700 font-mono">debe {formatARS(c.pendiente_recuperar)}</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <Paginador page={page} pageSize={pageSize} total={filas.length} onPage={setPage} onPageSize={(n) => { setPageSize(n); setPage(1); }} />
    </div>
  );
}

function Liquidaciones() {
  const [loading, setLoading] = useState(true);
  const [faltaCobrar, setFaltaCobrar] = useState(0);
  const [porAcreditar, setPorAcreditar] = useState(0);
  const [adelantosEnCurso, setAdelantosEnCurso] = useState(0);
  const [disponible, setDisponible] = useState(0);
  const [comercioId, setComercioId] = useState<string | null>(null);
  const [dias, setDias] = useState<DiaAcreditacion[]>([]);
  const [diasAcreditados, setDiasAcreditados] = useState<DiaAcreditacion[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [lotesVenta, setLotesVenta] = useState<LoteVenta[]>([]);
  const [lotesAcredDetalle, setLotesAcredDetalle] = useState<LoteAcredDetalle[]>([]);
  const [lotesAcreditados, setLotesAcreditados] = useState<LoteAcredDetalle[]>([]);
  const [comisiones, setComisiones] = useState<ComisionBandera[]>([]);
  const [impuestos, setImpuestos] = useState<Impuesto[]>([]);
  const [excepciones, setExcepciones] = useState<Excepcion[]>([]);

  // tabs & paginación
  const [activeTab, setActiveTab] = useState<TabSeccion>("calendario");
  const [calPage, setCalPage] = useState(1);
  const [calPageSize, setCalPageSize] = useState(10);
  const [tickPage, setTickPage] = useState(1);
  const [tickPageSize, setTickPageSize] = useState(10);
  const [ventaPage, setVentaPage] = useState(1);
  const [ventaPageSize, setVentaPageSize] = useState(10);
  const [acredPage, setAcredPage] = useState(1);
  const [acredPageSize, setAcredPageSize] = useState(10);

  // form
  const [open, setOpen] = useState(false);
  const [monto, setMonto] = useState("");
  const [fechaAcred, setFechaAcred] = useState("");
  const [motivo, setMotivo] = useState("");
  const [saving, setSaving] = useState(false);
  const [detalle, setDetalle] = useState<Ticket | null>(null);
  const [tope, setTope] = useState<TopeAdelanto | null>(null);
  const [aceptoOferta, setAceptoOferta] = useState(false);
  // Cambia para volver a leer todo después de pedir / aceptar / cancelar.
  const [recarga, setRecarga] = useState(0);

  // Resumen del comercio (RPC comercio_liquidaciones_resumen): saldo,
  // pendiente de acreditacion, proxima acreditacion, vendido del mes,
  // adelanto a compensar y deuda por contracargos.
  const resumenQ = useQuery({
    queryKey: ["empresa-liquidaciones-resumen", recarga],
    queryFn: async () => {
      const { data, error } = await requireSupabase().rpc("comercio_liquidaciones_resumen", {});
      if (error) throw new Error(error.message);
      return data as {
        saldo_disponible: number;
        pendiente_acreditacion: number;
        proxima_acreditacion: { fecha: string; monto: number } | null;
        vendido_periodo: number;
        ventas_periodo: number;
        adelanto_pendiente_compensar: number;
        deuda_contracargos: number;
        saldo_negativo: boolean;
        ultimas_acreditaciones: { lote_id: string; codigo: string; bandera: string; fecha_acreditacion: string; neto: number }[];
        proximas_acreditaciones: { lote_id: string; codigo: string; bandera: string; fecha: string; neto: number }[];
      };
    },
  });
  const res = resumenQ.data;

  const ROWS_OPTIONS = [10, 20, 50];

  const calTotalPages = Math.max(1, Math.ceil(dias.length / calPageSize));
  const calPaginated = dias.slice((calPage - 1) * calPageSize, calPage * calPageSize);
  const tickTotalPages = Math.max(1, Math.ceil(tickets.length / tickPageSize));
  const tickPaginated = tickets.slice((tickPage - 1) * tickPageSize, tickPage * tickPageSize);
  const ventaTotalPages = Math.max(1, Math.ceil(lotesVenta.length / ventaPageSize));
  const ventaPaginated = lotesVenta.slice(
    (ventaPage - 1) * ventaPageSize,
    ventaPage * ventaPageSize,
  );
  // "Acreditaciones" lista los lotes ya acreditados con su fecha de
  // resolución. Ordenamos por fecha de resolución desc para que el más
  // reciente quede arriba.
  const acredSorted = useMemo(
    () =>
      [...lotesAcreditados].sort((a, b) => {
        const fa = a.fechaAcreditacion ?? a.fecha;
        const fb = b.fechaAcreditacion ?? b.fecha;
        return fb.localeCompare(fa);
      }),
    [lotesAcreditados],
  );
  const acredTotalPages = Math.max(1, Math.ceil(acredSorted.length / acredPageSize));
  const acredPaginated = acredSorted.slice(
    (acredPage - 1) * acredPageSize,
    acredPage * acredPageSize,
  );


  const totalSeleccionado = useMemo(() => {
    if (!selectedDate) return porAcreditar;
    const d = dias.find((x) => x.date === selectedDate);
    return d ? d.monto : porAcreditar;
  }, [selectedDate, dias, porAcreditar]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const sb = requireSupabase();
        const { data: u } = await sb.auth.getUser();
        const mail = u.user?.email ?? null;

        // 0) Resolver el legajo y el comercioId del usuario logueado.
        //    Traemos ambos valores de una vez: clientes.legajo para
        //    las tablas indexadas por legajo, y comercios.id (UUID)
        //    para las indexadas por comercio_id. Las RLS no siempre
        //    restringen por usuario en estas tablas, así que el
        //    filtrado en el front es obligatorio.
        let legajo: string | null = null;
        let comercioId: string | null = null;
        if (mail) {
          const { data: cli } = await sb
            .from("clientes")
            .select("legajo")
            .eq("correo", mail)
            .maybeSingle();
          legajo = cli?.legajo ?? null;

          if (legajo) {
            const { data: com } = await sb
              .from("comercios")
              .select("id")
              .eq("legajo", legajo)
              .maybeSingle();
            comercioId = com?.id ?? null;
            if (comercioId) setComercioId(comercioId);
          }
        }

        // 1) Falta cobrar: usamos la RPC `calendario_resumen_saldos` que es
        //    la fuente única de verdad (suma de lotes_venta sin lote_acreditacion).
        let falta = 0;
        let adelantosEnCursoCalc = 0;
        if (comercioId) {
          try {
            const { data: resumenRpc, error: rpcErr } = await sb.rpc(
              "calendario_resumen_saldos",
              { p_comercio_id: comercioId },
            );
            if (!rpcErr && resumenRpc) {
              const r = resumenRpc as Record<string, unknown>;
              falta = Number(r.falta_cobrar ?? 0);
              adelantosEnCursoCalc = Number(r.adelantos_en_curso ?? 0);
            }
          } catch (e) {
            console.warn("calendario_resumen_saldos no disponible, fallback:", e);
          }
        }

        // 2) Lotes de acreditación del comercio logueado. Filtramos
        //    por comercio_id explícitamente (no por RLS) y separamos
        //    los pendientes (calendario futuro) de los ya Acreditados
        //    (historial), porque un lote Acreditado no es "por acreditar".
        let acreditar = 0;
        let disp = 0;
        const ticketsReal: Ticket[] = [];
        const porDia: Record<string, { monto: number; cantidad: number }> = {};
        const porDiaAcreditado: Record<string, { monto: number; cantidad: number }> = {};
        let acredDetalle: LoteAcredDetalle[] = [];
        let acredListado: LoteAcredDetalle[] = [];

        if (comercioId) {
          const { data: loteRows } = await sb
            .from("lotes_acreditacion")
            .select(
              "id, fecha, cantidad_operaciones, importe_neto, estado, comision_cierre_lote_pct, comision_cierre_lote_monto, bandera, fecha_resolucion, fecha_cobro_real",
            )
            .eq("comercio_id", comercioId)
            .neq("estado", "Liquidado");

          const rows = (loteRows ?? []) as any[];
          const pendientes = rows.filter(
            (l) => l.estado !== "Acreditado" && l.estado !== "Rechazado" && l.estado !== "Cancelado",
          );
          const acreditados = rows.filter((l) => l.estado === "Acreditado");
          // KPI "Por acreditar": solo los pendientes (los Acreditados ya están pagados).
          acreditar = pendientes.reduce((s, l) => s + Number(l.importe_neto ?? 0), 0);

          // Detalle completo de TODOS los lotes (para que el operador
          // pueda ver también el historial de los Acreditados al
          // seleccionar una fecha).
          acredDetalle = rows.map((l) => ({
            id: String(l.id).slice(0, 8).toUpperCase(),
            fullId: l.id,
            fecha: (l.fecha ?? "").slice(0, 10),
            fechaAcreditacion:
              l.fecha_resolucion != null
                ? new Date(l.fecha_resolucion).toISOString().slice(0, 10)
                : "",
            fechaCobroReal: l.fecha_cobro_real ?? null,
            bandera: l.bandera ?? "—",
            cantidadOperaciones: Number(l.cantidad_operaciones ?? 0),
            importeNeto: Number(l.importe_neto ?? 0),
            comisionCierrePct:
              l.comision_cierre_lote_pct != null ? Number(l.comision_cierre_lote_pct) : null,
            comisionCierreMonto:
              l.comision_cierre_lote_monto != null ? Number(l.comision_cierre_lote_monto) : null,
            estado: l.estado,
          }));
          acredListado = acredDetalle.filter((l) => l.estado === "Acreditado");

          // Calendario de próximas acreditaciones.
          pendientes.forEach((l) => {
            const fecha = (l.fecha ?? "").slice(0, 10);
            if (!fecha) return;
            if (!porDia[fecha]) porDia[fecha] = { monto: 0, cantidad: 0 };
            porDia[fecha].monto += Number(l.importe_neto ?? 0);
            porDia[fecha].cantidad += Number(l.cantidad_operaciones ?? 0);
          });
          // Calendario de acreditaciones pasadas (para mostrar el
          // historial de pagos confirmados).
          acreditados.forEach((l) => {
            const fecha = (l.fecha ?? "").slice(0, 10);
            if (!fecha) return;
            if (!porDiaAcreditado[fecha]) porDiaAcreditado[fecha] = { monto: 0, cantidad: 0 };
            porDiaAcreditado[fecha].monto += Number(l.importe_neto ?? 0);
            porDiaAcreditado[fecha].cantidad += Number(l.cantidad_operaciones ?? 0);
          });

          // 3) Adelantos del propio comercio. Filtro por comercio_id.
          const { data: adelRows } = await sb
            .from("adelantos")
            .select(
              "id, monto_solicitado, monto_por_acreditar, fecha_acreditacion, estado, motivo, fecha_solicitud, created_at, tasa_interes_pct, plazo_adelantado_dias, fecha_resolucion, monto_ofertado, descuento, neto_a_recibir, compensado, rechazo_motivo",
            )
            .eq("comercio_id", comercioId)
            .order("fecha_solicitud", { ascending: false });

          // El "Disponible para adelanto" sale de la RPC `adelanto_tope`: lo
          // vendido con tarjeta y no acreditado menos los adelantos vigentes,
          // y si el comercio cumple la antigüedad mínima.
          try {
            const { data: topeRpc, error: rpcError } = await sb.rpc("adelanto_tope", {
              p_comercio_id: comercioId,
            });
            if (rpcError) throw new Error(rpcError.message);
            const t = (topeRpc ?? {}) as Record<string, unknown>;
            disp = Math.max(0, Number(t.tope ?? 0));
            adelantosEnCursoCalc = Number(t.adelantos_vigentes ?? 0);
            if (!cancelled)
              setTope({
                tope: disp,
                vendidoNoAcreditado: Number(t.vendido_no_acreditado ?? 0),
                adelantosVigentes: Number(t.adelantos_vigentes ?? 0),
                cumpleAntiguedad: Boolean(t.cumple_antiguedad),
                antiguedadDias: t.antiguedad_dias != null ? Number(t.antiguedad_dias) : null,
                antiguedadMinima: Number(t.antiguedad_minima_dias ?? 90),
                deuda: Number(t.deuda_pendiente ?? 0),
              });
          } catch (e) {
            console.warn("adelanto_tope no disponible:", e);
            disp = 0;
          }

          ticketsReal.push(
            ...((adelRows ?? []) as any[]).map((r: any) => ({
              id: String(r.id).slice(0, 8).toUpperCase(),
              fullId: r.id,
              fecha: (r.fecha_solicitud ?? r.created_at ?? "").slice(0, 10),
              montoSolicitado: Number(r.monto_solicitado ?? 0),
              montoPorAcreditar: Number(r.monto_por_acreditar ?? 0),
              fechaAcreditacion: (r.fecha_acreditacion ?? "").slice(0, 10),
              estado: ((r.estado ?? "pendiente") as string).toLowerCase() as TicketEstado,
              motivo: r.motivo ?? undefined,
              tasaInteres: r.tasa_interes_pct != null ? Number(r.tasa_interes_pct) : null,
              plazoAdelantado:
                r.plazo_adelantado_dias != null ? Number(r.plazo_adelantado_dias) : null,
              montoOfertado: r.monto_ofertado != null ? Number(r.monto_ofertado) : null,
              descuento: r.descuento != null ? Number(r.descuento) : null,
              netoARecibir: r.neto_a_recibir != null ? Number(r.neto_a_recibir) : null,
              compensado: Number(r.compensado ?? 0),
              rechazoMotivo: r.rechazo_motivo ?? null,
            })),
          );
        }

        // 4) Lotes de venta — filtrado por comercio_id.
        let ventaRows: LoteVenta[] = [];
        try {
          let q = sb.from("v_lotes_venta").select("*").order("fecha", { ascending: false });
          if (comercioId) q = q.eq("comercio_id", comercioId);
          const { data: vRows } = await q;
          ventaRows = (vRows ?? []).map((r: any) => ({
            id: String(r.id ?? "")
              .slice(0, 8)
              .toUpperCase(),
            fecha: (r.fecha ?? "").slice(0, 10),
            bandera: r.bandera ?? "—",
            cantidadOperaciones: Number(r.cantidad_operaciones ?? r.cantidad ?? 0),
            montoOperaciones: Number(r.monto_operaciones ?? r.monto ?? 0),
            comision: Number(r.comision ?? 0),
            impuesto: Number(r.impuesto ?? 0),
            montoCobrado: Number(r.monto_cobrado ?? 0),
          }));
        } catch {
          // v_lotes_venta puede no existir aún; se muestra vacío
        }

        // 5) Comisiones por bandera y cuota (filtradas por legajo,
        //    ya estaba bien).
        let comisionesData: ComisionBandera[] = [];
        try {
          const { data: cbRows } = await sb
            .from("comercio_banderas")
            .select("id, bandera, estado")
            .eq("cliente_legajo", legajo);
          if (cbRows && cbRows.length > 0) {
            const cbIds = (cbRows as any[]).map((r: any) => r.id);
            const { data: cuotasRows } = await sb
              .from("comercio_banderas_cuotas")
              .select("comercio_bandera_id, cuotas, tasa_mensual, estado")
              .in("comercio_bandera_id", cbIds);
            const banderaMap = new Map((cbRows as any[]).map((r: any) => [r.id, r.bandera]));
            comisionesData = (cuotasRows ?? []).map((c: any) => ({
              bandera: banderaMap.get(c.comercio_bandera_id) ?? "—",
              cuotas: Number(c.cuotas ?? 0),
              tasaMensual: Number(c.tasa_mensual ?? 0),
              estado: c.estado ?? "Activo",
            }));
          }
        } catch {
          // Tablas aún no creadas
        }

        // 6) Impuestos externos + excepciones del comercio
        let impuestosData: Impuesto[] = [];
        let excepcionesData: Excepcion[] = [];
        try {
          const { data: impRows } = await sb
            .from("impuestos")
            .select("id, codigo, descripcion, tipo, alicuota, estado, ambito")
            .eq("ambito", "Externo")
            .eq("estado", "Activo");
          impuestosData = (impRows ?? []).map((r: any) => ({
            id: r.id,
            codigo: r.codigo ?? "",
            descripcion: r.descripcion ?? "",
            tipo: r.tipo ?? "",
            alicuota: Number(r.alicuota ?? 0),
            estado: r.estado ?? "Activo",
          }));

          if (legajo) {
            const { data: excRows } = await sb
              .from("dc_excepciones")
              .select("tipo, motivo, estado, vigencia_hasta, impuesto_id")
              .eq("legajo", legajo)
              .eq("estado", "Activo");
            const impIdToCodigo = new Map(impuestosData.map((i) => [i.id, i.codigo]));
            excepcionesData = (excRows ?? []).map((r: any) => ({
              impuestoCodigo: impIdToCodigo.get(r.impuesto_id) ?? r.tipo ?? "—",
              motivo: r.motivo ?? r.tipo ?? "Exención",
              estado: r.estado ?? "Activo",
              vigenciaHasta: r.vigencia_hasta ?? null,
            }));
          }
        } catch {
          // Tablas aún no disponibles
        }

        if (cancelled) return;
        setFaltaCobrar(falta);
        setPorAcreditar(acreditar);
        setAdelantosEnCurso(adelantosEnCursoCalc);
        setDisponible(disp);
        setLotesAcredDetalle(acredDetalle);
        setLotesAcreditados(acredListado);
        setLotesVenta(ventaRows);
        setComisiones(comisionesData);
        setImpuestos(impuestosData);
        setExcepciones(excepcionesData);
        const diasArr: DiaAcreditacion[] = Object.entries(porDia)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([date, v]) => ({
            date,
            label: fmtDate(date),
            monto: v.monto,
            cantidad: v.cantidad,
          }));
        setDias(diasArr);
        const acredArr: DiaAcreditacion[] = Object.entries(porDiaAcreditado)
          .sort(([a], [b]) => b.localeCompare(a)) // más reciente primero
          .map(([date, v]) => ({
            date,
            label: fmtDate(date),
            monto: v.monto,
            cantidad: v.cantidad,
          }));
        setDiasAcreditados(acredArr);
        setTickets(ticketsReal);
      } catch (e) {
        console.error(e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [recarga]);

  const openForDate = (date: string) => {
    setSelectedDate(date);
    setFechaAcred(date);
    const d = dias.find((x) => x.date === date);
    if (d) setMonto(String(Math.round(d.monto)));
    setMotivo("");
    setOpen(true);
  };
  const openGeneral = () => {
    setSelectedDate(null);
    setFechaAcred(dias[0]?.date ?? toISO(addDays(new Date(), 1)));
    setMonto(disponible > 0 ? String(Math.round(disponible)) : "");
    setMotivo("");
    setOpen(true);
  };

  const handleCreate = async () => {
    const montoNum = Number(monto);
    if (!montoNum || montoNum <= 0) {
      toast.error("Ingresá un monto válido");
      return;
    }
    if (tope && !tope.cumpleAntiguedad) {
      toast.error(`El adelanto se habilita a partir de los ${tope.antiguedadMinima} días de operación`);
      return;
    }
    if (montoNum > disponible) {
      toast.error("El monto no puede superar el disponible para adelanto");
      return;
    }
    setSaving(true);
    try {
      const sb = requireSupabase();
      // Plazo deseado: días hasta la fecha de acreditación que se quiere adelantar.
      const plazo = fechaAcred
        ? Math.max(1, Math.round((new Date(`${fechaAcred}T12:00:00`).getTime() - Date.now()) / 86_400_000))
        : 1;
      // Alta con validación server-side (RPC adelanto_solicitar): antigüedad
      // mínima y tope (vendido y no acreditado − adelantos vigentes).
      const { data, error } = await sb.rpc("adelanto_solicitar", {
        p_monto: montoNum,
        p_plazo_dias: plazo,
        p_transaction_ids: null,
        p_motivo: motivo || null,
      });
      if (error) throw new Error(error.message);
      const row = data as { adelanto_id?: string } | null;
      setOpen(false);
      setRecarga((n) => n + 1);
      toast.success(
        `Adelanto ${String(row?.adelanto_id ?? "").slice(0, 8).toUpperCase()} solicitado. MoliPay te va a enviar una oferta con la tasa y el neto a recibir.`,
      );
    } catch (e: any) {
      toast.error(e?.message ?? "No se pudo solicitar el adelanto");
    } finally {
      setSaving(false);
    }
  };

  // Aceptar la oferta (RPC adelanto_aceptar): exige confirmar la tasa y el neto.
  const handleAceptar = async (t: Ticket) => {
    if (!t.fullId) return;
    if (!aceptoOferta) {
      toast.error("Marcá que aceptás la tasa y el monto a recibir");
      return;
    }
    setSaving(true);
    try {
      const sb = requireSupabase();
      const { error } = await sb.rpc("adelanto_aceptar", { p_adelanto_id: t.fullId, p_acepto: true });
      if (error) throw new Error(error.message);
      toast.success("Oferta aceptada. MoliPay va a acreditar el neto en tu cuenta.");
      setDetalle(null);
      setAceptoOferta(false);
      setRecarga((n) => n + 1);
    } catch (e: any) {
      toast.error(e?.message ?? "No se pudo aceptar la oferta");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = async (adelantoId?: string) => {
    if (!adelantoId) {
      toast.error("No se pudo identificar el adelantar");
      return;
    }
    setSaving(true);
    try {
      const sb = requireSupabase();
      const { data, error } = await sb.rpc("cancelar_adelanto", {
        p_adelanto_id: adelantoId,
      });
      if (error) throw new Error(error.message);
      const row = data as any;
      setTickets((prev) =>
        prev.map((t) =>
          t.fullId === adelantoId
            ? { ...t, estado: (row?.estado ?? "cancelado").toLowerCase() as TicketEstado }
            : t,
        ),
      );
      setDetalle((prev) =>
        prev && prev.fullId === adelantoId
          ? { ...prev, estado: (row?.estado ?? "cancelado").toLowerCase() as TicketEstado }
          : null,
      );
      toast.success("Adelanto cancelado correctamente");
      setRecarga((n) => n + 1);
    } catch (e: any) {
      toast.error(e?.message ?? "No se pudo cancelar el adelantar");
    } finally {
      setSaving(false);
    }
  };

  const exportLoteDetalle = (fecha: string) => {
    const lotesDelDia = lotesAcredDetalle.filter((l) => l.fecha === fecha);
    if (lotesDelDia.length === 0) {
      toast.error("No hay lotes para exportar en esta fecha");
      return;
    }
    const ws = XLSX.utils.json_to_sheet(
      lotesDelDia.map((l) => ({
        Lote: l.id,
        Fecha: fmtDateFull(l.fecha),
        Bandera: l.bandera,
        Operaciones: l.cantidadOperaciones,
        "Importe neto": formatARS(l.importeNeto),
        "Comisión cierre %": l.comisionCierrePct != null ? `${l.comisionCierrePct}%` : "—",
        "Comisión cierre $": l.comisionCierreMonto != null ? formatARS(l.comisionCierreMonto) : "—",
      })),
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Detalle lote");
    XLSX.writeFile(wb, `lote-acreditacion-${fecha}.xlsx`);
    toast.success("Excel descargado");
  };

  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet([
      { Metrica: "Falta cobrar (por cobrar)", Valor: formatARS(faltaCobrar) },
      { Metrica: "Por acreditar (MollyPay te debe)", Valor: formatARS(porAcreditar) },
      { Metrica: "Disponible para adelanto", Valor: formatARS(disponible) },
      {},
      ...dias.map((d) => ({
        Metrica: `Acredita ${fmtDateFull(d.date)}`,
        Valor: formatARS(d.monto),
        Cantidad: d.cantidad,
      })),
      {},
      ...tickets.map((t) => ({
        Ticket: t.id,
        Fecha: t.fecha,
        "Monto solicitado": formatARS(t.montoSolicitado),
        "Fecha acreditación": fmtDateFull(t.fechaAcreditacion),
        Estado: ESTADO_TICKET_LABEL[t.estado],
      })),
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Liquidaciones");
    XLSX.writeFile(wb, `liquidaciones-${new Date().toISOString().slice(0, 10)}.xlsx`);
    toast.success("Excel descargado");
  };
  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFillColor(211, 0, 31);
    doc.rect(0, 0, 210, 24, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.text("MoliPay", 14, 16);
    doc.setTextColor(20, 20, 20);
    doc.setFontSize(10);
    doc.text(`Liquidaciones · ${new Date().toLocaleDateString("es-AR")}`, 196, 16, {
      align: "right",
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (doc as any).autoTable({
      startY: 30,
      head: [["Concepto", "Monto"]],
      body: [
        ["Falta cobrar", formatARS(faltaCobrar)],
        ["Por acreditar", formatARS(porAcreditar)],
        ["Disponible adelanto", formatARS(disponible)],
      ],
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (doc as any).autoTable({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      startY: (doc as any).lastAutoTable.finalY + 8,
      head: [["Fecha acredita", "Monto", "Ops"]],
      body: dias.map((d) => [fmtDateFull(d.date), formatARS(d.monto), String(d.cantidad)]),
      styles: { fontSize: 8 },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (doc as any).autoTable({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      startY: (doc as any).lastAutoTable.finalY + 8,
      head: [["Ticket", "Fecha", "Monto solicitado", "Acredita", "Estado"]],
      body: tickets.map((t) => [
        t.id,
        t.fecha,
        formatARS(t.montoSolicitado),
        fmtDateFull(t.fechaAcreditacion),
        ESTADO_TICKET_LABEL[t.estado],
      ]),
      styles: { fontSize: 7 },
    });
    doc.save(`liquidaciones-${new Date().toISOString().slice(0, 10)}.pdf`);
    toast.success("PDF descargado");
  };

  const maxMonto = useMemo(() => {
    if (!selectedDate) return disponible;
    const d = dias.find((x) => x.date === selectedDate);
    return d ? Math.min(d.monto, disponible) : disponible;
  }, [selectedDate, dias, disponible]);

  return (
    <>
      <PageHeader
        title="Liquidaciones"
        description="Cuánta plata te falta cobrar, cuánto tenés por acreditar y calendario de acreditaciones. Solicitá el adelanto ahí mismo."
        action={
          <div className="flex gap-2">
            <BtnOutline onClick={exportExcel}>
              <FileSpreadsheet size={14} /> Excel
            </BtnOutline>
            <BtnOutline onClick={exportPDF}>
              <Download size={14} /> PDF
            </BtnOutline>
            <BtnPrimary onClick={openGeneral}>
              <Plus size={14} /> Solicitar adelanto
            </BtnPrimary>
          </div>
        }
      />

      {res?.saldo_negativo && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          Tenés una deuda de <b className="font-mono">{formatARS(res.deuda_contracargos)}</b> por contracargos o
          liquidaciones negativas. Se descuenta automáticamente de tus próximas acreditaciones y, mientras exista,
          los retiros pueden estar bloqueados.{" "}
          <button className="underline font-semibold" onClick={() => setActiveTab("contracargos")}>
            Ver contracargos
          </button>
        </div>
      )}

      {/* KPIs: saldo, pendiente de acreditación, próxima acreditación, adelanto a compensar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Card className="border-l-4 border-l-emerald-500">
          <div className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Wallet size={12} /> Saldo disponible
          </div>
          <div className="font-display tabular-nums text-xl md:text-2xl font-bold mt-1 text-emerald-700">
            {resumenQ.isLoading ? "—" : formatARS(res?.saldo_disponible ?? 0)}
          </div>
          <div className="text-xs text-muted-foreground mt-1">El mismo que el Saldo Total de tu cuenta</div>
        </Card>
        <Card className="border-l-4 border-l-blue-500">
          <div className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Clock size={12} /> Pendiente de acreditación
          </div>
          <div className="font-display tabular-nums text-xl md:text-2xl font-bold mt-1 text-blue-700">
            {resumenQ.isLoading ? "—" : formatARS(res?.pendiente_acreditacion ?? 0)}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            Vendido del mes: {formatARS(res?.vendido_periodo ?? 0)} ({res?.ventas_periodo ?? 0} ventas)
          </div>
        </Card>
        <Card className="border-l-4 border-l-amber-500">
          <div className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <CalendarDays size={12} /> Próxima acreditación
          </div>
          <div className="font-display tabular-nums text-xl md:text-2xl font-bold mt-1">
            {resumenQ.isLoading ? "—" : res?.proxima_acreditacion ? formatARS(res.proxima_acreditacion.monto) : "—"}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {res?.proxima_acreditacion ? fmtDateFull(res.proxima_acreditacion.fecha) : "Sin acreditaciones programadas"}
          </div>
        </Card>
        <Card className="border-l-4 border-l-amber-600">
          <div className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Percent size={12} /> Adelanto a compensar
          </div>
          <div className="font-display tabular-nums text-xl md:text-2xl font-bold mt-1 text-amber-700">
            {resumenQ.isLoading ? "—" : formatARS(res?.adelanto_pendiente_compensar ?? 0)}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {(res?.deuda_contracargos ?? 0) > 0
              ? `Deuda por contracargos: ${formatARS(res!.deuda_contracargos)}`
              : `Disponible para adelanto: ${formatARS(disponible)}`}
          </div>
        </Card>
      </div>

      {/* Últimas 5 acreditaciones y próximas 5 programadas */}
      <div className="grid md:grid-cols-2 gap-3 mb-6">
        <Card>
          <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
            <CheckCircle2 size={12} /> Últimas acreditaciones
          </div>
          {(res?.ultimas_acreditaciones ?? []).length === 0 ? (
            <p className="text-xs text-muted-foreground">Todavía no tenés acreditaciones.</p>
          ) : (
            <div className="divide-y text-sm">
              {res!.ultimas_acreditaciones.map((a) => (
                <div key={a.lote_id} className="flex items-center justify-between py-1.5">
                  <span className="text-xs">
                    {fmtDateFull(a.fecha_acreditacion)} · <Badge tone="neutral">{a.bandera}</Badge>
                  </span>
                  <span className="font-mono font-semibold text-emerald-700">{formatARS(a.neto)}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
        <Card>
          <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
            <CalendarDays size={12} /> Próximas acreditaciones
          </div>
          {(res?.proximas_acreditaciones ?? []).length === 0 ? (
            <p className="text-xs text-muted-foreground">No hay acreditaciones programadas.</p>
          ) : (
            <div className="divide-y text-sm">
              {res!.proximas_acreditaciones.map((a) => (
                <div key={a.lote_id} className="flex items-center justify-between py-1.5">
                  <span className="text-xs">
                    {fmtDateFull(a.fecha)} · <Badge tone="neutral">{a.bandera}</Badge>
                  </span>
                  <span className="font-mono font-semibold">{formatARS(a.neto)}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Sección combinada: Calendario + Tickets */}
      <Card className="mb-6 p-0">
        {/* Tabs header */}
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

        {/* Tab: Calendario — grilla mensual 7×N con desglose por día */}
        {activeTab === "calendario" && (
          <CalendarioAcreditacionesTab
            comercioId={comercioId}
            loading={loading}
            faltaCobrar={faltaCobrar}
            porAcreditar={porAcreditar}
            adelantosEnCurso={adelantosEnCurso}
            disponible={disponible}
            tickets={tickets}
            onSelectDate={(d) => openForDate(d)}
            onClearSelection={() => setSelectedDate(null)}
            onOpenGeneral={openGeneral}
            onOpenDetalle={setDetalle}
          />
        )}

        {/* Tab: Tickets */}
        {activeTab === "tickets" && (
          <div>
            <div className="px-5 py-3 border-b flex items-center justify-between gap-3">
              <div className="text-xs text-muted-foreground">{tickets.length} solicitudes</div>
              <BtnPrimary className="h-9 px-3 text-xs" onClick={openGeneral}>
                <Plus size={14} /> Nuevo ticket
              </BtnPrimary>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
                    <th className="text-left px-5 py-3">Número</th>
                    <th className="text-left px-5 py-3">Fecha</th>
                    <th className="text-right px-5 py-3">Monto pedido</th>
                    <th className="text-right px-5 py-3">Tasa</th>
                    <th className="text-right px-5 py-3">Neto a recibir</th>
                    <th className="text-left px-5 py-3">Estado</th>
                    <th className="text-right px-5 py-3">Pendiente de compensar</th>
                    <th className="text-center px-5 py-3">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {tickets.length === 0 ? (
                    <tr>
                      <td
                        colSpan={8}
                        className="px-5 py-10 text-center text-sm text-muted-foreground"
                      >
                        Aún no solicitaste adelantos. Elegí un día del calendario o tocá "Solicitar
                        adelanto".
                      </td>
                    </tr>
                  ) : (
                    tickPaginated.map((t) => (
                      <tr key={t.id} className="hover:bg-muted/30">
                        <td className="px-5 py-3 font-mono font-semibold">{t.id}</td>
                        <td className="px-5 py-3 text-xs text-muted-foreground">
                          {fmtDateFull(t.fecha)}
                        </td>
                        <td className="px-5 py-3 font-mono tabular-nums text-right font-semibold">
                          {formatARS(t.montoSolicitado)}
                        </td>
                        <td className="px-5 py-3 font-mono tabular-nums text-right text-xs">
                          {t.tasaInteres != null ? `${t.tasaInteres}%` : "—"}
                        </td>
                        <td className="px-5 py-3 font-mono tabular-nums text-right">
                          {t.netoARecibir != null ? formatARS(t.netoARecibir) : "—"}
                        </td>
                        <td className="px-5 py-3">
                          <Badge tone={ESTADO_TICKET_TONE[t.estado] ?? "neutral"}>
                            {ESTADO_TICKET_LABEL[t.estado] ?? t.estado}
                          </Badge>
                        </td>
                        <td className="px-5 py-3 font-mono tabular-nums text-right text-xs">
                          {t.estado === "acreditado" || t.estado === "compensado" ? formatARS(pendienteCompensar(t)) : "—"}
                        </td>
                        <td className="px-5 py-3 text-center">
                          <BtnOutline
                            className="h-8 px-2.5 text-xs"
                            onClick={() => {
                              setAceptoOferta(false);
                              setDetalle(t);
                            }}
                          >
                            <Eye size={13} /> {t.estado === "aprobado" ? "Ver oferta" : "Ver"}
                          </BtnOutline>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {/* Paginación tickets */}
            {tickets.length > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-3 border-t">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>Filas por página:</span>
                  <select
                    className="h-8 px-2 rounded border bg-card text-xs"
                    value={tickPageSize}
                    onChange={(e) => {
                      setTickPageSize(Number(e.target.value));
                      setTickPage(1);
                    }}
                  >
                    {ROWS_OPTIONS.map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                  <span>
                    {tickets.length === 0
                      ? "0 registros"
                      : `${(tickPage - 1) * tickPageSize + 1}–${Math.min(tickPage * tickPageSize, tickets.length)} de ${tickets.length}`}
                  </span>
                </div>
                <div className="flex gap-1">
                  <BtnOutline
                    className="h-8 px-3 text-xs"
                    disabled={tickPage <= 1}
                    onClick={() => setTickPage(1)}
                  >
                    Primero
                  </BtnOutline>
                  <BtnOutline
                    className="h-8 px-3 text-xs"
                    disabled={tickPage <= 1}
                    onClick={() => setTickPage((p) => Math.max(1, p - 1))}
                  >
                    Anterior
                  </BtnOutline>
                  <span className="flex items-center px-3 text-xs text-muted-foreground">
                    {tickPage} / {tickTotalPages}
                  </span>
                  <BtnOutline
                    className="h-8 px-3 text-xs"
                    disabled={tickPage >= tickTotalPages}
                    onClick={() => setTickPage((p) => Math.min(tickTotalPages, p + 1))}
                  >
                    Siguiente
                  </BtnOutline>
                  <BtnOutline
                    className="h-8 px-3 text-xs"
                    disabled={tickPage >= tickTotalPages}
                    onClick={() => setTickPage(tickTotalPages)}
                  >
                    Último
                  </BtnOutline>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab: Acreditaciones (historial de lotes ya Acreditados) */}
        {activeTab === "acreditaciones" && <LotesAcreditacionEmpresaTab />}

        {/* Tab: Lotes de venta */}
        {activeTab === "lotes-venta" && <LotesVentaEmpresaTab />}

        {/* Tab: Contracargos */}
        {activeTab === "contracargos" && <ContracargosEmpresaTab />}

        {/* Tab: Comisiones por bandera y cuota */}
        {activeTab === "comisiones" && (
          <div>
            <div className="px-5 py-3 border-b">
              <div className="text-xs text-muted-foreground">
                Comisiones vigentes por bandera y cuota. Solo lectura — tasas configuradas por el
                administrador.
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
                    <th className="text-left px-5 py-3">Bandera</th>
                    <th className="text-right px-5 py-3">Cuotas</th>
                    <th className="text-right px-5 py-3">Tasa mensual (TEM)</th>
                    <th className="text-center px-5 py-3">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {comisiones.length === 0 ? (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-5 py-10 text-center text-sm text-muted-foreground"
                      >
                        No hay comisiones configuradas para tu comercio. El administrador debe
                        asignar banderas y cuotas primero.
                      </td>
                    </tr>
                  ) : (
                    comisiones.map((c, idx) => (
                      <tr key={`${c.bandera}-${c.cuotas}-${idx}`} className="hover:bg-muted/30">
                        <td className="px-5 py-3">
                          <Badge tone="neutral">{c.bandera}</Badge>
                        </td>
                        <td className="px-5 py-3 text-right font-mono tabular-nums">{c.cuotas}x</td>
                        <td className="px-5 py-3 text-right font-mono tabular-nums font-semibold">
                          {c.tasaMensual}%
                        </td>
                        <td className="px-5 py-3 text-center">
                          <Badge tone={c.estado === "Activo" ? "success" : "neutral"}>
                            {c.estado}
                          </Badge>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className="px-5 py-3 border-t text-[11px] text-muted-foreground">
              La tasa mensual (TEM) es el porcentaje que se aplica mensualmente sobre el monto de
              cada cuota. No se muestra la tasa anual (TNA).
            </div>
          </div>
        )}
      </Card>

      {/* Sección: Impuestos aplicables (solo Externo) */}
      {impuestos.length > 0 && (
        <Card className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Percent size={16} className="text-muted-foreground" />
            <h3 className="font-semibold text-sm">Impuestos aplicables a tu comercio</h3>
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            Solo se muestran impuestos de ámbito Externo. Los impuestos internos de MoliPay no se
            visualizan.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="text-left px-4 py-2">Código</th>
                  <th className="text-left px-4 py-2">Descripción</th>
                  <th className="text-right px-4 py-2">Tipo</th>
                  <th className="text-right px-4 py-2">Alicuota / Fijo</th>
                  <th className="text-center px-4 py-2">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {impuestos.map((imp) => {
                  const exento = excepciones.find(
                    (e) => e.impuestoCodigo === imp.codigo && e.estado === "Activo",
                  );
                  return (
                    <tr key={imp.id} className="hover:bg-muted/30">
                      <td className="px-4 py-2 font-mono text-xs">{imp.codigo}</td>
                      <td className="px-4 py-2 text-xs">{imp.descripcion}</td>
                      <td className="px-4 py-2 text-right text-xs">{imp.tipo}</td>
                      <td className="px-4 py-2 text-right font-mono text-xs tabular-nums">
                        {imp.tipo === "Porcentaje" ? `${imp.alicuota}%` : formatARS(imp.alicuota)}
                      </td>
                      <td className="px-4 py-2 text-center">
                        {exento ? (
                          <Badge tone="success">Exento</Badge>
                        ) : (
                          <Badge tone={imp.estado === "Activo" ? "warn" : "neutral"}>
                            {imp.estado}
                          </Badge>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {excepciones.length > 0 && (
            <div className="mt-3 border-t pt-3">
              <div className="text-xs font-semibold text-muted-foreground mb-1">
                Excepciones activas
              </div>
              {excepciones.map((exc, idx) => (
                <div key={idx} className="flex items-center gap-2 text-xs">
                  <Badge tone="success">Exento</Badge>
                  <span>
                    {exc.impuestoCodigo} — {exc.motivo}
                  </span>
                  {exc.vigenciaHasta && (
                    <span className="text-muted-foreground">
                      (hasta {fmtDateFull(exc.vigenciaHasta)})
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => !saving && setOpen(false)} />
          <div className="relative bg-card rounded-lg w-full max-w-md shadow-xl">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <div className="font-semibold">Solicitar adelanto</div>
              <button
                onClick={() => !saving && setOpen(false)}
                className="p-1 hover:bg-muted rounded"
              >
                <X size={16} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {dias.length === 0 ? (
                <>
                  <div className="text-center py-4">
                    <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center mx-auto mb-3">
                      <CalendarDays size={24} className="text-amber-500" />
                    </div>
                    <p className="text-sm font-medium">No tenés acreditaciones pendientes</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      No podés solicitar adelantos en este momento. Cuando tengas acreditaciones
                      pendientes, podrás adelantar los montos.
                    </p>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <BtnOutline className="flex-1" onClick={() => setOpen(false)}>
                      Cerrar
                    </BtnOutline>
                  </div>
                </>
              ) : (
                <>
                  <div className="bg-gradient-to-r from-emerald-50 to-card border border-emerald-200 rounded-md p-3 text-xs space-y-1">
                    <div className="flex items-center gap-1.5 text-emerald-700 font-medium mb-1">
                      <Wallet size={14} /> Tu adelanto disponible
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Vendido y no acreditado</span>
                      <span className="font-mono">{formatARS(tope?.vendidoNoAcreditado ?? porAcreditar)}</span>
                    </div>
                    {(() => {
                      const reservados = tope?.adelantosVigentes ?? 0;
                      if (reservados > 0) {
                        return (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">
                              (-) Adelantos en curso
                            </span>
                            <span className="font-mono text-amber-700">
                              - {formatARS(reservados)}
                            </span>
                          </div>
                        );
                      }
                      return null;
                    })()}
                    <div className="flex justify-between border-t border-emerald-200 pt-1">
                      <span className="text-muted-foreground font-semibold">
                        Disponible real
                      </span>
                      <span className="font-mono font-bold text-emerald-700 text-sm">
                        {formatARS(disponible)}
                      </span>
                    </div>
                    {selectedDate && (
                      <div className="flex justify-between pt-1 border-t border-emerald-200">
                        <span className="text-muted-foreground">Día seleccionado</span>
                        <span className="font-semibold">
                          {fmtDateFull(selectedDate)} · {formatARS(totalSeleccionado)}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-md p-3 text-xs space-y-1">
                    <div className="flex items-center gap-1.5 text-blue-700 font-medium mb-1">
                      <Clock size={14} /> Cómo sigue
                    </div>
                    <p className="text-muted-foreground">
                      MoliPay evalúa tu pedido y te envía una oferta con la tasa y el neto que vas a
                      recibir. Recién cuando la aceptás se acredita en tu cuenta. El adelanto se
                      descuenta solo de tus próximas liquidaciones.
                    </p>
                    {tope && !tope.cumpleAntiguedad && (
                      <p className="text-red-700 font-semibold pt-1">
                        El adelanto se habilita a partir de los {tope.antiguedadMinima} días de
                        operación (llevás {tope.antiguedadDias ?? 0}).
                      </p>
                    )}
                    {tope && tope.deuda > 0 && (
                      <p className="text-amber-800 pt-1">
                        Tenés una deuda pendiente de {formatARS(tope.deuda)} por contracargos: se
                        descuenta de tus próximas acreditaciones.
                      </p>
                    )}
                  </div>

                  <div>
                    <Label>Monto a adelantar (ARS)</Label>
                    <Input
                      type="number"
                      min={1}
                      max={maxMonto}
                      value={monto}
                      onChange={(e) => setMonto(e.target.value)}
                      placeholder="Ej. 500000"
                    />
                    <div className="text-[11px] text-muted-foreground mt-1">
                      Máximo {formatARS(maxMonto)}
                    </div>
                  </div>
                  <div>
                    <Label>Fecha de acreditación que querés adelantar</Label>
                    <select
                      value={fechaAcred}
                      onChange={(e) => setFechaAcred(e.target.value)}
                      className="w-full h-10 px-3 rounded-md border bg-card text-sm"
                    >
                      {dias.map((d) => (
                        <option key={d.date} value={d.date}>
                          {fmtDateFull(d.date)} · {formatARS(d.monto)} ({d.cantidad} ops)
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label>Motivo (opcional)</Label>
                    <Input
                      value={motivo}
                      onChange={(e) => setMotivo(e.target.value)}
                      placeholder="Ej. adelanto liquidacion semana"
                    />
                  </div>

                  <div className="flex gap-2 pt-2">
                    <BtnOutline className="flex-1" disabled={saving} onClick={() => setOpen(false)}>
                      Cancelar
                    </BtnOutline>
                    <BtnPrimary
                      className="flex-1"
                      disabled={saving || (tope != null && !tope.cumpleAntiguedad) || disponible <= 0}
                      onClick={handleCreate}
                    >
                      {saving ? "Enviando…" : "Solicitar adelanto"}
                    </BtnPrimary>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal detalle ticket */}
      {detalle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setDetalle(null)} />
          <div className="relative bg-card rounded-lg w-full max-w-md shadow-xl">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <div className="font-semibold">Adelanto {detalle.id}</div>
              <Badge tone={ESTADO_TICKET_TONE[detalle.estado] ?? "neutral"}>
                {ESTADO_TICKET_LABEL[detalle.estado] ?? detalle.estado}
              </Badge>
            </div>
            <div className="p-6 space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Fecha solicitud</span>
                <span className="font-semibold">{fmtDateFull(detalle.fecha)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Monto solicitado</span>
                <span className="font-mono font-semibold">
                  {formatARS(detalle.montoSolicitado)}
                </span>
              </div>
              {detalle.plazoAdelantado != null && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Plazo</span>
                  <span className="font-semibold">{detalle.plazoAdelantado} días</span>
                </div>
              )}
              {detalle.fechaAcreditacion && (detalle.estado === "acreditado" || detalle.estado === "compensado") && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Acreditado</span>
                  <span className="font-semibold">{fmtDateFull(detalle.fechaAcreditacion)}</span>
                </div>
              )}
              {detalle.estado === "rechazado" && detalle.rechazoMotivo && (
                <div className="bg-red-50 border border-red-200 rounded-md p-3 text-xs text-red-800">
                  Motivo del rechazo: {detalle.rechazoMotivo}
                </div>
              )}
              {detalle.estado === "pendiente" && (
                <div className="bg-amber-50 border border-amber-200 rounded-md p-3 text-xs text-amber-900">
                  MoliPay está evaluando tu pedido. Vas a recibir una oferta con la tasa y el neto a
                  recibir.
                </div>
              )}
              {detalle.estado === "aceptado" && (
                <div className="bg-blue-50 border border-blue-200 rounded-md p-3 text-xs text-blue-900">
                  Aceptaste la oferta. MoliPay va a acreditar{" "}
                  <span className="font-mono font-semibold">{formatARS(detalle.netoARecibir ?? 0)}</span> en tu
                  cuenta. Hasta que se acredite todavía podés cancelarla.
                </div>
              )}
              {(detalle.estado === "acreditado" || detalle.estado === "compensado") && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-md p-3 text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Neto acreditado</span>
                    <span className="font-mono font-semibold">{formatARS(detalle.netoARecibir ?? 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Ya descontado de tus liquidaciones</span>
                    <span className="font-mono">{formatARS(detalle.compensado ?? 0)}</span>
                  </div>
                  <div className="flex justify-between border-t border-emerald-200 pt-1">
                    <span className="text-muted-foreground font-semibold">Pendiente de compensar</span>
                    <span className="font-mono font-bold">{formatARS(pendienteCompensar(detalle))}</span>
                  </div>
                </div>
              )}
              {detalle.motivo && (
                <div className="pt-3 border-t">
                  <div className="text-xs text-muted-foreground">Motivo</div>
                  <div className="mt-1">{detalle.motivo}</div>
                </div>
              )}
              {detalle.estado === "aprobado" && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-md p-3 text-xs space-y-1">
                  <div className="flex items-center gap-1.5 text-emerald-700 font-medium mb-1">
                    <TrendingUp size={14} /> Oferta del administrador
                  </div>
                  <p className="text-[11px] text-emerald-900/80 mb-2">
                    MoliPay te ofrece este adelanto. Revisá la tasa y el neto: si te conviene,
                    aceptala; si no, cancelala. La tasa es un descuento único sobre el monto.
                  </p>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Monto aprobado</span>
                    <span className="font-mono font-semibold">
                      {formatARS(detalle.montoOfertado ?? detalle.montoSolicitado)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tasa</span>
                    <span className="font-mono font-bold text-emerald-700">{detalle.tasaInteres ?? 0}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Descuento</span>
                    <span className="font-mono font-semibold text-red-600">
                      - {formatARS(detalle.descuento ?? 0)}
                    </span>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-emerald-200">
                    <span className="text-muted-foreground">Neto que se acredita en tu cuenta</span>
                    <span className="font-mono font-bold text-emerald-700">
                      {formatARS(detalle.netoARecibir ?? 0)}
                    </span>
                  </div>
                  <label className="flex items-start gap-2 pt-2 text-[12px] text-foreground">
                    <input
                      type="checkbox"
                      className="mt-0.5"
                      checked={aceptoOferta}
                      onChange={(e) => setAceptoOferta(e.target.checked)}
                    />
                    <span>
                      Acepto la tasa de {detalle.tasaInteres ?? 0}% y que se acreditarán{" "}
                      <b>{formatARS(detalle.netoARecibir ?? 0)}</b> en mi cuenta. El monto de{" "}
                      {formatARS(detalle.montoOfertado ?? detalle.montoSolicitado)} se descuenta de mis
                      próximas liquidaciones.
                    </span>
                  </label>
                </div>
              )}
              <div className="flex gap-2 pt-4">
                <BtnOutline className="flex-1" onClick={() => setDetalle(null)}>
                  Cerrar
                </BtnOutline>
                {detalle.estado === "aprobado" && (
                  <BtnPrimary className="flex-1" disabled={saving || !aceptoOferta} onClick={() => handleAceptar(detalle)}>
                    <CheckCircle2 size={14} /> {saving ? "Aceptando…" : "Aceptar"}
                  </BtnPrimary>
                )}
                {(detalle.estado === "pendiente" || detalle.estado === "aprobado" || detalle.estado === "aceptado") && (
                  <button
                    className="inline-flex items-center justify-center gap-2 h-10 px-5 rounded-sm border border-red-200 bg-white text-red-600 text-sm font-semibold cursor-pointer hover:bg-red-50 active:bg-red-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-150 flex-1"
                    disabled={saving}
                    onClick={() => {
                      if (
                        confirm(
                          detalle.estado === "pendiente"
                            ? "¿Seguro que querés cancelar esta solicitud? Esta acción no se puede deshacer."
                            : "¿Cancelás la oferta? El adelanto pasará a Cancelado y se liberará el cupo de tus lotes.",
                        )
                      ) {
                        handleCancel(detalle.fullId);
                      }
                    }}
                  >
                    {saving ? "Cancelando…" : detalle.estado === "pendiente" ? "Cancelar pedido" : "Cancelar oferta"}
                  </button>
                )}
                {(detalle.estado === "acreditado" || detalle.estado === "compensado") && (
                  <BtnPrimary
                    className="flex-1"
                    onClick={() => {
                      const ws = XLSX.utils.json_to_sheet([
                        {
                          Adelanto: detalle.id,
                          "Fecha solicitud": fmtDateFull(detalle.fecha),
                          "Monto aprobado": detalle.montoOfertado ?? detalle.montoSolicitado,
                          "Tasa %": detalle.tasaInteres ?? 0,
                          Descuento: detalle.descuento ?? 0,
                          "Neto acreditado": detalle.netoARecibir ?? 0,
                          Acreditado: fmtDateFull(detalle.fechaAcreditacion),
                          Compensado: detalle.compensado ?? 0,
                          "Pendiente de compensar": pendienteCompensar(detalle),
                        },
                      ]);
                      const wb = XLSX.utils.book_new();
                      XLSX.utils.book_append_sheet(wb, ws, "Adelanto");
                      XLSX.writeFile(wb, `adelanto_${detalle.id}.xlsx`);
                    }}
                  >
                    <Download size={14} /> Comprobante
                  </BtnPrimary>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

