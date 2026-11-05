import { queryOptions } from "@tanstack/react-query";
import { STALE } from "@/app/query-client";
import { privateScope } from "@/shared/lib/query-scope";
import { getCurrentCustomer } from "./session.supabase";

export const sessionKeys = {
  currentCustomer: (userId: string) =>
    [...privateScope(userId), "session", "current-customer"] as const,
};

export const sessionQueries = {
  currentCustomer: (userId: string, email: string) =>
    queryOptions({
      queryKey: sessionKeys.currentCustomer(userId),
      queryFn: ({ signal }) => getCurrentCustomer(email, { signal }),
      staleTime: STALE.moderate,
    }),
};
