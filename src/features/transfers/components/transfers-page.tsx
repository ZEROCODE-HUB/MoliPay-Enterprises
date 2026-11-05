import { ScheduledTransfersTab } from "./scheduled-transfers-tab";
import { TransferOtpDialog } from "./transfer-otp-dialog";
import { SaveRecipientPrompt } from "./save-recipient-prompt";
import { useTransfersPage } from "./use-transfers-page";
import { TransferProcessingOverlay } from "@/features/transfers/components/transfer-processing-overlay";
import {
cancelScheduledTransfer,
createDraft,
deleteDraft,
deleteFrequentRecipient,
} from "@/features/transfers/transfer-store";
import { toDataError } from "@/infrastructure/supabase/errors";
import { toast } from "sonner";
import { formatMoney } from "@/shared/lib/format";
import { executeTransfer } from "@/features/transfers/transfer-orchestrator";
import { PageHeader } from "@/shared/ui/page-header";
import { BtnOutline } from "@/shared/ui/button";
import { FileText } from "lucide-react";
import { ConfirmDialog } from "@/shared/ui/confirm-dialog";
import { SingleTransferForm } from "./single-transfer-form";
import { OTP_ENABLED } from "@/features/transfers/transfers.rules";
import { ScheduleTransferForm } from "./schedule-transfer-form";
import { Borradores } from "./borradores";
import { RecipientsList } from "./recipients-list";
import { PlantillasDialog } from "./plantillas-dialog";

export function TransfersPage() {
  const vm = useTransfersPage();
  const {
    tab,
    setTab,
    confirm,
    setConfirm,
    processing,
    prefilledRecipient,
    setPrefilledRecipient,
    templatesOpen,
    setTemplatesOpen,
    editingScheduled,
    setEditingScheduled,
    templates,
    templatesError,
    templatePrefill,
    setTemplatePrefill,
    drafts,
    setDrafts,
    scheduled,
    setScheduled,
    frequents,
    setFrequents,
    listsError,
    confirmEliminacion,
    setConfirmEliminacion,
    subaccounts,
    totalAvailable,
    sentMonth,
    loadData,
    refreshScheduledTransfers,
    applyTemplate,
    handleDeleteTemplate,
    createTemplateQuick,
    editTemplate,
    openOtp,
    setTransferPayload,
    runTransfer,
    tabs,
  } = vm;

  return (
    <>
      <PageHeader
        title="Transferir"
        description="Envios inmediatos, programados y a CBU, CVU o alias."
        action={
          <BtnOutline onClick={() => setTemplatesOpen(true)}>
            <FileText size={14} /> Plantillas
          </BtnOutline>
        }
      />

      {listsError && (
        <div className="mb-4 rounded-md border border-amber-300/70 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          No se pudieron cargar tus listas guardadas: {listsError}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="bg-card border rounded-lg p-3">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Disponible hoy
          </div>
          <div className="font-display tabular-nums text-base md:text-lg font-semibold mt-0.5">
            {formatMoney(totalAvailable)}
          </div>
          <div className="text-[10px] text-muted-foreground mt-0.5 truncate">
            {subaccounts.length} subcuentas
          </div>
        </div>
        <div className="bg-card border rounded-lg p-3">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Enviado este mes
          </div>
          <div className="font-display tabular-nums text-base md:text-lg font-semibold mt-0.5">
            {formatMoney(sentMonth.monto)}
          </div>
          <div className="text-[10px] text-muted-foreground mt-0.5">
            {sentMonth.ops} operaciones
          </div>
        </div>
        <div className="bg-card border rounded-lg p-3">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Programadas
          </div>
          <div className="font-display tabular-nums text-base md:text-lg font-semibold mt-0.5">
            {scheduled.length}
          </div>
        </div>
        <div className="bg-card border rounded-lg p-3">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Subcuentas
          </div>
          <div className="font-display tabular-nums text-base md:text-lg font-semibold mt-0.5">
            {subaccounts.length}
          </div>
          <div className="text-[10px] text-muted-foreground mt-0.5">activas</div>
        </div>
      </div>

      <div className="bg-card border rounded-lg mb-6 overflow-hidden">
        <div className="md:grid md:grid-cols-[220px_1fr]">
          <nav className="flex md:flex-col overflow-x-auto overflow-y-hidden md:overflow-visible border-b md:border-b-0 md:border-r bg-muted/10">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => {
                  // Al salir de "ScheduleTransferForm" se cancela cualquier edicion abierta.
                  if (t.key !== "programar") setEditingScheduled(null);
                  // Refresh when entering the scheduled tab: the worker may have run something.
                  if (t.key === "programadas") void refreshScheduledTransfers();
                  setTab(t.key);
                }}
                className={`shrink-0 px-4 py-3 text-sm font-semibold whitespace-nowrap border-b-2 md:border-b-0 md:border-l-2 md:text-left transition-colors ${
                  tab === t.key
                    ? "border-primary text-primary bg-[color:var(--brand-soft)]/50 md:bg-[color:var(--brand-soft)]/40"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
              >
                {t.label}
              </button>
            ))}
          </nav>
          <div className="p-5">
            {tab === "unica" && (
              <SingleTransferForm
                confirm={confirm}
                setConfirm={setConfirm}
                onOtpRequired={async (payload) => {
                  // 2FA disabled (OTP_ENABLED = false): the transfer runs straight away.
                  // To restore the OTP step set OTP_ENABLED to true at the top of this file.
                  //
                  if (OTP_ENABLED) {
                    await openOtp(payload);
                    return;
                  }
                  setConfirm(false);
                  await runTransfer(payload);
                }}
                subcuentas={subaccounts}
                onTransferPayload={setTransferPayload}
                frecuentes={frequents}
                onSaveDraft={async (d) => {
                  try {
                    const row = await createDraft({
                      destinatario: {
                        nombre: d.destinatario,
                        alias: d.alias,
                        cbu: d.cbu ?? "",
                        cuit: d.cuit,
                        banco: d.banco,
                      },
                      subcuentaOrigen: d.subcuentaOrigen,
                      monto: d.montoNum ?? 0,
                      concepto: d.concepto,
                    });
                    setDrafts((prev) => [row, ...prev.filter((x) => x.id !== row.id)]);
                    toast.success("Borrador guardado");
                  } catch (e) {
                    toast.error(toDataError(e).message);
                  }
                }}
                prefilledDestinatario={prefilledRecipient}
                onClearPrefill={() => setPrefilledRecipient(undefined)}
                template={templatePrefill}
                onClearTemplate={() => setTemplatePrefill(null)}
              />
            )}
            {tab === "programar" && (
              <ScheduleTransferForm
                subcuentas={subaccounts}
                frecuentes={frequents}
                programada={editingScheduled}
                onCancelarEdicion={() => {
                  setEditingScheduled(null);
                  setTab("programadas");
                }}
                template={templatePrefill}
                onClearTemplate={() => setTemplatePrefill(null)}
                onSuccess={(s) => {
                  const editing = editingScheduled?.id === s.id;
                  setScheduled((prev) =>
                    (prev.some((x) => x.id === s.id)
                      ? prev.map((x) => (x.id === s.id ? s : x))
                      : [s, ...prev]
                    ).sort((a, b) =>
                      `${a.fechaISO ?? ""}${a.hora}`.localeCompare(`${b.fechaISO ?? ""}${b.hora}`),
                    ),
                  );
                  setEditingScheduled(null);
                  toast.success(
                    editing ? "Transferencia programada actualizada" : "Transferencia programada",
                  );
                  setTab("programadas");
                }}
              />
            )}
            {tab === "borradores" && (
              <Borradores
                drafts={drafts}
                onDelete={(id) => setConfirmEliminacion({ tipo: "borrador", id })}
                onEdit={(id) => {
                  const d = drafts.find((x) => x.id === id);
                  if (d?.cbu)
                    setPrefilledRecipient({
                      nombre: d.destinatario,
                      cuit: d.cuit ?? "",
                      cbu: d.cbu,
                      alias: d.alias,
                    });
                  setTab("unica");
                  toast.success("Borrador cargado en el formulario");
                }}
                onExecute={async (id) => {
                  const d = drafts.find((x) => x.id === id);
                  if (!d?.cbu || !d.montoNum || !d.subcuentaOrigen) {
                    toast.error("Borrador incompleto");
                    return;
                  }
                  try {
                    const res = await executeTransfer({
                      subcuentaOrigenId: d.subcuentaOrigen!,
                      destinatarioIdentifier: d.cbu!,
                      monto: d.montoNum!,
                      concepto: d.concepto,
                    });
                    if (!res.ok) {
                      toast.error(res.error ?? "Validación fallida");
                      return;
                    }
                    // Executed: the draft no longer exists (the movement stays in `movimientos`).
                    await deleteDraft(id);
                    setDrafts((prev) => prev.filter((x) => x.id !== id));
                    toast.success(`Draft ejecutado — TXID: ${res.txn.id_txn}`);
                    await loadData();
                  } catch (e) {
                    toast.error(toDataError(e).message);
                  }
                }}
              />
            )}
            <ScheduledTransfersTab {...vm} />
            {tab === "destinatarios" && (
              <RecipientsList
                items={frequents}
                onSelect={(d) => {
                  setPrefilledRecipient(d);
                  setTab("unica");
                  toast.success("Destinatario cargado");
                }}
                onDelete={async (id) => {
                  try {
                    await deleteFrequentRecipient(id);
                    setFrequents((prev) => prev.filter((x) => x.id !== id));
                    toast.success("Destinatario eliminado");
                  } catch (e) {
                    toast.error(toDataError(e).message);
                  }
                }}
              />
            )}
          </div>
        </div>
      </div>

      <PlantillasDialog
        open={templatesOpen}
        onClose={() => setTemplatesOpen(false)}
        templates={templates}
        error={templatesError}
        subcuentas={subaccounts}
        onAplicar={applyTemplate}
        onBorrar={handleDeleteTemplate}
        onCrear={createTemplateQuick}
        onEditar={editTemplate}
      />

      <TransferOtpDialog {...vm} />

      {processing && <TransferProcessingOverlay paso={processing.paso} monto={processing.monto} />}

      <SaveRecipientPrompt {...vm} />

      <ConfirmDialog
        variant="danger"
        open={confirmEliminacion !== null}
        title={
          confirmEliminacion?.tipo === "borrador"
            ? "¿Eliminar borrador?"
            : "¿Cancelar transferencia programada?"
        }
        message="Esta accion no se puede deshacer."
        confirmLabel={confirmEliminacion?.tipo === "borrador" ? "Eliminar" : "Cancelar"}
        onClose={() => setConfirmEliminacion(null)}
        onConfirm={async () => {
          const pending = confirmEliminacion;
          setConfirmEliminacion(null);
          if (!pending) return;
          try {
            if (pending.tipo === "borrador") {
              await deleteDraft(pending.id);
              setDrafts((prev) => prev.filter((d) => d.id !== pending.id));
              toast.success("Borrador eliminado");
            } else {
              // No se borra: queda `cancelada` en la tabla para auditoria.
              await cancelScheduledTransfer(pending.id);
              setScheduled((prev) =>
                prev.map((s) => (s.id === pending.id ? { ...s, estado: "Cancelada" } : s)),
              );
              toast.success("Transferencia cancelada");
            }
          } catch (e) {
            toast.error(toDataError(e).message);
          }
        }}
      />
    </>
  );
}
