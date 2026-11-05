import { Card } from "@/shared/ui/card";
import { formatShortDateTime } from "../developers.rules";
import type { RequestLog } from "../developers.types";

export function RequestLogsCard({ logs }: { logs: RequestLog[] }) {
  const succeeded = logs.filter((l) => l.status < 400).length;
  return (
    <Card>
      <h3 className="mb-3 text-sm font-semibold">Últimas requests</h3>
      {logs.length === 0 ? (
        <p className="text-xs text-muted-foreground">Todavía no hay peticiones en este ambiente.</p>
      ) : (
        <>
          <div className="divide-y text-xs">
            {logs.map((r, i) => (
              <div
                key={r.requestId ?? i}
                className="flex items-center gap-2 py-2"
                title={r.errorCode ?? r.requestId ?? ""}
              >
                <span
                  className={`w-12 text-center font-bold ${r.method === "GET" ? "text-blue-700" : "text-emerald-700"}`}
                >
                  {r.method}
                </span>
                <span className="flex-1 truncate font-mono">{r.path}</span>
                <span
                  className={`font-mono font-semibold ${r.status < 400 ? "text-emerald-700" : "text-red-700"}`}
                >
                  {r.status}
                </span>
                <span className="w-16 text-right font-mono text-muted-foreground">
                  {r.latencyMs ?? "—"} ms
                </span>
                <span className="w-24 text-right text-muted-foreground">
                  {formatShortDateTime(r.createdAt)}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-2 text-[11px] text-muted-foreground">
            {succeeded} de {logs.length} exitosas
          </div>
        </>
      )}
    </Card>
  );
}
