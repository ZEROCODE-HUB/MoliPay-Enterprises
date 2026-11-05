import { useQuery } from "@tanstack/react-query";
import { useCurrentCustomer,useSessionUser } from "@/features/session/session.hooks";
import { merchantQueries } from "./merchants.queries";

/** Comercios del cliente activo. Espera a tener usuario y cliente. */
export function useMyMerchants() {
  const { user } = useSessionUser();
  const customer = useCurrentCustomer();
  const legajo = customer.data?.legajo ?? "";
  const query = useQuery({
    ...merchantQueries.mine(user?.id ?? "", legajo, user?.email ?? ""),
    enabled: !!user?.id && !!user.email && !!legajo,
  });
  return { ...query, isLoading: customer.isPending || (!!legajo && query.isPending) };
}
