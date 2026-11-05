import { queryOptions } from "@tanstack/react-query";
import { STALE } from "@/app/query-client";
import { privateScope } from "@/shared/lib/query-scope";
import { getDeveloperPortal } from "./developers.supabase";

/* La base resuelve el comercio por la sesion: la key va por usuario. */
export const developerKeys = {
  portal: (userId: string) => [...privateScope(userId), "developers", "portal"] as const,
};

export const developerQueries = {
  portal: (userId: string) =>
    queryOptions({
      queryKey: developerKeys.portal(userId),
      queryFn: ({ signal }) => getDeveloperPortal({ signal }),
      staleTime: STALE.short,
    }),
};
