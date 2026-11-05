import { useCallback } from "react";
import { useQuery,useQueryClient } from "@tanstack/react-query";
import { useCurrentCustomer,useSessionUser } from "@/features/session/session.hooks";
import { historyQueries } from "./history.queries";
import type { HistoryFilters,TransactionDetail } from "./history.types";

function useHistoryIdentity() {
  const { user } = useSessionUser();
  const customer = useCurrentCustomer();
  return { userId: user?.id ?? "", legajo: customer.data?.legajo ?? "", customer };
}

/** Lineas del ledger del cliente activo, paginadas y filtradas en la base. */
export function useTransactionLines(filters: HistoryFilters) {
  const { userId, legajo, customer } = useHistoryIdentity();
  const query = useQuery({
    ...historyQueries.lines(userId, legajo, filters),
    enabled: !!userId && !!legajo,
  });
  return {
    ...query,
    rows: query.data?.rows ?? [],
    total: query.data?.total ?? 0,
    isLoading: customer.isPending || (!!legajo && query.isPending),
  };
}

/** Trae (o toma del cache) la operacion completa de una linea. */
export function useTransactionDetailLoader() {
  const queryClient = useQueryClient();
  const { userId, legajo } = useHistoryIdentity();
  return useCallback(
    (transactionId: string): Promise<TransactionDetail> =>
      queryClient.fetchQuery(historyQueries.detail(userId, legajo, transactionId)),
    [queryClient, userId, legajo],
  );
}
