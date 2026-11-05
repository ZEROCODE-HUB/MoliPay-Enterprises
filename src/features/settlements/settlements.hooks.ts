import { useMemo } from "react";
import { useQuery,useQueryClient } from "@tanstack/react-query";
import { useCurrentCustomer,useSessionUser } from "@/features/session/session.hooks";
import { settlementKeys,settlementQueries } from "./settlements.queries";
import { acceptAdvance,cancelAdvance,requestAdvance } from "./settlements.supabase";
import type { SettlementsOverview } from "./settlements.types";

const EMPTY_OVERVIEW: SettlementsOverview = {
  merchantId: null,
  pendingCollection: 0,
  toCredit: 0,
  advancesInProgress: 0,
  availableForAdvance: 0,
  advanceCap: null,
  days: [],
  creditedDays: [],
  tickets: [],
  saleBatches: [],
  creditBatchDetail: [],
  creditedBatches: [],
  fees: [],
  taxes: [],
  exceptions: [],
};

function useScope() {
  const userId = useSessionUser().user?.id ?? "";
  const customer = useCurrentCustomer();
  const legajo = customer.data?.legajo ?? "";
  return {
    scope: { userId, legajo },
    ready: !!userId && !!legajo,
    customerPending: customer.isPending,
  };
}

export function useSettlementsSummary() {
  const { scope, ready } = useScope();
  return useQuery({ ...settlementQueries.summary(scope), enabled: ready });
}

/** Todo lo de la pantalla principal; mientras carga devuelve valores vacios (nunca datos de otro cliente). */
export function useSettlementsOverview() {
  const { scope, ready, customerPending } = useScope();
  const query = useQuery({ ...settlementQueries.overview(scope), enabled: ready });
  return {
    ...query,
    overview: query.data ?? EMPTY_OVERVIEW,
    isLoading: customerPending || (ready && query.isPending),
  };
}

export function useCreditCalendar(from: string, to: string) {
  const { scope, ready } = useScope();
  return useQuery({ ...settlementQueries.calendar(scope, from, to), enabled: ready });
}

export function useBatchesByRange(from: string | null, to: string | null) {
  const { scope, ready } = useScope();
  return useQuery({
    ...settlementQueries.batches(scope, from ?? "", to ?? ""),
    enabled: ready && !!from && !!to,
  });
}

export function useBatchBreakdown(batchId: string | null | undefined) {
  const { scope, ready } = useScope();
  return useQuery({
    ...settlementQueries.breakdown(scope, batchId ?? ""),
    enabled: ready && !!batchId,
  });
}

export function useSalesByDay(from: string, to: string) {
  const { scope, ready } = useScope();
  return useQuery({ ...settlementQueries.salesByDay(scope, from, to), enabled: ready });
}

export function useSaleDetail(date: string | null | undefined) {
  const { scope, ready } = useScope();
  return useQuery({ ...settlementQueries.saleDetail(scope, date ?? ""), enabled: ready && !!date });
}

export function useSettlementChargebacks() {
  const { scope, ready } = useScope();
  return useQuery({ ...settlementQueries.chargebacks(scope), enabled: ready });
}

/** Adelantos. Mueven dinero: sin reintentos ni cambios optimistas; despues se relee del servidor. */
export function useAdvanceableOperations(enabled: boolean) {
  const { scope } = useScope();
  return useQuery({ ...settlementQueries.advanceableOperations(scope), enabled });
}

export function useAdvanceActions() {
  const { scope } = useScope();
  const queryClient = useQueryClient();
  return useMemo(() => {
    const refresh = () => queryClient.invalidateQueries({ queryKey: settlementKeys.all(scope) });
    return {
      request: async (input: Parameters<typeof requestAdvance>[0]) => {
        const result = await requestAdvance(input);
        await refresh();
        return result;
      },
      accept: async (advanceId: string) => {
        await acceptAdvance(advanceId);
        await refresh();
      },
      cancel: async (advanceId: string) => {
        const result = await cancelAdvance(advanceId);
        await refresh();
        return result;
      },
    };
    // scope por valor: el objeto se recrea en cada render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryClient, scope.userId, scope.legajo]);
}
