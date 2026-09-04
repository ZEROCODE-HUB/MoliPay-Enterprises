// Maquina de estados homologada MolliPay Enterprises <-> MolliPay Admin
// Flujo: Pendiente verificacion -> Registrado -> Preactivado -> Activado
//        + ramas: Suspendido / Deshabilitado / Eliminado
// Compartible entre ambos proyectos (sin dependencias de UI).

export const ESTADOS_CLIENTE = [
  "pendiente_verificacion",
  "registrado",
  "preactivado",
  "activado",
  "suspendido",
  "deshabilitado",
  "eliminado",
] as const;

export type EstadoClienteNuevo = (typeof ESTADOS_CLIENTE)[number];

export const ESTADO_LEGACY_MAP: Record<string, EstadoClienteNuevo> = {
  activo: "activado",
  suspendido: "suspendido",
  rechazado: "deshabilitado",
};

export function normalizarEstado(raw: string): EstadoClienteNuevo {
  const v = raw?.trim().toLowerCase();
  if ((ESTADOS_CLIENTE as readonly string[]).includes(v)) return v as EstadoClienteNuevo;
  if (v in ESTADO_LEGACY_MAP) return ESTADO_LEGACY_MAP[v];
  return "registrado";
}

export const ESTADO_LABEL: Record<EstadoClienteNuevo, string> = {
  pendiente_verificacion: "Pendiente de verificacion de email",
  registrado: "Registrado",
  preactivado: "Preactivado",
  activado: "Activado",
  suspendido: "Suspendido",
  deshabilitado: "Deshabilitado",
  eliminado: "Eliminado",
};

export const ESTADO_TONE: Record<EstadoClienteNuevo, "neutral" | "warn" | "success" | "danger"> = {
  pendiente_verificacion: "warn",
  registrado: "neutral",
  preactivado: "warn",
  activado: "success",
  suspendido: "danger",
  deshabilitado: "neutral",
  eliminado: "danger",
};

export const FILTRO_ESTADOS_OPCIONES: string[] = ESTADOS_CLIENTE.map((e) => ESTADO_LABEL[e]);

export const LABEL_A_ESTADO: Record<string, EstadoClienteNuevo> = Object.fromEntries(
  Object.entries(ESTADO_LABEL).map(([k, v]) => [v, k as EstadoClienteNuevo]),
) as Record<string, EstadoClienteNuevo>;

export type TransicionContext = {
  hasCbu: boolean;
  hasComision: boolean;
  hasMovimientos: boolean;
  emailVerificado?: boolean;
  onboardingCompleto?: boolean;
};

export type Transicion = {
  from: EstadoClienteNuevo;
  to: EstadoClienteNuevo;
  accion: string;
  requiere?: (ctx: TransicionContext) => boolean;
  descripcion: string;
};

const TRANSICIONES: Transicion[] = [
  { from: "pendiente_verificacion", to: "registrado", accion: "verificar_email", descripcion: "Verificacion de email" },
  { from: "registrado", to: "preactivado", accion: "aprobar_documentacion", descripcion: "Aprobacion de documentacion" },
  { from: "preactivado", to: "activado", accion: "activar", requiere: (ctx) => ctx.hasCbu && ctx.hasComision, descripcion: "Activacion requiere CBU + comision" },
  { from: "activado", to: "suspendido", accion: "suspender", descripcion: "Suspension manual" },
  { from: "suspendido", to: "activado", accion: "reactivar", descripcion: "Reactivacion desde suspension" },
  { from: "activado", to: "deshabilitado", accion: "deshabilitar", descripcion: "Deshabilitacion (cancela CBU, conserva historial)" },
  { from: "suspendido", to: "deshabilitado", accion: "deshabilitar", descripcion: "Deshabilitacion desde suspendido" },
  { from: "preactivado", to: "deshabilitado", accion: "deshabilitar", descripcion: "Deshabilitacion desde preactivado" },
  { from: "registrado", to: "deshabilitado", accion: "deshabilitar", descripcion: "Deshabilitacion desde registrado" },
  { from: "pendiente_verificacion", to: "deshabilitado", accion: "deshabilitar", descripcion: "Deshabilitacion desde pendiente" },
];

function esTransicionValida(from: EstadoClienteNuevo, to: EstadoClienteNuevo): Transicion | undefined {
  return TRANSICIONES.find((t) => t.from === from && t.to === to);
}

export function puedeTransicionar(fromRaw: string, toRaw: string, ctx: TransicionContext): { ok: boolean; motivo?: string } {
  const from = normalizarEstado(fromRaw);
  const to = normalizarEstado(toRaw);
  if (from === to) return { ok: false, motivo: "El usuario ya esta en ese estado." };
  if (to === "eliminado") {
    if (ctx.hasMovimientos) return { ok: false, motivo: "No se puede eliminar: el usuario tiene movimientos. Solo puede deshabilitarse (BCRA auditoria)." };
    if (from === "eliminado" || from === "deshabilitado") return { ok: false, motivo: "El usuario ya esta deshabilitado/eliminado." };
    return { ok: true };
  }
  if (from === "deshabilitado" || from === "eliminado") return { ok: false, motivo: "Un usuario deshabilitado/eliminado no puede cambiar de estado." };
  const t = esTransicionValida(from, to);
  if (!t) return { ok: false, motivo: `Transicion no permitida: ${ESTADO_LABEL[from]} -> ${ESTADO_LABEL[to]}.` };
  if (t.requiere && !t.requiere(ctx)) {
    if (to === "activado") {
      const faltantes: string[] = [];
      if (!ctx.hasCbu) faltantes.push("CBU");
      if (!ctx.hasComision) faltantes.push("comision");
      return { ok: false, motivo: `No se puede activar: faltan ${faltantes.join(" y ")}.` };
    }
    return { ok: false, motivo: "No se cumplen los requisitos para esta transicion." };
  }
  return { ok: true };
}

export function siguientePasoOnboarding(estadoRaw: string): string {
  const e = normalizarEstado(estadoRaw);
  switch (e) {
    case "pendiente_verificacion": return "Verificar email para pasar a Registrado";
    case "registrado": return "Completar onboarding y esperar aprobacion de documentacion";
    case "preactivado": return "Generar CBU y cargar comision para activar";
    case "activado": return "Usuario operativo";
    case "suspendido": return "Usuario suspendido temporalmente";
    case "deshabilitado": return "Usuario deshabilitado (CBU cancelado, historial conservado)";
    case "eliminado": return "Usuario eliminado (sin movimientos)";
    default: return "";
  }
}
