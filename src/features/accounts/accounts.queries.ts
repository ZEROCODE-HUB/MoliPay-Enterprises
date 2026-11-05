import { queryOptions } from "@tanstack/react-query";
import { STALE } from "@/app/query-client";
import { privateScope } from "@/shared/lib/query-scope";
import type { AccountsRepository } from "./accounts.repository";
import type { Subaccount } from "./accounts.types";

/** Toda key lleva usuario y cliente activo (legajo): cambian el resultado. */
export const accountsKeys = {
  all: (userId: string, legajo: string) => [...privateScope(userId), legajo, "accounts"] as const,
  subaccounts: (userId: string, legajo: string) =>
    [...accountsKeys.all(userId, legajo), "subaccounts"] as const,
  movements: (userId: string, legajo: string, subaccountId: string) =>
    [...accountsKeys.all(userId, legajo), "movements", subaccountId] as const,
};

export const createAccountsQueries = (repository: AccountsRepository) => ({
  subaccounts: (userId: string, legajo: string) =>
    queryOptions({
      queryKey: accountsKeys.subaccounts(userId, legajo),
      queryFn: ({ signal }) => repository.listSubaccounts(legajo, { signal }),
      // Saldos: frescura corta.
      staleTime: STALE.short,
    }),
  movements: (userId: string, legajo: string, subaccount: Pick<Subaccount, "id" | "cvu">) =>
    queryOptions({
      queryKey: accountsKeys.movements(userId, legajo, subaccount.id),
      queryFn: ({ signal }) => repository.listMovements(subaccount, { signal }),
      staleTime: STALE.short,
    }),
});
