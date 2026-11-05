import { useInfiniteQuery } from "@tanstack/react-query";
import { useSessionUser } from "@/features/session/session.hooks";
import { securityQueries } from "./security.queries";

/** Actividad de seguridad del usuario logueado, paginada por cursor. */
export function useMySecurityEvents() {
  const userId = useSessionUser().user?.id ?? "";
  return useInfiniteQuery({ ...securityQueries.events(userId), enabled: !!userId });
}
