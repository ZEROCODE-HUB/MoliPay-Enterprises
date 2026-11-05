import { useQuery,useQueryClient } from "@tanstack/react-query";
import { accountsRepository } from "@/app/dependencies";
import { useCurrentCustomer,useSessionUser } from "@/features/session/session.hooks";
import { accountsKeys,createAccountsQueries } from "./accounts.queries";
import type {
InternalTransferInput,
Subaccount,
SubaccountInput,
SubaccountStatus,
} from "./accounts.types";

const accountsQueries = createAccountsQueries(accountsRepository);

/** Usuario y cliente activo; las consultas esperan a tener los dos. */
function useAccountScope() {
  const { user } = useSessionUser();
  const customer = useCurrentCustomer();
  return {
    userId: user?.id ?? "",
    legajo: customer.data?.legajo ?? "",
    customerPending: customer.isPending,
    customerError: customer.error,
  };
}

export function useSubaccounts() {
  const scope = useAccountScope();
  const query = useQuery({
    ...accountsQueries.subaccounts(scope.userId, scope.legajo),
    enabled: !!scope.userId && !!scope.legajo,
  });
  return {
    ...query,
    legajo: scope.legajo || null,
    /** Cargando la sesion/cliente o las subcuentas. Sin ficha de cliente no queda cargando. */
    isLoading: scope.customerPending || (!!scope.legajo && query.isPending),
    error: scope.customerError ?? query.error,
  };
}

export function useSubaccountMovements(subaccount: Pick<Subaccount, "id" | "cvu"> | null) {
  const scope = useAccountScope();
  return useQuery({
    ...accountsQueries.movements(scope.userId, scope.legajo, subaccount ?? { id: "", cvu: "" }),
    enabled: !!scope.userId && !!scope.legajo && !!subaccount?.id,
  });
}

/**
 * Escrituras. Despues de cada una se invalidan solo las subcuentas del cliente
 * activo (y sus movimientos en una transferencia). Sin reintentos automaticos
 * ni actualizaciones optimistas: son operaciones de dinero.
 */
export function useSubaccountActions() {
  const scope = useAccountScope();
  const queryClient = useQueryClient();

  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: accountsKeys.all(scope.userId, scope.legajo) });

  const requireLegajo = () => {
    if (!scope.legajo) throw new Error("No se pudo identificar la cuenta");
    return scope.legajo;
  };

  return {
    refresh,
    async create(input: SubaccountInput, active: boolean) {
      await accountsRepository.createSubaccount(requireLegajo(), input, active);
      await refresh();
    },
    async update(id: string, input: SubaccountInput) {
      await accountsRepository.updateSubaccount(id, input);
      await refresh();
    },
    async setStatus(id: string, status: SubaccountStatus) {
      await accountsRepository.setSubaccountStatus(id, status);
      await refresh();
    },
    async remove(id: string) {
      await accountsRepository.deleteSubaccount(id);
      await refresh();
    },
    async transfer(input: InternalTransferInput) {
      await accountsRepository.transferBetweenSubaccounts(input);
      await refresh();
    },
  };
}
