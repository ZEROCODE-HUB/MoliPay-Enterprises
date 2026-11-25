import type { ReactNode } from "react";
import { Search, X } from "lucide-react";

/**
 * Estandar de filtros de un listado: una sola fila sobre la tabla, fuera de ella.
 * Orden: buscador (crece), filtros, "Limpiar" y, a la derecha, acciones (exportar).
 */
export function FilterBar({
  children,
  actions,
  className = "",
}: {
  children: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`mb-3 flex flex-wrap items-end gap-3 rounded-lg border border-border bg-card p-3 ${className}`}
    >
      {children}
      {actions && <div className="ml-auto flex items-end gap-2">{actions}</div>}
    </div>
  );
}

/** Etiqueta + control de un filtro. */
export function FilterField({
  label,
  htmlFor,
  children,
  className = "",
}: {
  label: string;
  htmlFor?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`min-w-0 ${className}`}>
      <label htmlFor={htmlFor} className="mb-1.5 block text-xs font-medium text-foreground/80">
        {label}
      </label>
      {children}
    </div>
  );
}

export const filterControlCls =
  "h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/20 [color-scheme:light] dark:[color-scheme:dark]";

/** Buscador del listado: icono, placeholder que dice que se busca y boton para borrar. */
export function SearchInput({
  value,
  onChange,
  placeholder = "Buscar",
  id,
  label = "Buscar",
  className = "",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  id?: string;
  label?: string;
  className?: string;
}) {
  return (
    <FilterField label={label} htmlFor={id} className={`min-w-[220px] flex-1 ${className}`}>
      <div className="relative">
        <Search
          size={14}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
        />
        <input
          id={id}
          type="search"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`${filterControlCls} w-full pl-8 pr-8 placeholder:text-muted-foreground/60 [&::-webkit-search-cancel-button]:hidden`}
        />
        {value && (
          <button
            type="button"
            onClick={() => onChange("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:text-foreground"
            aria-label="Borrar búsqueda"
          >
            <X size={14} />
          </button>
        )}
      </div>
    </FilterField>
  );
}

export function ClearFiltersButton({ onClick, count }: { onClick: () => void; count?: number }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-10 items-center gap-1 rounded-md px-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
    >
      <X size={14} /> Limpiar{count ? ` (${count})` : ""}
    </button>
  );
}
