import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useCurrentCustomer,useSessionUser } from "@/features/session/session.hooks";
import { sumDecimals } from "@/shared/lib/money";
import { privateScope } from "@/shared/lib/query-scope";
import { getSentThisMonth,listTransferSubaccounts } from "./transfers.supabase";

/** Saldos: sin cache, cambian con cada operacion. */
export function useTransferSubaccounts() {
  const userId = useSessionUser().user?.id ?? "";
  const customer = useCurrentCustomer();
  const legajo = customer.data?.legajo ?? "";
  const query = useQuery({
    queryKey: [...privateScope(userId), legajo, "transfers", "subaccounts"],
    queryFn: () => listTransferSubaccounts(legajo),
    enabled: !!userId && !!legajo,
    staleTime: 0,
  });
  const subaccounts = useMemo(() => query.data ?? [], [query.data]);
  const totalAvailable = useMemo(
    () => sumDecimals(subaccounts.map((s) => s.saldo_disponible)),
    [subaccounts],
  );
  return {
    ...query,
    subaccounts,
    totalAvailable,
    isLoading: customer.isPending || (!!legajo && query.isPending),
  };
}

export function useSentThisMonth() {
  const userId = useSessionUser().user?.id ?? "";
  const legajo = useCurrentCustomer().data?.legajo ?? "";
  return useQuery({
    queryKey: [...privateScope(userId), legajo, "transfers", "sent-month"],
    queryFn: () => getSentThisMonth(legajo),
    enabled: !!userId && !!legajo,
    staleTime: 0,
  });
}
