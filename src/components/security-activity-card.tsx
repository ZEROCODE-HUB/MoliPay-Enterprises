import { useInfiniteQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  CheckCircle2,
  History,
  Loader2,
  RefreshCw,
  ShieldAlert,
} from "lucide-react";
import { BtnOutline, Card } from "@/components/portal-shell";
import {
  describeUserAgent,
  fetchMySecurityEvents,
  type MySecurityEvent,
  type MySecurityEventCursor,
} from "@/lib/api/security-activity";

const QUERY_KEY = ["my-security-events"] as const;

function formatWhen(iso: string): string {
  const date = new Date(iso);
  const today = new Date();
  const time = date.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
  if (date.toDateString() === today.toDateString()) return `Hoy ${time}`;
  return `${date.toLocaleDateString("es-AR")} ${time}`;
}

function detail(e: MySecurityEvent): string | null {
  if (e.metadata.key_prefix) {
    const env = e.metadata.environment === "Produccion" ? "producción" : "sandbox";
    return `${e.metadata.key_prefix}… (${env})`;
  }
  if (e.metadata.first_set) return "Contraseña definida por primera vez";
  return null;
}

function EventIcon({ outcome }: { outcome: MySecurityEvent["outcome"] }) {
  if (outcome === "success")
    return <CheckCircle2 size={14} className="shrink-0 text-emerald-600" />;
  if (outcome === "denied") return <ShieldAlert size={14} className="shrink-0 text-amber-600" />;
  return <AlertTriangle size={14} className="shrink-0 text-red-600" />;
}

/** Registro de actividad de seguridad de la propia cuenta (datos reales). */
export function SecurityActivityCard() {
  const query = useInfiniteQuery({
    queryKey: QUERY_KEY,
    queryFn: ({ pageParam }) => fetchMySecurityEvents(pageParam),
    initialPageParam: null as MySecurityEventCursor | null,
    getNextPageParam: (last) => last.nextCursor,
  });
  const events = query.data?.pages.flatMap((p) => p.rows) ?? [];

  return (
    <Card>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 font-semibold">
          <History size={16} /> Registro de actividad
        </h3>
        <button
          type="button"
          onClick={() => query.refetch()}
          className="rounded-md p-1.5 text-muted-foreground hover:bg-muted"
          title="Actualizar"
          aria-label="Actualizar"
        >
          <RefreshCw
            size={14}
            className={query.isFetching && !query.isFetchingNextPage ? "animate-spin" : ""}
          />
        </button>
      </div>

      {query.isPending ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-9 animate-pulse rounded bg-muted" />
          ))}
        </div>
      ) : query.isError ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          No se pudo cargar tu actividad. Probá de nuevo en unos minutos.
        </p>
      ) : events.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          Todavía no hay actividad registrada en tu cuenta.
        </p>
      ) : (
        <div className="divide-y">
          {events.map((e) => {
            const extra = detail(e);
            const device = describeUserAgent(e.userAgent);
            return (
              <div key={e.id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="flex min-w-0 items-center gap-2.5">
                  <EventIcon outcome={e.outcome} />
                  <div className="min-w-0">
                    <div className="truncate text-sm">{e.label}</div>
                    {(extra || device) && (
                      <div className="truncate text-xs text-muted-foreground">
                        {[extra, device].filter(Boolean).join(" · ")}
                      </div>
                    )}
                  </div>
                </div>
                <div className="shrink-0 text-right text-xs text-muted-foreground">
                  {e.ip && <span className="font-mono">{e.ip} · </span>}
                  {formatWhen(e.occurredAt)}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {query.hasNextPage && (
        <BtnOutline
          className="mt-4"
          onClick={() => query.fetchNextPage()}
          disabled={query.isFetchingNextPage}
        >
          {query.isFetchingNextPage && <Loader2 size={14} className="animate-spin" />}
          Ver más
        </BtnOutline>
      )}
      <p className="mt-3 text-xs text-muted-foreground">
        Si ves algo que no reconocés, cambiá tu contraseña y cerrá todas las sesiones.
      </p>
    </Card>
  );
}
