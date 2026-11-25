/** Anchos que se repiten fila a fila para que el skeleton no se vea como bloques iguales. */
const WIDTHS = ["w-3/4", "w-1/2", "w-2/3", "w-2/5", "w-3/5"];

export const skeletonCls = "rounded bg-muted animate-pulse";

/** Filas de carga con la forma de la tabla (para usar dentro de un <tbody>). */
export function SkeletonRows({ columns, rows = 8 }: { columns: number; rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, r) => (
        <tr key={r} className="border-b border-border last:border-0">
          {Array.from({ length: columns }).map((_, c) => (
            <td key={c} className="px-4 py-2.5">
              <div
                className={`h-3.5 ${skeletonCls} ${WIDTHS[(r + c) % WIDTHS.length]}`}
                style={{ animationDelay: `${r * 60}ms` }}
              />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

/** Tabla de carga completa (encabezado + filas) para listados que todavia no tienen datos. */
export function TableSkeleton({
  columns = 5,
  rows = 8,
  label = "Cargando…",
}: {
  columns?: number;
  rows?: number;
  label?: string;
}) {
  return (
    <div
      className="overflow-hidden rounded-lg border border-border bg-card"
      role="status"
      aria-busy="true"
    >
      <span className="sr-only">{label}</span>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/40">
            {Array.from({ length: columns }).map((_, c) => (
              <th key={c} className="px-4 py-2.5">
                <div className={`h-3 w-16 ${skeletonCls} opacity-70`} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <SkeletonRows columns={columns} rows={rows} />
        </tbody>
      </table>
    </div>
  );
}

/** Carga de un bloque chico (lista o detalle): unas lineas en lugar de un texto "Cargando…". */
export function LoadingLines({
  label = "Cargando…",
  lines = 3,
}: {
  label?: string;
  lines?: number;
}) {
  return (
    <div className="space-y-2.5 py-1" role="status" aria-busy="true">
      <span className="sr-only">{label}</span>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className={`h-3.5 ${skeletonCls} ${WIDTHS[i % WIDTHS.length]}`}
          style={{ animationDelay: `${i * 60}ms` }}
        />
      ))}
    </div>
  );
}
