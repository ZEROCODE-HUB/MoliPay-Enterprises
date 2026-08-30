import { subDays, format, parseISO } from "date-fns";

// ===== Tipos principales =====
export type LoteEstado =
  "cargado" | "en_proceso" | "finalizado" | "pausado" | "eliminado" | "error";

export type MedioPago = "TRANSFERENCIA" | "TARJETA_CREDITO" | "TARJETA_DEBITO" | "QR";

export type RegistroEstado = "pendiente" | "pagado_total" | "pagado_parcial" | "vencido" | "error";

export type PagoEstado = "aprobado" | "pendiente" | "rechazado";

export type TipoOperacion = "TRANSFERENCIA_BANCARIA" | "QR" | "TARJETA_DEBITO_CREDITO";

export interface Lote {
  id: string;
  nombre: string;
  periodo: string;
  diaProcesamiento: string;
  estado: LoteEstado;
  tasaInteres: number;
  fechaVencimiento1: string;
  fechaVencimiento2: string | null;
  fechaVencimiento3: string | null;
  mediosPago: MedioPago[];
  pagosParcialesHabilitado: boolean;
  notificacionesHabilitado: boolean;
  createdAt: string;
  fechaInicio: string | null;
  fechaFinalizacion: string | null;
}

export interface RegistroDeLote {
  id: string;
  loteId: string;
  tipoEntidad: string;
  idEntidad: string;
  subEntidad: string;
  identificacionUsuario: string;
  monto: number;
  descripcion: string;
  email: string | null;
  periodoFacturacion: string | null;
  idUnicoBeneficiario: string | null;
  fechaVencimiento1: string | null;
  fechaVencimiento2: string | null;
  fechaVencimiento3: string | null;
  tasaInteres: number | null;
  mediosPago: MedioPago[] | null;
  pagosParcialesHabilitado: boolean | null;
  cbuId: string | null;
  linkDePago: string | null;
  estado: RegistroEstado;
  montoPagado: number;
  fechaPago: string | null;
  createdAt: string;
  emailEnviado: boolean;
}

export interface Pago {
  id: string;
  registroId: string;
  loteId: string;
  monto: number;
  montoDeclarado: number | null;
  medioPago: MedioPago;
  tipoOperacion: TipoOperacion;
  timestamp: string;
  estado: PagoEstado;
  externalReference: string | null;
}

export interface CBURecord {
  id: string;
  tipoEntidad: string;
  idEntidad: string;
  subEntidad: string;
  cbu: string;
  alias: string;
  createdAt: string;
}

// ===== Helpers =====
const now = new Date();

function fmtFull(d: Date): string {
  return format(d, "yyyy-MM-dd HH:mm:ss");
}

function rand(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function formatARS(n: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 2,
  }).format(n);
}

export function generateId(prefix: string): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let r = "";
  for (let i = 0; i < 6; i++) r += chars[rand(0, chars.length - 1)];
  return `${prefix}-${r}`;
}

// ===== Datos =====
// Los lotes, registros y pagos se cargan desde la API. El arranque de la
// plataforma comienza vacio y se completa con datos reales de las entidades.
const cbuPool: CBURecord[] = [];

export const lotesMock: Lote[] = [];
export const registrosMock: RegistroDeLote[] = [];
export const pagosMock: Pago[] = [];
export const cbusMock: CBURecord[] = cbuPool;

export const lotes = lotesMock;
export const registros = registrosMock;
export const pagos = pagosMock;
export const cbus = cbusMock;

// ===== Helpers de filtrado y cálculo =====
export interface PeriodFilter {
  label: string;
  from: Date;
  to: Date;
}

export function periodFilter(label: string, days?: number, from?: Date, to?: Date): PeriodFilter {
  if (days !== undefined) return { label, from: subDays(now, days), to: now };
  return { label, from: from!, to: to! };
}

function parseDate(s: string): Date {
  try {
    return parseISO(s);
  } catch {
    return new Date();
  }
}

function filterLotes(filter: PeriodFilter): Lote[] {
  return lotesMock.filter((l) => {
    const d = parseDate(l.createdAt);
    return d >= filter.from && d <= filter.to;
  });
}

// ===== Dashboard KPIs =====
export interface DashboardKPI {
  totalLotes: number;
  enProceso: number;
  finalizados: number;
  conError: number;
  montoTotal: number;
  montoCobrado: number;
  montoPendiente: number;
}

export function computeDashboardKPI(filter: PeriodFilter): DashboardKPI {
  const lotesFiltrados = filterLotes(filter);
  const lotesValidos = lotesFiltrados.filter((l) => l.estado !== "eliminado");

  return {
    totalLotes: lotesValidos.length,
    enProceso: lotesValidos.filter((l) => l.estado === "en_proceso").length,
    finalizados: lotesValidos.filter((l) => l.estado === "finalizado").length,
    conError: lotesValidos.filter((l) => l.estado === "error").length,
    montoTotal: lotesValidos.reduce((sum, l) => {
      const regs = registrosMock.filter((r) => r.loteId === l.id);
      return sum + regs.reduce((s, r) => s + r.monto, 0);
    }, 0),
    montoCobrado: lotesValidos.reduce((sum, l) => {
      const regs = registrosMock.filter((r) => r.loteId === l.id);
      return sum + regs.reduce((s, r) => s + r.montoPagado, 0);
    }, 0),
    montoPendiente: lotesValidos.reduce((sum, l) => {
      const regs = registrosMock.filter((r) => r.loteId === l.id);
      return sum + regs.reduce((s, r) => s + (r.monto - r.montoPagado), 0);
    }, 0),
  };
}

// ===== Cobros por medio de pago =====
export interface MedioPagoData {
  medio: string;
  monto: number;
  cantidad: number;
  porcentaje: number;
}

export function computePorMedio(filter: PeriodFilter): MedioPagoData[] {
  const lotesFiltrados = filterLotes(filter);
  const loteIds = new Set(lotesFiltrados.map((l) => l.id));
  const pagosFiltrados = pagosMock.filter((p) => loteIds.has(p.loteId) && p.estado === "aprobado");

  const grouped: Record<string, { monto: number; cantidad: number }> = {};
  for (const p of pagosFiltrados) {
    if (!grouped[p.medioPago]) grouped[p.medioPago] = { monto: 0, cantidad: 0 };
    grouped[p.medioPago].monto += p.monto;
    grouped[p.medioPago].cantidad += 1;
  }

  const total = Object.values(grouped).reduce((s, g) => s + g.monto, 0);
  return Object.entries(grouped).map(([medio, data]) => ({
    medio,
    monto: data.monto,
    cantidad: data.cantidad,
    porcentaje: total > 0 ? Math.round((data.monto / total) * 100) : 0,
  }));
}

// ===== Cobros por vencimiento =====
export interface VencimientoData {
  label: string;
  cantidad: number;
  monto: number;
}

export function computePorVencimiento(filter: PeriodFilter): VencimientoData[] {
  const lotesFiltrados = filterLotes(filter);
  const loteIds = new Set(lotesFiltrados.map((l) => l.id));
  const regs = registrosMock.filter((r) => loteIds.has(r.loteId) && r.montoPagado > 0);

  const result: VencimientoData[] = [
    { label: "1er vencimiento", cantidad: 0, monto: 0 },
    { label: "2do vencimiento", cantidad: 0, monto: 0 },
    { label: "3er vencimiento", cantidad: 0, monto: 0 },
  ];

  for (const r of regs) {
    if (!r.fechaPago) continue;
    const fp = parseDate(r.fechaPago);
    const v1 = r.fechaVencimiento1 ? parseDate(r.fechaVencimiento1) : null;
    const v2 = r.fechaVencimiento2 ? parseDate(r.fechaVencimiento2) : null;
    const v3 = r.fechaVencimiento3 ? parseDate(r.fechaVencimiento3) : null;

    if (v1 && fp <= v1) {
      result[0].cantidad += 1;
      result[0].monto += r.montoPagado;
    } else if (v2 && fp <= v2) {
      result[1].cantidad += 1;
      result[1].monto += r.montoPagado;
    } else if (v3 && fp <= v3) {
      result[2].cantidad += 1;
      result[2].monto += r.montoPagado;
    } else if (v1 && !v2) {
      result[0].cantidad += 1;
      result[0].monto += r.montoPagado;
    }
  }

  return result;
}

// ===== Operaciones no cobradas =====
export interface NoCobradasData {
  totalOperaciones: number;
  vencidas: number;
  vigentes: number;
  montoNoCobrado: number;
  porcentajeNoCobrado: number;
}

export function computeNoCobradas(filter: PeriodFilter): NoCobradasData {
  const lotesFiltrados = filterLotes(filter);
  const loteIds = new Set(lotesFiltrados.map((l) => l.id));
  const regs = registrosMock.filter((r) => loteIds.has(r.loteId));

  const noCobradas = regs.filter((r) => r.estado !== "pagado_total");
  const vencidas = noCobradas.filter((r) => r.estado === "vencido");
  const vigentes = noCobradas.filter((r) => r.estado !== "vencido");

  const montoTotal = regs.reduce((s, r) => s + r.monto, 0);
  const montoNoCobrado = noCobradas.reduce((s, r) => s + (r.monto - r.montoPagado), 0);

  return {
    totalOperaciones: regs.length,
    vencidas: vencidas.length,
    vigentes: vigentes.length,
    montoNoCobrado,
    porcentajeNoCobrado: montoTotal > 0 ? Math.round((montoNoCobrado / montoTotal) * 100) : 0,
  };
}

// ===== Evolución de pagos =====
export interface EvolucionData {
  fecha: string;
  monto: number;
  cantidad: number;
}

export function computeEvolucion(filter: PeriodFilter): EvolucionData[] {
  const pagosFiltrados = pagosMock.filter((p) => {
    const d = parseDate(p.timestamp);
    return d >= filter.from && d <= filter.to;
  });

  const grouped: Record<string, { monto: number; cantidad: number }> = {};
  for (const p of pagosFiltrados) {
    const day = format(parseDate(p.timestamp), "dd/MM");
    if (!grouped[day]) grouped[day] = { monto: 0, cantidad: 0 };
    grouped[day].monto += p.monto;
    grouped[day].cantidad += 1;
  }

  return Object.entries(grouped)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([fecha, data]) => ({ fecha, ...data }));
}

// ===== Lotes recientes para dashboard =====
export interface LoteResumen {
  id: string;
  nombre: string;
  estado: LoteEstado;
  progreso: number;
  montoTotal: number;
  montoCobrado: number;
  cantidadPagos: number;
  cantidadParciales: number;
  cantidadPendientes: number;
  createdAt: string;
}

export function computeLotesRecientes(filter: PeriodFilter): LoteResumen[] {
  return filterLotes(filter)
    .filter((l) => l.estado !== "eliminado")
    .map((l) => {
      const regs = registrosMock.filter((r) => r.loteId === l.id);
      const total = regs.length;
      const cobrados = regs.filter((r) => r.estado === "pagado_total").length;
      const parciales = regs.filter((r) => r.estado === "pagado_parcial").length;
      const pendientes = regs.filter(
        (r) => r.estado === "pendiente" || r.estado === "vencido",
      ).length;
      const montoTotal = regs.reduce((s, r) => s + r.monto, 0);
      const montoCobrado = regs.reduce((s, r) => s + r.montoPagado, 0);

      return {
        id: l.id,
        nombre: l.nombre,
        estado: l.estado,
        progreso: total > 0 ? Math.round((montoCobrado / montoTotal) * 100) : 0,
        montoTotal,
        montoCobrado,
        cantidadPagos: cobrados,
        cantidadParciales: parciales,
        cantidadPendientes: pendientes,
        createdAt: l.createdAt,
      };
    })
    .sort((a, b) => parseDate(b.createdAt).getTime() - parseDate(a.createdAt).getTime());
}

// ===== Gestión de lotes (listado completo) =====
export interface LoteGestionRow {
  id: string;
  nombre: string;
  periodo: string;
  createdAt: string;
  fechaFinalizacion: string | null;
  estado: LoteEstado;
  progreso: number;
  cantidadPagos: number;
  cantidadParciales: number;
  cantidadPendientes: number;
  montoTotal: number;
  montoCobrado: number;
  montoPorCobrar: number;
}

export function getLotesGestion(): LoteGestionRow[] {
  return lotesMock
    .filter((l) => l.estado !== "eliminado")
    .map((l) => {
      const regs = registrosMock.filter((r) => r.loteId === l.id);
      const total = regs.length;
      const cobrados = regs.filter((r) => r.estado === "pagado_total").length;
      const parciales = regs.filter((r) => r.estado === "pagado_parcial").length;
      const pendientes = regs.filter(
        (r) => r.estado === "pendiente" || r.estado === "vencido",
      ).length;
      const montoTotal = regs.reduce((s, r) => s + r.monto, 0);
      const montoCobrado = regs.reduce((s, r) => s + r.montoPagado, 0);

      return {
        id: l.id,
        nombre: l.nombre,
        periodo: l.periodo,
        createdAt: l.createdAt,
        fechaFinalizacion: l.fechaFinalizacion,
        estado: l.estado,
        progreso: montoTotal > 0 ? Math.round((montoCobrado / montoTotal) * 100) : 0,
        cantidadPagos: cobrados,
        cantidadParciales: parciales,
        cantidadPendientes: pendientes,
        montoTotal,
        montoCobrado,
        montoPorCobrar: montoTotal - montoCobrado,
      };
    })
    .sort((a, b) => parseDate(b.createdAt).getTime() - parseDate(a.createdAt).getTime());
}

export function getLoteById(id: string): Lote | undefined {
  return lotesMock.find((l) => l.id === id);
}

export function getRegistrosByLoteId(loteId: string): RegistroDeLote[] {
  return registrosMock.filter((r) => r.loteId === loteId);
}

export function getPagosByRegistroId(registroId: string): Pago[] {
  return pagosMock.filter((p) => p.registroId === registroId);
}

export function getCBUById(id: string): CBURecord | undefined {
  return cbuPool.find((c) => c.id === id);
}

export function getCBUByEntidad(tipo: string, id: string, sub: string): CBURecord | undefined {
  return cbuPool.find((c) => c.tipoEntidad === tipo && c.idEntidad === id && c.subEntidad === sub);
}

// ===== Catálogo de estados =====
export const estadoCatalogo: Record<LoteEstado, { label: string; desc: string }> = {
  cargado: {
    label: "Cargado / Pendiente",
    desc: "El lote fue creado y validado, pero aún no llegó la fecha de procesamiento automático; no se generaron links de pago todavía.",
  },
  en_proceso: {
    label: "En proceso",
    desc: "El lote ya se ejecutó (se generaron los links) pero no todos los pagos fueron efectuados.",
  },
  finalizado: {
    label: "Finalizado",
    desc: "Todos los pagos del lote fueron efectuados en su totalidad.",
  },
  pausado: {
    label: "Pausado",
    desc: "El lote fue pausado manualmente; detiene el avance del procesamiento.",
  },
  eliminado: {
    label: "Eliminado",
    desc: "El lote fue eliminado (soft delete).",
  },
  error: {
    label: "Con error / requiere atención",
    desc: "Ocurrió un fallo técnico durante el procesamiento que impide completar la generación de links o el cobro.",
  },
};

export const medioPagoLabels: Record<MedioPago, string> = {
  TRANSFERENCIA: "Transferencia",
  TARJETA_CREDITO: "Tarjeta de crédito",
  TARJETA_DEBITO: "Tarjeta de débito",
  QR: "Código QR",
};

// ===== Función para iniciar lote manualmente =====
export function iniciarLote(loteId: string): boolean {
  const lote = lotesMock.find((l) => l.id === loteId);
  if (!lote || lote.estado !== "cargado") return false;
  lote.estado = "en_proceso";
  lote.fechaInicio = fmtFull(now);
  const regs = registrosMock.filter((r) => r.loteId === loteId);
  for (const r of regs) {
    if (r.estado === "pendiente") {
      r.linkDePago = `https://pay.molly.com.ar/l/${generateId("LNK").toLowerCase()}`;
    }
  }
  return true;
}

export function pausarLote(loteId: string): boolean {
  const lote = lotesMock.find((l) => l.id === loteId);
  if (!lote || lote.estado !== "en_proceso") return false;
  lote.estado = "pausado";
  return true;
}

export function reanudarLote(loteId: string): boolean {
  const lote = lotesMock.find((l) => l.id === loteId);
  if (!lote || lote.estado !== "pausado") return false;
  lote.estado = "en_proceso";
  return true;
}

export function eliminarLote(loteId: string): boolean {
  const lote = lotesMock.find((l) => l.id === loteId);
  if (!lote) return false;
  lote.estado = "eliminado";
  return true;
}