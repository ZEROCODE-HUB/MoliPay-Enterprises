import { queryOptions } from "@tanstack/react-query";
import { STALE } from "@/app/query-client";
import { privateScope } from "@/shared/lib/query-scope";
import { listMyMerchants } from "./merchants.supabase";

export const merchantKeys = {
  all: (userId: string, legajo: string) => [...privateScope(userId), legajo, "merchants"] as const,
};

export const merchantQueries = {
  mine: (userId: string, legajo: string, email: string) =>
    queryOptions({
      queryKey: merchantKeys.all(userId, legajo),
      queryFn: ({ signal }) => listMyMerchants(legajo, email, { signal }),
      staleTime: STALE.moderate,
    }),
};
