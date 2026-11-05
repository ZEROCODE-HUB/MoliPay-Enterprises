import { useQuery } from "@tanstack/react-query";
import { useCurrentCustomer,useSessionUser } from "@/features/session/session.hooks";
import { dashboardQueries } from "./dashboard.queries";
import type { DateRange } from "./dashboard.types";

/** Movimientos del cliente activo en el rango. Espera a tener usuario y cliente. */
export function useDashboardTransactions(range: DateRange) {
  const { user } = useSessionUser();
  const customer = useCurrentCustomer();
  const legajo = customer.data?.legajo ?? "";
  return useQuery({
    ...dashboardQueries.transactions(user?.id ?? "", legajo, range),
    enabled: !!user?.id && !!legajo,
  });
}
