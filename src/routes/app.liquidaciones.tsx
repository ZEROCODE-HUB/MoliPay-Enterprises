import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
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

type TicketEstado = "pendiente" | "aprobado" | "cancelado" | "rechazado" | "acreditado";
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
  pendiente: "Pendiente",
  aprobado: "Aprobado",
  cancelado: "Cancelado",
  rechazado: "Rechazado",
  acreditado: "Acreditado",
};
const ESTADO_TICKET_TONE: Record<TicketEstado, "neutral" | "success" | "warn" | "danger"> = {
  pendiente: "warn",
  aprobado: "success",
  cancelado: "neutral",
  rechazado: "danger",
  acreditado: "success",
};

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

type TabSeccion = "calendario" | "tickets" | "lotes-venta" | "comisiones" | "acreditaciones";

function Liquidaciones() {
  const [loading, setLoading] = useState(true);
  const [faltaCobrar, setFaltaCobrar] = useState(0);
  const [porAcreditar, setPorAcreditar] = useState(0);
  const [disponible, setDisponible] = useState(0);
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

  /**
   * Mapa fecha (YYYY-MM-DD) → ticket activo. La UI del calendario lo
   * usa para pintar el badge "Adelanto en curso" y cambiar el botón
   * "Adelantar" por "Ver ticket" cuando ya hay un ticket cubriendo
   * ese lote. Se recomputa solo cuando `tickets` cambia.
   *
   * Estados que cuentan como "compromiso en curso" para el lote:
   *   - Pendiente: el comercio pidió, aún no fue revisado
   *   - Aprobado:  el admin cargó TEM, falta Acreditar
   *   - Acreditado: el admin ya pagó, se repone al liquidar el lote
   *
   * Si hay más de un ticket para la misma fecha, conservamos el más
   * "comprometido" (Acreditado > Aprobado > Pendiente) para no perder
   * estado al re-renderizar.
   */
  const ticketPorFecha = useMemo<Record<string, Ticket>>(() => {
    const mapa: Record<string, Ticket> = {};
    const orden = { pendiente: 0, aprobado: 1, acreditado: 2 } as Record<string, number>;
    for (const t of tickets) {
      const fechaKey = (t.fechaAcreditacion || t.fecha || "").slice(0, 10);
      if (!fechaKey) continue;
      const estadoNorm = t.estado.toLowerCase();
      if (!(estadoNorm in orden)) continue;
      const previo = mapa[fechaKey];
      if (!previo || orden[estadoNorm] > (orden[previo.estado.toLowerCase()] ?? -1)) {
        mapa[fechaKey] = t;
      }
    }
    return mapa;
  }, [tickets]);

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
          }
        }

        // 1) Falta cobrar: suma de lote_registros pendientes/vencidos
        //    del cliente. Filtra por legajo (ya estaba bien).
        let falta = 0;
        if (legajo) {
          const { data: lotes } = await sb
            .from("lotes")
            .select("id")
            .eq("cliente_legajo", legajo)
            .neq("estado", "eliminado");
          const ids = (lotes ?? []).map((l: any) => l.id);
          if (ids.length > 0) {
            const { data: regs } = await sb
              .from("lote_registros")
              .select("monto, monto_pagado, estado")
              .in("lote_id", ids)
              .in("estado", ["pendiente", "vencido", "error"]);
            falta = (regs ?? []).reduce(
              (s: number, r: any) => s + (Number(r.monto) - Number(r.monto_pagado ?? 0)),
              0,
            );
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
            .eq("comercio_id", comercioId);

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
              "id, monto_solicitado, monto_por_acreditar, fecha_acreditacion, estado, motivo, fecha_solicitud, created_at, tasa_interes_pct, plazo_adelantado_dias, fecha_resolucion",
            )
            .eq("comercio_id", comercioId);

          // El "Disponible para adelanto" sale de la RPC `fn_calcular_tope_disponible`
          // (fuente única de verdad). Si la RPC no existe todavía (migración
          // no aplicada), caemos al cálculo JS para no romper la pantalla.
          try {
            const { data: topeRpc, error: rpcError } = await sb.rpc(
              "fn_calcular_tope_disponible",
              { p_comercio_id: comercioId },
            );
            if (!rpcError) {
              disp = Math.max(0, Number(topeRpc ?? 0));
            } else {
              throw new Error(rpcError.message);
            }
          } catch {
            const reservado = (adelRows ?? []).reduce(
              (s: number, a: any) =>
                s +
                (a.estado === "Pendiente" || a.estado === "Aprobado"
                  ? Number(a.monto_solicitado ?? 0)
                  : 0),
              0,
            );
            disp = Math.max(0, acreditar - reservado);
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
  }, []);

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
    if (!fechaAcred) {
      toast.error("Seleccioná una fecha de acreditación");
      return;
    }
    if (montoNum > disponible) {
      toast.error("El monto no puede superar el disponible para adelanto");
      return;
    }
    setSaving(true);
    try {
      const sb = requireSupabase();
      // Alta con validación server-side (RPC security definer): recalcula el
      // disponible y rechaza si el monto supera el pendiente por acreditar.
      const { data, error } = await sb.rpc("ingresar_adelanto", {
        monto: montoNum,
        fecha_acreditacion: fechaAcred,
        motivo: motivo || null,
      });
      if (error) throw new Error(error.message);
      const row = data as any;
      const nuevo: Ticket = {
        id: String(row?.id ?? Date.now())
          .slice(0, 8)
          .toUpperCase(),
        fullId: row?.id ?? undefined,
        fecha: (row?.fecha_solicitud ?? new Date().toISOString()).slice(0, 10),
        montoSolicitado: Number(row?.monto_solicitado ?? montoNum),
        montoPorAcreditar: Number(row?.monto_por_acreditar ?? porAcreditar),
        fechaAcreditacion: (row?.fecha_acreditacion ?? fechaAcred).slice(0, 10),
        estado: "pendiente",
        motivo: motivo || undefined,
        tasaInteres: row?.tasa_interes_pct != null ? Number(row.tasa_interes_pct) : null,
        plazoAdelantado:
          row?.plazo_adelantado_dias != null ? Number(row.plazo_adelantado_dias) : null,
      };
      setTickets((prev) => [nuevo, ...prev]);
      setDisponible((prev) => Math.max(0, prev - montoNum));
      setOpen(false);
      toast.success(`Ticket ${nuevo.id} creado — pendiente de aprobación`);
    } catch (e: any) {
      toast.error(e?.message ?? "No se pudo crear el ticket");
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

      {/* KPIs: Falta cobrar vs Por acreditar */}
      <div className="grid md:grid-cols-3 gap-4 mb-6">
        <Card className="border-l-4 border-l-amber-500">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Clock size={12} /> Falta cobrar
              </div>
              <div className="font-display tabular-nums text-xl md:text-2xl font-bold mt-1">
                {loading ? "—" : formatARS(faltaCobrar)}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                De tus pagadores · aún no cobrado
              </div>
            </div>
            <div className="w-9 h-9 rounded-md bg-amber-50 flex items-center justify-center text-amber-600">
              <FileText size={18} />
            </div>
          </div>
        </Card>
        <Card className="border-l-4 border-l-emerald-500">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Wallet size={12} /> Por acreditar
              </div>
              <div className="font-display tabular-nums text-xl md:text-2xl font-bold mt-1 text-emerald-700">
                {loading ? "—" : formatARS(porAcreditar)}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                MollyPay te debe · ya cobrado
              </div>
            </div>
            <div className="w-9 h-9 rounded-md bg-emerald-50 flex items-center justify-center text-emerald-600">
              <TrendingUp size={18} />
            </div>
          </div>
        </Card>
        <Card className="bg-gradient-to-br from-navy-50 to-card border-navy-100">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="text-xs uppercase tracking-wider text-navy-600 flex items-center gap-1.5">
                <CalendarDays size={12} /> Disponible para adelanto
              </div>
              <div className="font-display tabular-nums text-xl md:text-2xl font-bold mt-1 text-navy-700">
                {loading ? "—" : formatARS(disponible)}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                Por acreditar menos adelantos en curso
              </div>
              {/* Resta transparente: muestra cómo se compone el disponible */}
              {(() => {
                const totalTicketsActivos = tickets
                  .filter((t) => {
                    const e = t.estado.toLowerCase();
                    return e === "pendiente" || e === "aprobado";
                  })
                  .reduce((s, t) => s + t.montoSolicitado, 0);
                if (porAcreditar <= 0 && totalTicketsActivos <= 0) return null;
                return (
                  <div className="mt-2 text-[11px] text-navy-700/80 space-y-0.5 border-t border-navy-100 pt-2">
                    <div className="flex justify-between">
                      <span>Por acreditar total</span>
                      <span className="font-mono">{formatARS(porAcreditar)}</span>
                    </div>
                    {totalTicketsActivos > 0 && (
                      <div className="flex justify-between">
                        <span>
                          (-) Adelantos en curso{" "}
                          <span className="text-muted-foreground">
                            ({tickets.filter((t) => ["pendiente", "aprobado"].includes(t.estado.toLowerCase())).length})
                          </span>
                        </span>
                        <span className="font-mono text-amber-700">
                          - {formatARS(totalTicketsActivos)}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between border-t border-navy-100 pt-0.5 font-semibold">
                      <span>Disponible real</span>
                      <span className="font-mono">{formatARS(disponible)}</span>
                    </div>
                  </div>
                );
              })()}
            </div>
            <BtnPrimary className="shrink-0" onClick={openGeneral}>
              <ArrowUpRight size={14} /> Solicitar
            </BtnPrimary>
          </div>
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
            <FileText size={15} /> Tickets de adelanto
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
            <CheckCircle2 size={15} /> Acreditaciones
            {lotesAcreditados.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-semibold">
                {lotesAcreditados.length}
              </span>
            )}
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
            {lotesVenta.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full bg-muted text-[10px] font-semibold">
                {lotesVenta.length}
              </span>
            )}
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

        {/* Tab: Calendario */}
        {activeTab === "calendario" && (
          <div className="p-5">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <p className="text-xs text-muted-foreground">
                Cuánto te acredita MollyPay cada día. Tocá un día para solicitar el adelanto de ese
                monto.
              </p>
              {selectedDate && (
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-muted-foreground">Selección:</span>
                  <Badge tone="neutral">{fmtDateFull(selectedDate)}</Badge>
                  <span className="font-mono font-semibold">{formatARS(totalSeleccionado)}</span>
                  <BtnOutline className="h-7 px-2 text-xs" onClick={() => setSelectedDate(null)}>
                    <X size={12} /> Limpiar
                  </BtnOutline>
                </div>
              )}
            </div>

            {loading ? (
              <div className="py-10 text-center text-sm text-muted-foreground">
                Cargando calendario…
              </div>
            ) : dias.length === 0 ? (
              <div className="py-10 text-center text-sm text-muted-foreground">
                Sin acreditaciones programadas.
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
                  {calPaginated.map((d) => {
                    const active = selectedDate === d.date;
                    const pct = porAcreditar > 0 ? Math.round((d.monto / porAcreditar) * 100) : 0;
                    const ticketActivo = ticketPorFecha[d.date];
                    const estadoTkt = ticketActivo?.estado.toLowerCase();
                    // Tonos según el estado del ticket que cubre este día
                    const tktTone: "sky" | "amber" | "emerald" | null =
                      estadoTkt === "acreditado"
                        ? "emerald"
                        : estadoTkt === "aprobado"
                          ? "amber"
                          : estadoTkt === "pendiente"
                            ? "sky"
                            : null;
                    const tktLabel =
                      estadoTkt === "acreditado"
                        ? "Adelanto Acreditado"
                        : estadoTkt === "aprobado"
                          ? "Adelanto Aprobado"
                          : estadoTkt === "pendiente"
                            ? "Adelanto Pendiente"
                            : null;
                    // Remanente libre: lo que queda del lote después de
                    // restar el monto del ticket activo.
                    const remanente = ticketActivo
                      ? Math.max(0, d.monto - ticketActivo.montoSolicitado)
                      : d.monto;
                    return (
                      <button
                        key={d.date}
                        onClick={() => openForDate(d.date)}
                        className={`text-left rounded-lg border p-3 transition hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary/20 ${
                          active
                            ? "bg-navy-50 border-navy-200 ring-1 ring-navy-200"
                            : tktTone === "emerald"
                              ? "bg-emerald-50/50 border-emerald-200"
                              : tktTone === "amber"
                                ? "bg-amber-50/50 border-amber-200"
                                : tktTone === "sky"
                                  ? "bg-sky-50/50 border-sky-200"
                                  : "bg-card hover:bg-muted/50"
                        }`}
                      >
                        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          {d.label}
                        </div>
                        <div className="text-[11px] text-muted-foreground truncate" title={d.date}>
                          {new Date(d.date + "T00:00:00").toLocaleDateString("es-AR", {
                            weekday: "short",
                          })}
                        </div>
                        <div className="font-mono tabular-nums text-sm font-bold mt-2">
                          {formatARS(d.monto)}
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          {d.cantidad} ops · {pct}%
                        </div>
                        <div className="h-1.5 rounded-full bg-muted overflow-hidden mt-2">
                          <div
                            className="h-full bg-primary rounded-full"
                            style={{ width: `${Math.min(100, pct)}%` }}
                          />
                        </div>
                        {ticketActivo ? (
                          <>
                            <div
                              className={
                                "text-[11px] font-semibold mt-2 flex items-center gap-1 " +
                                (tktTone === "emerald"
                                  ? "text-emerald-700"
                                  : tktTone === "amber"
                                    ? "text-amber-700"
                                    : "text-sky-700")
                              }
                            >
                              <span>●</span>
                              <span className="truncate">
                                {tktLabel} ({formatARS(ticketActivo.montoSolicitado)})
                              </span>
                            </div>
                            <div className="text-[10px] text-muted-foreground mt-0.5">
                              Remanente libre: {formatARS(remanente)}
                            </div>
                            <div className="text-[11px] text-muted-foreground font-semibold mt-1.5 flex items-center gap-1">
                              <Eye size={11} /> Ver ticket {ticketActivo.id}
                            </div>
                          </>
                        ) : (
                          <div className="text-[11px] text-primary font-semibold mt-2 flex items-center gap-1">
                            <Plus size={11} /> Adelantar
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
                {/* Paginación calendario */}
                <div className="flex flex-wrap items-center justify-between gap-4 mt-4 border-t pt-3">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>Filas por página:</span>
                    <select
                      className="h-8 px-2 rounded border bg-card text-xs"
                      value={calPageSize}
                      onChange={(e) => {
                        setCalPageSize(Number(e.target.value));
                        setCalPage(1);
                      }}
                    >
                      {ROWS_OPTIONS.map((n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                    </select>
                    <span>
                      {dias.length === 0
                        ? "0 registros"
                        : `${(calPage - 1) * calPageSize + 1}–${Math.min(calPage * calPageSize, dias.length)} de ${dias.length}`}
                    </span>
                  </div>
                  <div className="flex gap-1">
                    <BtnOutline
                      className="h-8 px-3 text-xs"
                      disabled={calPage <= 1}
                      onClick={() => setCalPage(1)}
                    >
                      Primero
                    </BtnOutline>
                    <BtnOutline
                      className="h-8 px-3 text-xs"
                      disabled={calPage <= 1}
                      onClick={() => setCalPage((p) => Math.max(1, p - 1))}
                    >
                      Anterior
                    </BtnOutline>
                    <span className="flex items-center px-3 text-xs text-muted-foreground">
                      {calPage} / {calTotalPages}
                    </span>
                    <BtnOutline
                      className="h-8 px-3 text-xs"
                      disabled={calPage >= calTotalPages}
                      onClick={() => setCalPage((p) => Math.min(calTotalPages, p + 1))}
                    >
                      Siguiente
                    </BtnOutline>
                    <BtnOutline
                      className="h-8 px-3 text-xs"
                      disabled={calPage >= calTotalPages}
                      onClick={() => setCalPage(calTotalPages)}
                    >
                      Último
                    </BtnOutline>
                  </div>
                </div>
              </>
            )}

            {/* Detalle de comisión de cierre por lote (solo si hay selección) */}
            {selectedDate &&
              lotesAcredDetalle.length > 0 &&
              (() => {
                const lotesDelDia = lotesAcredDetalle.filter((l) => l.fecha === selectedDate);
                if (lotesDelDia.length === 0) return null;
                const totalCierreMonto = lotesDelDia.reduce(
                  (s, l) => s + (l.comisionCierreMonto ?? 0),
                  0,
                );
                return (
                  <div className="mt-4 border-t pt-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-xs font-semibold text-muted-foreground">
                        Comisión de cierre — {fmtDateFull(selectedDate)}
                      </div>
                      <BtnOutline
                        className="h-7 px-2 text-xs"
                        onClick={() => exportLoteDetalle(selectedDate)}
                      >
                        <FileSpreadsheet size={12} /> Exportar
                      </BtnOutline>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b text-muted-foreground">
                            <th className="text-left py-1.5">Lote</th>
                            <th className="text-left py-1.5">Bandera</th>
                            <th className="text-right py-1.5">Importe neto</th>
                            <th className="text-right py-1.5">Cierre %</th>
                            <th className="text-right py-1.5">Cierre $</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {lotesDelDia.map((l) => (
                            <tr key={l.id}>
                              <td className="py-1.5 font-mono">{l.id}</td>
                              <td className="py-1.5">
                                <Badge tone="neutral">{l.bandera}</Badge>
                              </td>
                              <td className="py-1.5 text-right font-mono tabular-nums">
                                {formatARS(l.importeNeto)}
                              </td>
                              <td className="py-1.5 text-right font-mono">
                                {l.comisionCierrePct != null ? `${l.comisionCierrePct}%` : "—"}
                              </td>
                              <td className="py-1.5 text-right font-mono tabular-nums font-semibold">
                                {l.comisionCierreMonto != null
                                  ? formatARS(l.comisionCierreMonto)
                                  : "—"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="border-t font-semibold">
                            <td colSpan={4} className="py-1.5 text-right text-muted-foreground">
                              Total comisión de cierre
                            </td>
                            <td className="py-1.5 text-right font-mono tabular-nums">
                              {formatARS(totalCierreMonto)}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-1">
                      La comisión de cierre es un componente separado de la comisión de MoliPay por
                      bandera/cuota.
                    </div>
                  </div>
                );
              })()}

            <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-3 border-t pt-3">
              <span className="w-2 h-2 rounded-full bg-primary" /> Monto a acreditar por día
              <span className="w-2 h-2 rounded-full bg-amber-500 ml-3" /> Falta cobrar no está en
              este calendario (es previo al cobro)
            </div>

            {/* Historial de días ya acreditados (lotes Acreditado). No son
                "por acreditar" pero el operador los ve para confirmar
                que el dinero está en su subcuenta Operativa. */}
            {diasAcreditados.length > 0 && (
              <div className="mt-4 border-t pt-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-emerald-600" />
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Historial acreditado
                    </h4>
                    <Badge tone="success">{diasAcreditados.length} días</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Total:{" "}
                    <span className="font-mono font-semibold text-emerald-700">
                      {formatARS(
                        diasAcreditados.reduce((s, d) => s + Number(d.monto ?? 0), 0),
                      )}
                    </span>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b text-muted-foreground">
                        <th className="text-left py-1.5">Fecha estimada</th>
                        <th className="text-right py-1.5">Operaciones</th>
                        <th className="text-right py-1.5">Importe neto</th>
                        <th className="text-center py-1.5">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {diasAcreditados.map((d) => (
                        <tr key={d.date}>
                          <td className="py-1.5">{fmtDateFull(d.date)}</td>
                          <td className="py-1.5 text-right font-mono tabular-nums">
                            {d.cantidad}
                          </td>
                          <td className="py-1.5 text-right font-mono tabular-nums font-semibold text-emerald-700">
                            {formatARS(d.monto)}
                          </td>
                          <td className="py-1.5 text-center">
                            <Badge tone="success">Acreditado</Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-[11px] text-muted-foreground mt-2">
                  Estos importes ya fueron depositados en tu subcuenta Operativa.
                </p>
              </div>
            )}
          </div>
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
                    <th className="text-left px-5 py-3">Ticket</th>
                    <th className="text-left px-5 py-3">Fecha solicitud</th>
                    <th className="text-right px-5 py-3">Monto solicitado</th>
                    <th className="text-left px-5 py-3">Acredita</th>
                    <th className="text-left px-5 py-3">Estado</th>
                    <th className="text-center px-5 py-3">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {tickets.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-5 py-10 text-center text-sm text-muted-foreground"
                      >
                        Aún no solicitaste adelantos. Elegí un día del calendario y creá tu primer
                        ticket.
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
                        <td className="px-5 py-3 text-xs">{fmtDateFull(t.fechaAcreditacion)}</td>
                        <td className="px-5 py-3">
                          <Badge tone={ESTADO_TICKET_TONE[t.estado]}>
                            {ESTADO_TICKET_LABEL[t.estado]}
                          </Badge>
                        </td>
                        <td className="px-5 py-3 text-center">
                          <BtnOutline className="h-8 px-2.5 text-xs" onClick={() => setDetalle(t)}>
                            <Eye size={13} /> Ver
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
        {activeTab === "acreditaciones" && (
          <div>
            <div className="px-5 py-3 border-b flex items-center justify-between gap-3">
              <div className="text-xs text-muted-foreground">
                Lotes que ya fueron acreditados a tu subcuenta Operativa (estado{" "}
                <Badge tone="success">Acreditado</Badge>). Suma:{" "}
                <span className="font-mono font-semibold text-emerald-700">
                  {formatARS(
                    lotesAcreditados.reduce((s, l) => s + Number(l.importeNeto ?? 0), 0),
                  )}
                </span>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
                    <th className="text-left px-5 py-3">Lote</th>
                    <th className="text-left px-5 py-3">Bandera</th>
                    <th className="text-right px-5 py-3">Operaciones</th>
                    <th className="text-right px-5 py-3">Importe neto</th>
                    <th className="text-left px-5 py-3">Fecha estimada</th>
                    <th className="text-left px-5 py-3">Cobro real</th>
                    <th className="text-left px-5 py-3">Acreditado el</th>
                    <th className="text-center px-5 py-3">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {acredSorted.length === 0 ? (
                    <tr>
                      <td
                        colSpan={8}
                        className="px-5 py-10 text-center text-sm text-muted-foreground"
                      >
                        Aún no tenés acreditaciones registradas.
                      </td>
                    </tr>
                  ) : (
                    acredPaginated.map((l) => (
                      <tr key={l.fullId ?? l.id} className="hover:bg-muted/30">
                        <td className="px-5 py-3 font-mono font-semibold">{l.id}</td>
                        <td className="px-5 py-3">
                          <Badge tone="neutral">{l.bandera}</Badge>
                        </td>
                        <td className="px-5 py-3 text-right font-mono tabular-nums">
                          {l.cantidadOperaciones}
                        </td>
                        <td className="px-5 py-3 text-right font-mono tabular-nums font-semibold text-emerald-700">
                          {formatARS(l.importeNeto)}
                        </td>
                        <td className="px-5 py-3 text-xs">{fmtDateFull(l.fecha)}</td>
                        <td className="px-5 py-3 text-xs">
                          {l.fechaCobroReal ? (
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono">{fmtDateFull(l.fechaCobroReal)}</span>
                              <Badge tone="success">real</Badge>
                            </div>
                          ) : (
                            <Badge tone="neutral">est.</Badge>
                          )}
                        </td>
                        <td className="px-5 py-3 text-xs font-mono">
                          {l.fechaAcreditacion ? fmtDateFull(l.fechaAcreditacion) : "—"}
                        </td>
                        <td className="px-5 py-3 text-center">
                          <Badge tone="success">Acreditado</Badge>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {acredSorted.length > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-3 border-t">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>Filas por página:</span>
                  <select
                    className="h-8 px-2 rounded border bg-card text-xs"
                    value={acredPageSize}
                    onChange={(e) => {
                      setAcredPageSize(Number(e.target.value));
                      setAcredPage(1);
                    }}
                  >
                    {ROWS_OPTIONS.map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                  <span>
                    {`${(acredPage - 1) * acredPageSize + 1}–${Math.min(acredPage * acredPageSize, acredSorted.length)} de ${acredSorted.length}`}
                  </span>
                </div>
                <div className="flex gap-1">
                  <BtnOutline
                    className="h-8 px-3 text-xs"
                    disabled={acredPage <= 1}
                    onClick={() => setAcredPage(1)}
                  >
                    Primero
                  </BtnOutline>
                  <BtnOutline
                    className="h-8 px-3 text-xs"
                    disabled={acredPage <= 1}
                    onClick={() => setAcredPage((p) => Math.max(1, p - 1))}
                  >
                    Anterior
                  </BtnOutline>
                  <span className="flex items-center px-3 text-xs text-muted-foreground">
                    {acredPage} / {acredTotalPages}
                  </span>
                  <BtnOutline
                    className="h-8 px-3 text-xs"
                    disabled={acredPage >= acredTotalPages}
                    onClick={() => setAcredPage((p) => Math.min(acredTotalPages, p + 1))}
                  >
                    Siguiente
                  </BtnOutline>
                  <BtnOutline
                    className="h-8 px-3 text-xs"
                    disabled={acredPage >= acredTotalPages}
                    onClick={() => setAcredPage(acredTotalPages)}
                  >
                    Último
                  </BtnOutline>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab: Lotes de venta */}
        {activeTab === "lotes-venta" && (
          <div>
            <div className="px-5 py-3 border-b">
              <div className="text-xs text-muted-foreground">
                Ventas del comercio por fecha y bandera. Datos de la vista{" "}
                <code className="bg-muted px-1 rounded">v_lotes_venta</code>.
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
                    <th className="text-left px-5 py-3">Fecha</th>
                    <th className="text-left px-5 py-3">Bandera</th>
                    <th className="text-right px-5 py-3">Ops</th>
                    <th className="text-right px-5 py-3">Monto operaciones</th>
                    <th className="text-right px-5 py-3">Comisión</th>
                    <th className="text-right px-5 py-3">Impuesto</th>
                    <th className="text-right px-5 py-3">Monto cobrado</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {lotesVenta.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-5 py-10 text-center text-sm text-muted-foreground"
                      >
                        No se encontraron lotes de venta.
                      </td>
                    </tr>
                  ) : (
                    ventaPaginated.map((v, idx) => (
                      <tr key={`${v.fecha}-${v.bandera}-${idx}`} className="hover:bg-muted/30">
                        <td className="px-5 py-3 text-xs">{fmtDateFull(v.fecha)}</td>
                        <td className="px-5 py-3">
                          <Badge tone="neutral">{v.bandera}</Badge>
                        </td>
                        <td className="px-5 py-3 text-right font-mono tabular-nums">
                          {v.cantidadOperaciones}
                        </td>
                        <td className="px-5 py-3 text-right font-mono tabular-nums font-semibold">
                          {formatARS(v.montoOperaciones)}
                        </td>
                        <td className="px-5 py-3 text-right font-mono tabular-nums text-muted-foreground">
                          {formatARS(v.comision)}
                        </td>
                        <td className="px-5 py-3 text-right font-mono tabular-nums text-muted-foreground">
                          {formatARS(v.impuesto)}
                        </td>
                        <td className="px-5 py-3 text-right font-mono tabular-nums font-semibold text-emerald-700">
                          {formatARS(v.montoCobrado)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {lotesVenta.length > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-3 border-t">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>Filas por página:</span>
                  <select
                    className="h-8 px-2 rounded border bg-card text-xs"
                    value={ventaPageSize}
                    onChange={(e) => {
                      setVentaPageSize(Number(e.target.value));
                      setVentaPage(1);
                    }}
                  >
                    {ROWS_OPTIONS.map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                  <span>
                    {`${(ventaPage - 1) * ventaPageSize + 1}–${Math.min(ventaPage * ventaPageSize, lotesVenta.length)} de ${lotesVenta.length}`}
                  </span>
                </div>
                <div className="flex gap-1">
                  <BtnOutline
                    className="h-8 px-3 text-xs"
                    disabled={ventaPage <= 1}
                    onClick={() => setVentaPage(1)}
                  >
                    Primero
                  </BtnOutline>
                  <BtnOutline
                    className="h-8 px-3 text-xs"
                    disabled={ventaPage <= 1}
                    onClick={() => setVentaPage((p) => Math.max(1, p - 1))}
                  >
                    Anterior
                  </BtnOutline>
                  <span className="flex items-center px-3 text-xs text-muted-foreground">
                    {ventaPage} / {ventaTotalPages}
                  </span>
                  <BtnOutline
                    className="h-8 px-3 text-xs"
                    disabled={ventaPage >= ventaTotalPages}
                    onClick={() => setVentaPage((p) => Math.min(ventaTotalPages, p + 1))}
                  >
                    Siguiente
                  </BtnOutline>
                  <BtnOutline
                    className="h-8 px-3 text-xs"
                    disabled={ventaPage >= ventaTotalPages}
                    onClick={() => setVentaPage(ventaTotalPages)}
                  >
                    Último
                  </BtnOutline>
                </div>
              </div>
            )}
          </div>
        )}

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
                      <span className="text-muted-foreground">Por acreditar total</span>
                      <span className="font-mono">{formatARS(porAcreditar)}</span>
                    </div>
                    {(() => {
                      const reservados = tickets
                        .filter((t) => ["pendiente", "aprobado"].includes(t.estado.toLowerCase()))
                        .reduce((s, t) => s + t.montoSolicitado, 0);
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
                      <Clock size={14} /> Recordatorio
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Comisión por acreditación</span>
                      <span className="font-mono font-semibold">$45 + IVA</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Plazo de acreditación</span>
                      <span className="font-mono font-semibold">30 días</span>
                    </div>
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
                    <BtnPrimary className="flex-1" disabled={saving} onClick={handleCreate}>
                      {saving ? "Creando…" : "Crear ticket"}
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
              <div className="font-semibold">Ticket {detalle.id}</div>
              <Badge tone={ESTADO_TICKET_TONE[detalle.estado]}>
                {ESTADO_TICKET_LABEL[detalle.estado]}
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
              <div className="flex justify-between">
                <span className="text-muted-foreground">Fecha a adelantar</span>
                <span className="font-semibold">{fmtDateFull(detalle.fechaAcreditacion)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Por acreditar al momento</span>
                <span className="font-mono">{formatARS(detalle.montoPorAcreditar)}</span>
              </div>
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
                    Si estás conforme con la tasa, no hace falta confirmar: el
                    administrador procesará el pago en breve y vas a ver el neto
                    acreditado en tu Saldo Disponible.
                  </p>
                  {detalle.tasaInteres != null && (() => {
                    // Regla de negocio: TEM = Tasa Efectiva Mensual.
                    // Interés = monto_solicitado * TEM / 100
                    // Neto a recibir = monto_solicitado - Interés
                    const tem = detalle.tasaInteres;
                    const interes = Math.round(detalle.montoSolicitado * tem) / 100;
                    const neto = Math.max(0, detalle.montoSolicitado - interes);
                    const tna = tem * 12;
                    return (
                      <>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Monto solicitado</span>
                          <span className="font-mono font-semibold">
                            {formatARS(detalle.montoSolicitado)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Tasa de interés (TEM)</span>
                          <span className="font-mono font-bold text-emerald-700">
                            {tem}%
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Costo financiero (interés)</span>
                          <span className="font-mono font-semibold text-red-600">
                            - {formatARS(interes)}
                          </span>
                        </div>
                        <div className="flex justify-between pt-1 border-t border-emerald-200">
                          <span className="text-muted-foreground">Neto a recibir</span>
                          <span className="font-mono font-bold text-emerald-700">
                            {formatARS(neto)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">TNA equivalente</span>
                          <span className="font-mono text-muted-foreground">
                            {tna.toFixed(1)}%
                          </span>
                        </div>
                      </>
                    );
                  })()}
                </div>
              )}
              <div className="flex gap-2 pt-4">
                <BtnOutline className="flex-1" onClick={() => setDetalle(null)}>
                  Cerrar
                </BtnOutline>
                {(detalle.estado === "pendiente" || detalle.estado === "aprobado") && (
                  <button
                    className="inline-flex items-center justify-center gap-2 h-10 px-5 rounded-sm border border-red-200 bg-white text-red-600 text-sm font-semibold cursor-pointer hover:bg-red-50 active:bg-red-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-150 flex-1"
                    disabled={saving}
                    onClick={() => {
                      if (
                        confirm(
                          detalle.estado === "aprobado"
                            ? "¿Rechazás la oferta del administrador? El adelanto pasará a Cancelado y se liberará el cupo reservado de tus lotes."
                            : "¿Seguro que querés cancelar esta solicitud? Esta acción no se puede deshacer.",
                        )
                      ) {
                        handleCancel(detalle.fullId);
                      }
                    }}
                  >
                    {saving ? "Cancelando…" : "Cancelar adelantar"}
                  </button>
                )}
                <BtnPrimary
                  className="flex-1"
                  onClick={() => {
                    toast.success(`Comprobante ${detalle.id} descargado`);
                  }}
                >
                  <Download size={14} /> Comprobante
                </BtnPrimary>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

