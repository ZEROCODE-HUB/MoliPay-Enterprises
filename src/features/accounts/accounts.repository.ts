import type {
InternalTransferInput,
Subaccount,
SubaccountInput,
SubaccountMovement,
SubaccountStatus,
} from "./accounts.types";

type ReadOptions = { signal?: AbortSignal };

/**
 * Subcuentas del cliente. RLS limita todo al cliente de la sesion; los saldos
 * y las transferencias los valida y registra la base (RPC).
 */
export interface AccountsRepository {
  listSubaccounts(customerLegajo: string, options?: ReadOptions): Promise<Subaccount[]>;
  listMovements(
    subaccount: Pick<Subaccount, "id" | "cvu">,
    options?: ReadOptions,
  ): Promise<SubaccountMovement[]>;
  createSubaccount(customerLegajo: string, input: SubaccountInput, active: boolean): Promise<void>;
  updateSubaccount(id: string, input: SubaccountInput): Promise<void>;
  setSubaccountStatus(id: string, status: SubaccountStatus): Promise<void>;
  deleteSubaccount(id: string): Promise<void>;
  /** Transferencia entre dos subcuentas propias (RPC registrar_transferencia_subcuentas). */
  transferBetweenSubaccounts(input: InternalTransferInput): Promise<void>;
}
