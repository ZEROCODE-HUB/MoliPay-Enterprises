import { requireSupabase } from "@/infrastructure/supabase/client";
import { toAppError } from "@/infrastructure/supabase/errors";
import { callRpc } from "@/infrastructure/supabase/rpc";
import { fmtDate } from "./settlements.rules";
import type {
AdvanceableOperation,
BatchAcredDetail,
BatchCompany,
BatchSale,
BreakdownBatch,
CapAdvance,
ChargebackCompany,
DayCalV3,
DayCredit,
Excepcion,
FeeBrand,
SaleDayCompany,
SaleDetailCompany,
SettlementsOverview,
SettlementsSummary,
Tax,
Ticket,
TicketStatus,
} from "./settlements.types";

export async function loadBreakdown(batchId: string): Promise<BreakdownBatch> {
  const sb = requireSupabase();
  const { data, error } = await sb.rpc("comercio_lote_apertura", { p_lote_id: batchId });
  if (error) throw toAppError(error);
  return data as BreakdownBatch;
}

const context = { feature: "settlements", operation: "overview" };

/**
 * Datos de la pantalla principal de Liquidaciones. RLS no siempre restringe por usuario
 * en estas tablas: el filtro por legajo y comercio_id es obligatorio. Las tablas que todavia
 * pueden no existir (lotes de venta, comisiones, impuestos) se muestran vacias sin error.
 */
export async function loadSettlementsOverview(legajo: string): Promise<SettlementsOverview> {
  const sb = requireSupabase();
  const { data: merchant, error: merchantError } = await sb
    .from("comercios")
    .select("id")
    .eq("legajo", legajo)
    .maybeSingle();
  if (merchantError) throw toAppError(merchantError, context);
  const merchantId: string | null = merchant?.id ?? null;
  let advanceCap: CapAdvance | null = null;

  // 1) Falta cobrar: usamos la RPC `calendario_resumen_saldos` que es
  //    la fuente única de verdad (suma de lotes_venta sin lote_acreditacion).
  let falta = 0;
  let advancesEnCursoCalc = 0;
  if (merchantId) {
    try {
      const { data: summaryRpc, error: rpcErr } = await sb.rpc("calendario_resumen_saldos", {
        p_comercio_id: merchantId,
      });
      if (!rpcErr && summaryRpc) {
        const r = summaryRpc as Record<string, unknown>;
        falta = Number(r.falta_cobrar ?? 0);
        advancesEnCursoCalc = Number(r.adelantos_en_curso ?? 0);
      }
    } catch (e) {
      console.warn("calendario_resumen_saldos no disponible, fallback:", e);
    }
  }

  // 2) Lotes de acreditación del comercio logueado. Filtramos
  //    por comercio_id explícitamente (no por RLS) y separamos
  //    los pendientes (calendario futuro) de los ya Acreditados
  //    (historial), porque un lote Acreditado no es "por acreditar".
  let credit = 0;
  let disp = 0;
  const ticketsReal: Ticket[] = [];
  const byDay: Record<string, { monto: number; cantidad: number }> = {};
  const byDayCredited: Record<string, { monto: number; cantidad: number }> = {};
  let acredDetail: BatchAcredDetail[] = [];
  let acredListado: BatchAcredDetail[] = [];

  if (merchantId) {
    const { data: batchRows, error: batchError } = await sb
      .from("lotes_acreditacion")
      .select(
        "id, fecha, cantidad_operaciones, importe_neto, estado, comision_cierre_lote_pct, comision_cierre_lote_monto, bandera, fecha_resolucion, fecha_cobro_real",
      )
      .eq("comercio_id", merchantId)
      .neq("estado", "Liquidado");

    if (batchError) throw toAppError(batchError, context);
    const rows = (batchRows ?? []) as any[];
    const pendings = rows.filter(
      (l) => l.estado !== "Acreditado" && l.estado !== "Rechazado" && l.estado !== "Cancelado",
    );
    const crediteds = rows.filter((l) => l.estado === "Acreditado");
    // KPI "Por acreditar": solo los pendientes (los Acreditados ya están pagados).
    credit = pendings.reduce((s, l) => s + Number(l.importe_neto ?? 0), 0);

    // Detalle completo de TODOS los lotes (para que el operador
    // pueda ver también el historial de los Acreditados al
    // seleccionar una fecha).
    acredDetail = rows.map((l) => ({
      id: String(l.id).slice(0, 8).toUpperCase(),
      fullId: l.id,
      fecha: (l.fecha ?? "").slice(0, 10),
      fechaAcreditacion:
        l.fecha_resolucion != null ? new Date(l.fecha_resolucion).toISOString().slice(0, 10) : "",
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
    acredListado = acredDetail.filter((l) => l.estado === "Acreditado");

    // Calendario de próximas acreditaciones.
    pendings.forEach((l) => {
      const date = (l.fecha ?? "").slice(0, 10);
      if (!date) return;
      if (!byDay[date]) byDay[date] = { monto: 0, cantidad: 0 };
      byDay[date].monto += Number(l.importe_neto ?? 0);
      byDay[date].cantidad += Number(l.cantidad_operaciones ?? 0);
    });
    // Calendario de acreditaciones pasadas (para mostrar el
    // historial de pagos confirmados).
    crediteds.forEach((l) => {
      const date = (l.fecha ?? "").slice(0, 10);
      if (!date) return;
      if (!byDayCredited[date]) byDayCredited[date] = { monto: 0, cantidad: 0 };
      byDayCredited[date].monto += Number(l.importe_neto ?? 0);
      byDayCredited[date].cantidad += Number(l.cantidad_operaciones ?? 0);
    });

    // 3) Adelantos del propio comercio. Filtro por comercio_id.
    const { data: adelRows, error: advanceError } = await sb
      .from("adelantos")
      .select(
        "id, monto_solicitado, monto_por_acreditar, fecha_acreditacion, estado, motivo, fecha_solicitud, created_at, tasa_interes_pct, plazo_adelantado_dias, fecha_resolucion, monto_ofertado, descuento, neto_a_recibir, compensado, rechazo_motivo",
      )
      .eq("comercio_id", merchantId)
      .order("fecha_solicitud", { ascending: false });

    if (advanceError) throw toAppError(advanceError, context);

    // El "Disponible para adelanto" sale de la RPC `adelanto_tope`: lo
    // vendido con tarjeta y no acreditado menos los adelantos vigentes,
    // y si el comercio cumple la antigüedad mínima.
    try {
      const { data: capRpc, error: rpcError } = await sb.rpc("adelanto_tope", {
        p_comercio_id: merchantId,
      });
      if (rpcError) throw toAppError(rpcError);
      const t = (capRpc ?? {}) as Record<string, unknown>;
      disp = Math.max(0, Number(t.tope ?? 0));
      advancesEnCursoCalc = Number(t.adelantos_vigentes ?? 0);
      advanceCap = {
        tope: disp,
        vendidoNoAcreditado: Number(t.vendido_no_acreditado ?? 0),
        adelantosVigentes: Number(t.adelantos_vigentes ?? 0),
        cumpleAntiguedad: Boolean(t.cumple_antiguedad),
        antiguedadDias: t.antiguedad_dias != null ? Number(t.antiguedad_dias) : null,
        antiguedadMinima: Number(t.antiguedad_minima_dias ?? 90),
        deuda: Number(t.deuda_pendiente ?? 0),
      };
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
        estado: ((r.estado ?? "pendiente") as string).toLowerCase() as TicketStatus,
        motivo: r.motivo ?? undefined,
        tasaInteres: r.tasa_interes_pct != null ? Number(r.tasa_interes_pct) : null,
        plazoAdelantado: r.plazo_adelantado_dias != null ? Number(r.plazo_adelantado_dias) : null,
        montoOfertado: r.monto_ofertado != null ? Number(r.monto_ofertado) : null,
        descuento: r.descuento != null ? Number(r.descuento) : null,
        netoARecibir: r.neto_a_recibir != null ? Number(r.neto_a_recibir) : null,
        compensado: Number(r.compensado ?? 0),
        rechazoMotivo: r.rechazo_motivo ?? null,
      })),
    );
  }

  // 4) Lotes de venta — filtrado por comercio_id.
  let saleRows: BatchSale[] = [];
  try {
    // Sin comercio no se consulta: traeria las ventas de todos si RLS lo permitiera.
    const { data: vRows } = merchantId
      ? await sb
          .from("v_lotes_venta")
          .select("*")
          .eq("comercio_id", merchantId)
          .order("fecha", { ascending: false })
      : { data: [] };
    saleRows = (vRows ?? []).map((r: any) => ({
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
  let feesData: FeeBrand[] = [];
  try {
    const { data: cbRows } = await sb
      .from("comercio_banderas")
      .select("id, bandera, estado")
      .eq("cliente_legajo", legajo);
    if (cbRows && cbRows.length > 0) {
      const cbIds = (cbRows as any[]).map((r: any) => r.id);
      const { data: installmentsRows } = await sb
        .from("comercio_banderas_cuotas")
        .select("comercio_bandera_id, cuotas, tasa_mensual, estado")
        .in("comercio_bandera_id", cbIds);
      const brandMap = new Map((cbRows as any[]).map((r: any) => [r.id, r.bandera]));
      feesData = (installmentsRows ?? []).map((c: any) => ({
        bandera: brandMap.get(c.comercio_bandera_id) ?? "—",
        cuotas: Number(c.cuotas ?? 0),
        tasaMensual: Number(c.tasa_mensual ?? 0),
        estado: c.estado ?? "Activo",
      }));
    }
  } catch {
    // Tablas aún no creadas
  }

  // 6) Impuestos externos + excepciones del comercio
  let taxesData: Tax[] = [];
  let excepcionesData: Excepcion[] = [];
  try {
    const { data: impRows } = await sb
      .from("taxes")
      .select("id, code, description, rate_source, status, tax_rates(value, status)")
      .eq("scope", "external")
      .eq("status", "active");
    taxesData = (impRows ?? []).map((r: any) => ({
      id: r.id,
      codigo: r.code ?? "",
      descripcion: r.description ?? "",
      tipo:
        r.rate_source === "taxpayer_registry"
          ? "Padrón"
          : r.rate_source === "fixed"
            ? "Fija"
            : "Manual",
      alicuota: Number((r.tax_rates ?? []).find((t: any) => t.status === "active")?.value ?? 0),
      estado: "Activo",
    }));

    if (legajo) {
      // Exenciones vigentes del comercio (hoy RLS solo deja leer a admins).
      const { data: excRows } = await sb
        .from("tax_exemptions")
        .select("reason, status, valid_to, direction, taxes(code)")
        .eq("client_legajo", legajo)
        .eq("status", "active")
        .or(`valid_to.is.null,valid_to.gte.${new Date().toISOString()}`);
      excepcionesData = (excRows ?? []).map((r: any) => {
        const tax = Array.isArray(r.taxes) ? r.taxes[0] : r.taxes;
        return {
          impuestoCodigo: tax?.code ?? "—",
          motivo: r.reason ?? "Exención",
          estado: "Activo",
          vigenciaHasta: r.valid_to ?? null,
        };
      });
    }
  } catch {
    // Tablas aún no disponibles
  }

  const toDays = (
    byDate: Record<string, { monto: number; cantidad: number }>,
    direction: 1 | -1,
  ): DayCredit[] =>
    Object.entries(byDate)
      .sort(([a], [b]) => direction * a.localeCompare(b))
      .map(([date, v]) => ({ date, label: fmtDate(date), monto: v.monto, cantidad: v.cantidad }));

  return {
    merchantId,
    pendingCollection: falta,
    toCredit: credit,
    advancesInProgress: advancesEnCursoCalc,
    availableForAdvance: disp,
    advanceCap,
    days: toDays(byDay, 1),
    creditedDays: toDays(byDayCredited, -1),
    tickets: ticketsReal,
    saleBatches: saleRows,
    creditBatchDetail: acredDetail,
    creditedBatches: acredListado,
    fees: feesData,
    taxes: taxesData,
    exceptions: excepcionesData,
  };
}

export async function getSettlementsSummary(): Promise<SettlementsSummary> {
  return callRpc<SettlementsSummary>("comercio_liquidaciones_resumen", {}, { context });
}

export async function listCalendarDays(from: string, to: string): Promise<DayCalV3[]> {
  const data = await callRpc<{ dias?: DayCalV3[] } | null>(
    "calendario_acreditaciones_v3",
    { p_desde: from, p_hasta: to, p_comercio_id: null },
    { context },
  );
  return data?.dias ?? [];
}

export async function listBatchesByRange(from: string, to: string): Promise<BatchCompany[]> {
  const data = await callRpc<BatchCompany[] | null>(
    "comercio_lotes_acreditacion",
    { p_desde: from, p_hasta: to },
    { context },
  );
  return data ?? [];
}

export async function listSalesByDay(from: string, to: string): Promise<SaleDayCompany[]> {
  const data = await callRpc<SaleDayCompany[] | null>(
    "comercio_ventas_dia",
    { p_desde: from, p_hasta: to },
    { context },
  );
  return data ?? [];
}

export async function listSaleDetail(date: string): Promise<SaleDetailCompany[]> {
  const data = await callRpc<SaleDetailCompany[] | null>(
    "comercio_ventas_detalle",
    { p_fecha: date },
    { context },
  );
  return data ?? [];
}

export function listChargebacks() {
  return callRpc<{ deuda_pendiente: number; contracargos: ChargebackCompany[] }>(
    "comercio_contracargos",
    {},
    { context },
  );
}

// --- Adelantos: validan monto, tope y antiguedad en el servidor ------------------------

type AdvanceableOperationRow = {
  transaction_id: string;
  id_txn: string | null;
  bandera: string;
  monto_operacion: number | string;
  neto_estimado: number | string;
  fecha_lote: string;
};

export async function listAdvanceableOperations(): Promise<AdvanceableOperation[]> {
  const rows = await callRpc<AdvanceableOperationRow[]>(
    "adelanto_operaciones_disponibles",
    {},
    { context: { feature: "settlements", operation: "advance_operations" } },
  );
  return rows.map((r) => ({
    transactionId: r.transaction_id,
    reference: r.id_txn ?? r.transaction_id.slice(0, 8).toUpperCase(),
    brand: r.bandera,
    amount: Number(r.monto_operacion),
    estimatedNet: Number(r.neto_estimado),
    batchDate: r.fecha_lote,
  }));
}

/** El monto lo calcula el servidor a partir de la operacion. */
export function requestAdvance(input: { transactionId: string; reason: string | null }) {
  return callRpc<{ adelanto_id?: string } | null>(
    "adelanto_solicitar",
    {
      p_transaction_id: input.transactionId,
      p_motivo: input.reason,
    },
    { context: { feature: "settlements", operation: "advance_request" } },
  );
}

export async function acceptAdvance(advanceId: string): Promise<void> {
  await callRpc(
    "adelanto_aceptar",
    { p_adelanto_id: advanceId, p_acepto: true },
    {
      context: { feature: "settlements", operation: "advance_accept" },
    },
  );
}

export function cancelAdvance(advanceId: string) {
  return callRpc<{ estado?: string } | null>(
    "cancelar_adelanto",
    { p_adelanto_id: advanceId },
    {
      context: { feature: "settlements", operation: "advance_cancel" },
    },
  );
}
