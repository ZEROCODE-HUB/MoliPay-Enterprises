import { createFileRoute } from "@tanstack/react-router";
import { HistoryPage } from "@/features/history/components/history-page";

// `?subcuenta=<nombre>` llega desde Subcuentas ("Ver historial") y preselecciona el filtro.
export const Route = createFileRoute("/app/historial")({
  validateSearch: (search: Record<string, unknown>): { subcuenta?: string } => ({
    subcuenta:
      typeof search.subcuenta === "string" && search.subcuenta ? search.subcuenta : undefined,
  }),
  component: HistoryPage,
});
