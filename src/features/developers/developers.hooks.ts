import { useMemo } from "react";
import { useQuery,useQueryClient } from "@tanstack/react-query";
import { useSessionUser } from "@/features/session/session.hooks";
import { developerKeys,developerQueries } from "./developers.queries";
import * as api from "./developers.supabase";

/** Estado del portal de desarrolladores. `live` lo refresca cada 30 s (logs y entregas). */
export function useDeveloperPortal({ live = false }: { live?: boolean } = {}) {
  const userId = useSessionUser().user?.id ?? "";
  return useQuery({
    ...developerQueries.portal(userId),
    enabled: !!userId,
    refetchInterval: live ? 30_000 : false,
  });
}

/** Escrituras del portal; cada una refresca el estado. Nunca se reintentan solas. */
export function useDeveloperActions() {
  const userId = useSessionUser().user?.id ?? "";
  const queryClient = useQueryClient();
  return useMemo(() => {
    const refresh = () => queryClient.invalidateQueries({ queryKey: developerKeys.portal(userId) });
    const after =
      <A extends unknown[], R>(fn: (...args: A) => Promise<R>) =>
      async (...args: A): Promise<R> => {
        const result = await fn(...args);
        await refresh();
        return result;
      };
    return {
      generateKeys: after(api.generateKeys),
      requestProduction: after(api.requestProduction),
      saveAllowedIps: after(api.saveAllowedIps),
      saveWebhook: after(api.saveWebhook),
      testWebhook: after(api.testWebhook),
    };
  }, [queryClient, userId]);
}
