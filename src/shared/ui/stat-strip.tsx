import type { ReactNode } from "react";

/**
 * Fila de cifras clave en una sola tarjeta, separadas por divisores.
 * La primera puede ir destacada (`lead`): es la cifra que manda en la pantalla.
 */
export function StatStrip({
  children,
  leadFirst = false,
  cols = 4,
  className = "",
}: {
  children: ReactNode;
  leadFirst?: boolean;
  cols?: 3 | 4;
  className?: string;
}) {
  return (
    <div
      className={`mb-4 grid grid-cols-1 overflow-hidden rounded-lg border border-border bg-card sm:grid-cols-2 ${
        cols === 3
          ? leadFirst
            ? "lg:grid-cols-[1.4fr_1fr_1fr]"
            : "lg:grid-cols-3"
          : leadFirst
            ? "lg:grid-cols-[1.4fr_1fr_1fr_1fr]"
            : "lg:grid-cols-4"
      } ${className}`}
    >
      {children}
    </div>
  );
}

export function StatItem({
  label,
  value,
  sub,
  lead,
  loading,
  icon,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  lead?: boolean;
  loading?: boolean;
  icon?: ReactNode;
}) {
  return (
    <div className="border-b border-border p-5 last:border-b-0 sm:border-r sm:[&:nth-child(2n)]:border-r-0 lg:border-b-0 lg:[&:nth-child(2n)]:border-r lg:last:border-r-0">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {icon}
        {label}
      </div>
      {loading ? (
        <div className={`mt-2 h-7 w-32 animate-pulse rounded bg-muted`} />
      ) : (
        <div
          className={`mt-1 font-display tabular-nums text-foreground ${
            lead ? "text-2xl font-semibold md:text-[28px]" : "text-xl font-medium"
          }`}
        >
          {value}
        </div>
      )}
      {sub && <div className="mt-1 text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}
