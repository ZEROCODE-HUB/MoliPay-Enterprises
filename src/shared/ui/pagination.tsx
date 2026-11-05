import { BtnOutline } from "@/shared/ui/button";

const DEFAULT_PAGE_SIZES = [10, 20, 50];
const NAV_BUTTON = "h-8 px-3 text-xs";

/** Paginacion de tablas (1-based). Con `onPageSizeChange` muestra el selector de filas. */
export function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  pageSizes = DEFAULT_PAGE_SIZES,
  className = "border-t px-5 py-3",
}: {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  pageSizes?: number[];
  className?: string;
}) {
  if (total === 0) return null;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const isFirst = page <= 1;
  const isLast = page >= totalPages;
  return (
    <div className={`flex flex-wrap items-center justify-between gap-4 ${className}`}>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {onPageSizeChange && (
          <>
            <span>Filas por página:</span>
            <select
              className="h-8 rounded border bg-card px-2 text-xs"
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
            >
              {pageSizes.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </>
        )}
        <span>{`${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, total)} de ${total}`}</span>
      </div>
      <div className="flex gap-1">
        <BtnOutline className={NAV_BUTTON} disabled={isFirst} onClick={() => onPageChange(1)}>
          Primero
        </BtnOutline>
        <BtnOutline
          className={NAV_BUTTON}
          disabled={isFirst}
          onClick={() => onPageChange(page - 1)}
        >
          Anterior
        </BtnOutline>
        <span className="flex items-center px-3 text-xs text-muted-foreground">
          {page} / {totalPages}
        </span>
        <BtnOutline className={NAV_BUTTON} disabled={isLast} onClick={() => onPageChange(page + 1)}>
          Siguiente
        </BtnOutline>
        <BtnOutline
          className={NAV_BUTTON}
          disabled={isLast}
          onClick={() => onPageChange(totalPages)}
        >
          Último
        </BtnOutline>
      </div>
    </div>
  );
}
