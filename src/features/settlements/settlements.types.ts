// pendiente = Solicitado, aprobado = Oferta recibida (con tasa). La empresa
// acepta o cancela; MoliPay acredita; el sistema lo marca Compensado cuando
// ya se descontó de las liquidaciones siguientes.
export type TicketStatus =
  | "pendiente"
  | "aprobado"
  | "aceptado"
  | "cancelado"
  | "rechazado"
  | "acreditado"
  | "compensado";
export type Ticket = {
  id: string;
  fullId?: string;
  fecha: string;
  montoSolicitado: number;
  montoPorAcreditar: number;
  fechaAcreditacion: string;
  estado: TicketStatus;
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

/** Venta con tarjeta sin acreditar que se puede adelantar. */
export type AdvanceableOperation = {
  transactionId: string;
  reference: string;
  brand: string;
  amount: number;
  /** Neto de la venta en su lote (con Payway, tasa, IVA, cierre, IIBB y DyC). */
  estimatedNet: number;
  /** Ya pedido o adelantado de esta operacion. */
  advanced: number;
  /** Lo que queda por adelantar: neto - adelantado. */
  available: number;
  batchDate: string;
};

/** Tope y condiciones para pedir un adelanto (RPC adelanto_tope). */
export type CapAdvance = {
  tope: number;
  vendidoNoAcreditado: number;
  adelantosVigentes: number;
  cumpleAntiguedad: boolean;
  antiguedadDias: number | null;
  antiguedadMinima: number;
  deuda: number;
};

export type DayCredit = {
  date: string; // YYYY-MM-DD
  label: string; // DD/MM
  monto: number;
  cantidad: number;
};

export type BatchSale = {
  id: string;
  fecha: string;
  bandera: string;
  cantidadOperaciones: number;
  montoOperaciones: number;
  comision: number;
  impuesto: number;
  montoCobrado: number;
};

export type BatchAcredDetail = {
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

export type FeeBrand = {
  bandera: string;
  cuotas: number;
  tasaMensual: number;
  estado: string;
};

export type Tax = {
  id: string;
  codigo: string;
  descripcion: string;
  tipo: string;
  alicuota: number;
  estado: string;
};

export type Excepcion = {
  impuestoCodigo: string;
  motivo: string;
  estado: string;
  vigenciaHasta: string | null;
};

export type TabSection =
  | "calendario"
  | "tickets"
  | "lotes-venta"
  | "comisiones"
  | "acreditaciones"
  | "contracargos";

export type DayCalV3 = {
  fecha: string;
  no_habil: boolean;
  programado: number;
  acreditado: number;
  total: number;
};

export type BatchCompany = {
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

export type BreakdownBatch = {
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
  impuestos:
    | {
        asignacion_id: string;
        codigo: string;
        nombre: string;
        alicuota: number | null;
        monto: number;
      }[]
    | null;
  retencion_contracargos: number | null;
  compensacion_adelantos: number;
  recuperacion_deuda: number;
  neto: number;
  es_negativo: boolean;
  ventas: {
    id_txn: string;
    fecha: string;
    bandera: string | null;
    cuotas: number;
    monto: number;
    tipo: string;
  }[];
};

export type SaleDayCompany = {
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

export type SaleDetailCompany = {
  id: string;
  id_txn: string;
  fecha: string;
  bandera: string | null;
  cuotas: number;
  monto: number;
  estado: string;
  lote: { codigo: string; estado: string; fecha: string; origen: string } | null;
};

export type ChargebackCompany = {
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

/** Resumen del comercio (RPC comercio_liquidaciones_resumen). */
export type SettlementsSummary = {
  saldo_disponible: number;
  pendiente_acreditacion: number;
  proxima_acreditacion: { fecha: string; monto: number } | null;
  vendido_periodo: number;
  ventas_periodo: number;
  adelanto_pendiente_compensar: number;
  deuda_contracargos: number;
  saldo_negativo: boolean;
  ultimas_acreditaciones: {
    lote_id: string;
    codigo: string;
    bandera: string;
    fecha_acreditacion: string;
    neto: number;
  }[];
  proximas_acreditaciones: {
    lote_id: string;
    codigo: string;
    bandera: string;
    fecha: string;
    neto: number;
  }[];
};

export type SettlementsOverview = {
  merchantId: string | null;
  /** Vendido sin lote de acreditacion (calendario_resumen_saldos). */
  pendingCollection: number;
  toCredit: number;
  advancesInProgress: number;
  availableForAdvance: number;
  advanceCap: CapAdvance | null;
  days: DayCredit[];
  creditedDays: DayCredit[];
  tickets: Ticket[];
  saleBatches: BatchSale[];
  creditBatchDetail: BatchAcredDetail[];
  creditedBatches: BatchAcredDetail[];
  fees: FeeBrand[];
  taxes: Tax[];
  exceptions: Excepcion[];
};

/** Desglose de una venta dentro de su lote (RPC venta_desglose). */
export type SaleBreakdown = {
  estado: string;
  monto: number;
  lote?: {
    id: string;
    codigo: string;
    bandera: string;
    fecha: string;
    fecha_acreditacion: string | null;
    bruto: number;
    ventas: number;
  };
  lineas?: {
    concepto: string;
    clase: "payway" | "molipay" | "impuesto" | "iibb" | "dyc";
    monto: number;
    total_lote: number;
  }[];
  descuentos?: number;
  contracargo_retenido?: number;
  adelanto_compensado?: number;
  neto?: number;
  otros_del_lote?: number;
  contracargo: { estado: string; tipo: string | null; importe: number } | null;
};
