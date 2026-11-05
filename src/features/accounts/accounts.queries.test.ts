import { describe,expect,it,vi } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import { accountsKeys,createAccountsQueries } from "./accounts.queries";
import type { AccountsRepository } from "./accounts.repository";

function fakeRepository(): AccountsRepository {
  return {
    listSubaccounts: vi.fn(async () => []),
    listMovements: vi.fn(async () => []),
    createSubaccount: vi.fn(async () => undefined),
    updateSubaccount: vi.fn(async () => undefined),
    setSubaccountStatus: vi.fn(async () => undefined),
    deleteSubaccount: vi.fn(async () => undefined),
    transferBetweenSubaccounts: vi.fn(async () => undefined),
  };
}

describe("accounts queries", () => {
  it("la key incluye usuario y cliente activo", () => {
    expect(accountsKeys.subaccounts("U", "LEG-1")).toEqual([
      "private",
      "U",
      "LEG-1",
      "accounts",
      "subaccounts",
    ]);
    expect(accountsKeys.subaccounts("U", "LEG-1")).not.toEqual(
      accountsKeys.subaccounts("U", "LEG-2"),
    );
  });

  it("pide las subcuentas del legajo indicado al repositorio", async () => {
    const repository = fakeRepository();
    await new QueryClient().fetchQuery(createAccountsQueries(repository).subaccounts("U", "LEG-1"));
    expect(repository.listSubaccounts).toHaveBeenCalledWith(
      "LEG-1",
      expect.objectContaining({ signal: expect.anything() }),
    );
  });

  it("invalidar el cliente activo no toca la cache de otro cliente", async () => {
    const repository = fakeRepository();
    const client = new QueryClient();
    const queries = createAccountsQueries(repository);
    await client.fetchQuery(queries.subaccounts("U", "LEG-1"));
    await client.fetchQuery(queries.subaccounts("U", "LEG-2"));
    await client.invalidateQueries({ queryKey: accountsKeys.all("U", "LEG-1") });
    expect(client.getQueryState(accountsKeys.subaccounts("U", "LEG-1"))?.isInvalidated).toBe(true);
    expect(client.getQueryState(accountsKeys.subaccounts("U", "LEG-2"))?.isInvalidated).toBe(false);
  });
});
