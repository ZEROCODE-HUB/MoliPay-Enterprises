import { keepPreviousData,queryOptions } from "@tanstack/react-query";
import { STALE } from "@/app/query-client";
import { privateScope } from "@/shared/lib/query-scope";
import { getTransactionDetail,listTransactionLines } from "./history.supabase";
import type { HistoryFilters } from "./history.types";

export const historyKeys = {
  all: (userId: string, legajo: string) => [...privateScope(userId), legajo, "history"] as const,
  lines: (userId: string, legajo: string, filters: HistoryFilters) =>
    [...historyKeys.all(userId, legajo), "lines", filters] as const,
  detail: (userId: string, legajo: string, transactionId: string) =>
    [...historyKeys.all(userId, legajo), "detail", transactionId] as const,
};

export const historyQueries = {
  lines: (userId: string, legajo: string, filters: HistoryFilters) =>
    queryOptions({
      queryKey: historyKeys.lines(userId, legajo, filters),
      queryFn: ({ signal }) => listTransactionLines(legajo, filters, { signal }),
      placeholderData: keepPreviousData,
      staleTime: STALE.short,
    }),
  detail: (userId: string, legajo: string, transactionId: string) =>
    queryOptions({
      queryKey: historyKeys.detail(userId, legajo, transactionId),
      queryFn: ({ signal }) => getTransactionDetail(transactionId, { signal }),
      staleTime: STALE.moderate,
    }),
};
