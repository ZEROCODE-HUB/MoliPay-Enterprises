/* Reglas de presentacion de Seguridad. */

/** Navegador y sistema a partir del user agent (aproximado, solo para mostrar). */
export function describeUserAgent(ua: string | null): string | null {
  if (!ua) return null;
  const browser = /Edg\//.test(ua)
    ? "Edge"
    : /OPR\//.test(ua)
      ? "Opera"
      : /Chrome\//.test(ua)
        ? "Chrome"
        : /Firefox\//.test(ua)
          ? "Firefox"
          : /Safari\//.test(ua)
            ? "Safari"
            : null;
  const os = /Windows/.test(ua)
    ? "Windows"
    : /Android/.test(ua)
      ? "Android"
      : /iPhone|iPad/.test(ua)
        ? "iOS"
        : /Mac OS X/.test(ua)
          ? "macOS"
          : /Linux/.test(ua)
            ? "Linux"
            : null;
  return [browser, os].filter(Boolean).join(" · ") || null;
}

/** Ultima actividad de una sesion en palabras ("Hace 2 horas"). */
export function lastSeenLabel(iso: string, now = Date.now()): string {
  const minutes = Math.floor((now - new Date(iso).getTime()) / 60_000);
  if (minutes < 5) return "Activa ahora";
  if (minutes < 60) return `Hace ${minutes} minutos`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return hours === 1 ? "Hace 1 hora" : `Hace ${hours} horas`;
  const days = Math.floor(hours / 24);
  return days === 1 ? "Hace 1 día" : `Hace ${days} días`;
}

export const TEAM_ROLES = [
  {
    value: "admin",
    label: "Administrador",
    description: "Ve la cuenta y administra el equipo. No mueve dinero.",
  },
  {
    value: "operator",
    label: "Operador",
    description: "Ve la cuenta y carga datos. No mueve dinero.",
  },
  {
    value: "viewer",
    label: "Solo lectura",
    description: "Solo puede consultar la información de la cuenta.",
  },
];

export const teamRoleLabel = (role: string) =>
  role === "owner" ? "Titular" : (TEAM_ROLES.find((r) => r.value === role)?.label ?? role);
