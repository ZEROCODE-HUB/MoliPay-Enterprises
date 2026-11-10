import { keepPreviousData,queryOptions } from "@tanstack/react-query";
import { STALE } from "@/app/query-client";
import { privateScope } from "@/shared/lib/query-scope";
import {
getSettlementsSummary,
listAdvanceableOperations,
listBatchesByRange,
listCalendarDays,
listChargebacks,
listSaleDetail,
listSalesByDay,
loadBreakdown,
loadSaleBreakdown,
loadSettlementsOverview,
} from "./settlements.supabase";

type Scope = { userId: string; legajo: string };

export const settlementKeys = {
  all: ({ userId, legajo }: Scope) => [...privateScope(userId), legajo, "settlements"] as const,
};
const key = (scope: Scope, ...rest: unknown[]) => [...settlementKeys.all(scope), ...rest];

export const settlementQueries = {
  summary: (s: Scope) =>
    queryOptions({
      queryKey: key(s, "summary"),
      queryFn: () => getSettlementsSummary(),
      staleTime: STALE.short,
    }),
  overview: (s: Scope) =>
    queryOptions({
      queryKey: key(s, "overview"),
      queryFn: () => loadSettlementsOverview(s.legajo),
      staleTime: STALE.short,
    }),
  calendar: (s: Scope, from: string, to: string) =>
    queryOptions({
      queryKey: key(s, "calendar", from, to),
      queryFn: () => listCalendarDays(from, to),
      placeholderData: keepPreviousData,
      staleTime: STALE.short,
    }),
  batches: (s: Scope, from: string, to: string) =>
    queryOptions({
      queryKey: key(s, "batches", from, to),
      queryFn: () => listBatchesByRange(from, to),
      staleTime: STALE.short,
    }),
  saleBreakdown: (s: Scope, idTxn: string) =>
    queryOptions({
      queryKey: key(s, "sale-breakdown", idTxn),
      queryFn: () => loadSaleBreakdown(idTxn),
      staleTime: STALE.moderate,
    }),
  breakdown: (s: Scope, batchId: string) =>
    queryOptions({
      queryKey: key(s, "breakdown", batchId),
      queryFn: () => loadBreakdown(batchId),
      staleTime: STALE.moderate,
    }),
  salesByDay: (s: Scope, from: string, to: string) =>
    queryOptions({
      queryKey: key(s, "sales", from, to),
      queryFn: () => listSalesByDay(from, to),
      staleTime: STALE.short,
    }),
  saleDetail: (s: Scope, date: string) =>
    queryOptions({
      queryKey: key(s, "sale-detail", date),
      queryFn: () => listSaleDetail(date),
      staleTime: STALE.moderate,
    }),
  advanceableOperations: (s: Scope) =>
    queryOptions({
      queryKey: key(s, "advanceable-operations"),
      queryFn: () => listAdvanceableOperations(),
      staleTime: STALE.short,
    }),
  chargebacks: (s: Scope) =>
    queryOptions({
      queryKey: key(s, "chargebacks"),
      queryFn: () => listChargebacks(),
      staleTime: STALE.short,
    }),
};
