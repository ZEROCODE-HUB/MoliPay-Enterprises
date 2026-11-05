import { queryOptions } from "@tanstack/react-query";
import { STALE } from "@/app/query-client";
import { privateScope } from "@/shared/lib/query-scope";
import { listTransactionsInRange } from "./dashboard.supabase";
import type { DateRange } from "./dashboard.types";

export const dashboardKeys = {
  transactions: (userId: string, legajo: string, range: DateRange) =>
    [
      ...privateScope(userId),
      legajo,
      "dashboard",
      "transactions",
      range.start.toISOString(),
      range.end.toISOString(),
    ] as const,
};

export const dashboardQueries = {
  transactions: (userId: string, legajo: string, range: DateRange) =>
    queryOptions({
      queryKey: dashboardKeys.transactions(userId, legajo, range),
      queryFn: ({ signal }) => listTransactionsInRange(legajo, range, { signal }),
      staleTime: STALE.short,
    }),
};
