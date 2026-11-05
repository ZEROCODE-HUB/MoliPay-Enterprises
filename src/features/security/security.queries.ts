import { infiniteQueryOptions } from "@tanstack/react-query";
import { STALE } from "@/app/query-client";
import { privateScope } from "@/shared/lib/query-scope";
import { listMySecurityEvents } from "./security.supabase";
import type { SecurityEventCursor } from "./security.types";

export const securityKeys = {
  events: (userId: string) => [...privateScope(userId), "security", "events"] as const,
};

export const securityQueries = {
  events: (userId: string) =>
    infiniteQueryOptions({
      queryKey: securityKeys.events(userId),
      queryFn: ({ pageParam, signal }) => listMySecurityEvents(pageParam, { signal }),
      initialPageParam: null as SecurityEventCursor | null,
      getNextPageParam: (last) => last.nextCursor,
      staleTime: STALE.short,
    }),
};
