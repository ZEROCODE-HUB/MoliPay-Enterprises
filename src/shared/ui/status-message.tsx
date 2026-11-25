import { AlertTriangle, Inbox, Lock, RotateCw } from "lucide-react";

/**
 * Estado de una lista o pantalla cuando no hay datos para mostrar: sin permiso,
 * error al cargar (con reintento) o vacia. Los textos los decide quien la usa.
 * Misma tarjeta neutra para los tres; el color solo esta en el icono.
 */
export function StatusMessage({
  kind,
  message,
  errorTitle = "No se pudieron cargar los datos",
  onRetry,
}: {
  kind: "permission" | "error" | "empty";
  message: string;
  errorTitle?: string;
  onRetry?: () => void;
}) {
  const conf = {
    permission: {
      icon: <Lock size={18} />,
      ring: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400",
      title: "No tenés permiso para ver esto",
    },
    error: {
      icon: <AlertTriangle size={18} />,
      ring: "bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400",
      title: errorTitle,
    },
    empty: {
      icon: <Inbox size={18} />,
      ring: "bg-muted text-muted-foreground",
      title: null,
    },
  }[kind];

  return (
    <div
      role={kind === "error" ? "alert" : "status"}
      className="flex flex-col items-center justify-center gap-3 rounded-lg border border-border bg-card px-6 py-12 text-center"
    >
      <span className={`grid h-10 w-10 place-items-center rounded-full ${conf.ring}`}>
        {conf.icon}
      </span>
      <div className="max-w-md">
        {conf.title && <p className="text-sm font-medium text-foreground">{conf.title}</p>}
        <p className={`text-sm text-muted-foreground ${conf.title ? "mt-1" : ""}`}>{message}</p>
      </div>
      {kind === "error" && onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-1 inline-flex h-9 items-center gap-2 rounded-md border border-border bg-card px-3 text-sm font-medium text-foreground transition-colors hover:bg-muted"
        >
          <RotateCw size={14} /> Reintentar
        </button>
      )}
    </div>
  );
}
