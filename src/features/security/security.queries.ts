import { infiniteQueryOptions, queryOptions } from "@tanstack/react-query";
import { STALE } from "@/app/query-client";
import { privateScope } from "@/shared/lib/query-scope";
import { listMySecurityEvents, listMySessions, listTeamMembers } from "./security.supabase";
import type { SecurityEventCursor } from "./security.types";

export const securityKeys = {
  events: (userId: string) => [...privateScope(userId), "security", "events"] as const,
  team: (userId: string) => [...privateScope(userId), "security", "team"] as const,
  sessions: (userId: string) => [...privateScope(userId), "security", "sessions"] as const,
};

export const securityQueries = {
  sessions: (userId: string) =>
    queryOptions({
      queryKey: securityKeys.sessions(userId),
      queryFn: listMySessions,
      staleTime: STALE.short,
    }),
  team: (userId: string) =>
    queryOptions({
      queryKey: securityKeys.team(userId),
      queryFn: listTeamMembers,
      staleTime: STALE.short,
    }),
  events: (userId: string) =>
    infiniteQueryOptions({
      queryKey: securityKeys.events(userId),
      queryFn: ({ pageParam, signal }) => listMySecurityEvents(pageParam, { signal }),
      initialPageParam: null as SecurityEventCursor | null,
      getNextPageParam: (last) => last.nextCursor,
      staleTime: STALE.short,
    }),
};
