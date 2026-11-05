import { requireSupabase } from "@/infrastructure/supabase/client";
import { toAppError } from "@/infrastructure/supabase/errors";
import { callRpc } from "@/infrastructure/supabase/rpc";
import { parseEnumMap } from "@/shared/lib/enum";
import { moneyFromDecimal,toDecimalString } from "@/shared/lib/money";
import type { AccountsRepository } from "./accounts.repository";
import type {
Subaccount,
SubaccountInput,
SubaccountMovement,
SubaccountStatus,
SubaccountType,
} from "./accounts.types";

const context = { feature: "accounts" };

// Los saldos viven en subaccount_balances (1:1 con subaccounts) y se piden embebidos.
const SUBACCOUNT_COLUMNS =
  "id, nombre, apellido, email, cbu, tipo, estado, ingresos, egresos, responsable, limite, retiros_habilitados, " +
  "subaccount_balances(saldo_disponible, saldo_retenido, saldo_conciliado)";

const TYPE_FROM_DB = {
  Operativa: "operating",
  Recaudacion: "collection",
  Garantias: "guarantees",
  Sueldos: "payroll",
} as const satisfies Record<string, SubaccountType>;

export const TYPE_TO_DB: Record<SubaccountType, keyof typeof TYPE_FROM_DB> = {
  operating: "Operativa",
  collection: "Recaudacion",
  guarantees: "Garantias",
  payroll: "Sueldos",
};

const STATUS_FROM_DB = { Activa: "active", Pausada: "paused" } as const satisfies Record<
  string,
  SubaccountStatus
>;
export const STATUS_TO_DB: Record<SubaccountStatus, keyof typeof STATUS_FROM_DB> = {
  active: "Activa",
  paused: "Pausada",
};

// Tipos de transaccion que restan saldo a la subcuenta.
const EXPENSE_KINDS = new Set(["transferencia", "retiro", "pago_pct"]);

type BalanceRow = {
  saldo_disponible: number | string | null;
  saldo_retenido: number | string | null;
  saldo_conciliado: number | string | null;
};

type SubaccountRow = {
  id: string;
  nombre: string;
  apellido: string | null;
  email: string | null;
  cbu: string | null;
  tipo: string;
  estado: string;
  ingresos: string | null;
  egresos: string | null;
  responsable: string | null;
  limite: string | null;
  retiros_habilitados: boolean | null;
  subaccount_balances: BalanceRow | BalanceRow[] | null;
};

type MovementRow = {
  tipo: string;
  monto_operacion: number | string | null;
  cvu: string | null;
  id_txn: string | null;
  fecha: string | null;
};

export function toSubaccount(row: SubaccountRow): Subaccount {
  const balances = Array.isArray(row.subaccount_balances)
    ? row.subaccount_balances[0]
    : row.subaccount_balances;
  return {
    id: row.id,
    name: row.nombre,
    lastName: row.apellido ?? "",
    email: row.email ?? "",
    cvu: row.cbu ?? "",
    type: parseEnumMap(row.tipo, TYPE_FROM_DB, "subaccounts.tipo"),
    status: parseEnumMap(row.estado, STATUS_FROM_DB, "subaccounts.estado"),
    available: moneyFromDecimal(balances?.saldo_disponible),
    held: moneyFromDecimal(balances?.saldo_retenido),
    reconciled: moneyFromDecimal(balances?.saldo_conciliado),
    incomeNote: row.ingresos ?? "",
    expenseNote: row.egresos ?? "",
    owner: row.responsable ?? "",
    limit: row.limite ?? "",
    withdrawalsEnabled: !!row.retiros_habilitados,
  };
}

export function toSubaccountMovement(row: MovementRow): SubaccountMovement {
  const amount = moneyFromDecimal(row.monto_operacion);
  return {
    direction: EXPENSE_KINDS.has(row.tipo) ? "expense" : "income",
    kind: row.tipo,
    transactionId: row.id_txn ?? "",
    counterpartyCvu: row.cvu ?? "",
    occurredAt: row.fecha ?? "",
    amount: { cents: Math.abs(amount.cents) },
  };
}

const toRowInput = (input: SubaccountInput) => ({
  nombre: input.name,
  apellido: input.lastName,
  email: input.email,
  tipo: TYPE_TO_DB[input.type],
  responsable: input.owner,
  limite: input.limit || null,
});

export function createSupabaseAccountsRepository(): AccountsRepository {
  const db = () => requireSupabase();

  return {
    async listSubaccounts(customerLegajo, { signal } = {}) {
      let query = db()
        .from("subaccounts")
        .select(SUBACCOUNT_COLUMNS)
        .eq("cliente_legajo", customerLegajo);
      if (signal) query = query.abortSignal(signal);
      const { data, error } = await query;
      if (error) throw toAppError(error, { ...context, operation: "subaccounts" });
      return ((data ?? []) as unknown as SubaccountRow[]).map(toSubaccount);
    },

    async listMovements(subaccount, { signal } = {}) {
      // subcuenta_id identifica la subcuenta propia; cvu, la contraparte. Se usan los dos para
      // no perder movimientos anteriores a subcuenta_id ni las transferencias internas.
      const filter = subaccount.cvu
        ? `subcuenta_id.eq.${subaccount.id},cvu.eq.${subaccount.cvu}`
        : `subcuenta_id.eq.${subaccount.id}`;
      let query = db()
        .from("transactions")
        .select("tipo, monto_operacion, cvu, id_txn, fecha")
        .or(filter)
        .order("fecha", { ascending: false })
        .limit(200);
      if (signal) query = query.abortSignal(signal);
      const { data, error } = await query;
      if (error) throw toAppError(error, { ...context, operation: "transactions" });
      return ((data ?? []) as MovementRow[]).map(toSubaccountMovement);
    },

    async createSubaccount(customerLegajo, input, active) {
      // PENDIENTE (ver PENDIENTES.md): el CVU deberia asignarlo el servidor, no el navegador.
      // CVU de 22 digitos: 8 de entidad + 14 de cuenta.
      const cbu = "00000031" + Math.floor(10000000000000 + Math.random() * 89999999999999);
      // El saldo nace en 0 (trigger en subaccounts); el cliente no puede fijarlo.
      const { error } = await db()
        .from("subaccounts")
        .insert({
          ...toRowInput(input),
          cliente_legajo: customerLegajo,
          cbu,
          estado: STATUS_TO_DB[active ? "active" : "paused"],
          ingresos: "",
          egresos: "",
          retiros_habilitados: true,
        });
      if (error) throw toAppError(error, { ...context, operation: "subaccounts.insert" });
    },

    async updateSubaccount(id, input) {
      const { error } = await db().from("subaccounts").update(toRowInput(input)).eq("id", id);
      if (error) throw toAppError(error, { ...context, operation: "subaccounts.update" });
    },

    async setSubaccountStatus(id, status) {
      const { error } = await db()
        .from("subaccounts")
        .update({ estado: STATUS_TO_DB[status] })
        .eq("id", id);
      if (error) throw toAppError(error, { ...context, operation: "subaccounts.estado" });
    },

    async deleteSubaccount(id) {
      const { error } = await db().from("subaccounts").delete().eq("id", id);
      if (error) throw toAppError(error, { ...context, operation: "subaccounts.delete" });
    },

    async transferBetweenSubaccounts({ fromId, toId, amount, concept }) {
      await callRpc(
        "registrar_transferencia_subcuentas",
        {
          p_subcuenta_origen: fromId,
          p_subcuenta_destino: toId,
          // numeric: se manda el texto decimal exacto, no un float.
          p_monto: toDecimalString(amount),
          p_concepto: concept || null,
        },
        { context },
      );
    },
  };
}
