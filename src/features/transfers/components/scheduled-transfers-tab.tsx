import { markScheduledExecuted } from "@/features/transfers/transfer-store";
import { toDataError } from "@/infrastructure/supabase/errors";
import { toast } from "sonner";
import { executeTransfer } from "@/features/transfers/transfer-orchestrator";
import { ScheduledTransfers } from "./scheduled-transfers";

import type { TransfersPageVm } from "./use-transfers-page";

export function ScheduledTransfersTab({
  tab,
  scheduled,
  setConfirmEliminacion,
  setEditingScheduled,
  setTab,
  setScheduled,
  loadData,
}: Pick<
  TransfersPageVm,
  | "tab"
  | "scheduled"
  | "setConfirmEliminacion"
  | "setEditingScheduled"
  | "setTab"
  | "setScheduled"
  | "loadData"
>) {
  return (
    <>
      {tab === "programadas" && (
        <ScheduledTransfers
          items={scheduled}
          onCancel={(id) => {
            const s = scheduled.find((x) => x.id === id);
            if (!s) {
              toast.error("No se encontro la programada");
              return;
            }
            if (s.estado !== "Programada") {
              toast.error(`Esta transferencia ya esta ${s.estado.toLowerCase()}`);
              return;
            }
            setConfirmEliminacion({ tipo: "programada", id });
          }}
          onEdit={(id) => {
            const s = scheduled.find((x) => x.id === id);
            if (!s) {
              toast.error("No se encontro la programada");
              return;
            }
            if (s.estado !== "Programada") {
              toast.error(`No se puede editar una transferencia ${s.estado.toLowerCase()}`);
              return;
            }
            // Same as drafts and frequent recipients: it loads into the "Programar"
            // form and is saved from there.
            setEditingScheduled(s);
            setTab("programar");
            toast.success("Programada cargada en el formulario");
          }}
          onExecute={async (id) => {
            const s = scheduled.find((x) => x.id === id);
            if (!s) {
              toast.error("No se encontro la programada");
              return;
            }
            // A scheduled transfer that already ran (or was cancelled) never runs again.
            if (s.estado !== "Programada") {
              toast.error(
                `Esta transferencia ya esta ${s.estado.toLowerCase()} y no se puede volver a ejecutar`,
              );
              return;
            }
            if (!s.cbu || !s.montoNum || !s.subcuentaOrigen) {
              toast.error("Programada incompleta");
              return;
            }
            try {
              const res = await executeTransfer({
                subcuentaOrigenId: s.subcuentaOrigen!,
                destinatarioIdentifier: s.cbu!,
                monto: s.montoNum!,
                concepto: s.concepto,
                kind: "programada",
              });
              if (!res.ok) {
                toast.error(res.error ?? "Validación fallida");
                return;
              }
              await markScheduledExecuted(id);
              setScheduled((prev) =>
                prev.map((x) => (x.id === id ? { ...x, estado: "Ejecutada" } : x)),
              );
              toast.success(`Scheduled ejecutada — TXID: ${res.txn.id_txn}`);
              await loadData();
            } catch (e) {
              toast.error(toDataError(e).message);
            }
          }}
        />
      )}
    </>
  );
}
