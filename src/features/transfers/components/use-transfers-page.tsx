import { useSentThisMonth,useTransferSubaccounts } from "../transfers.hooks";
import { sendTransferOtp,verifyTransferOtp } from "../transfers.supabase";
import { useCurrentCustomer } from "@/features/session/session.hooks";
import { userMessage } from "@/shared/lib/errors";
import { useCallback,useEffect,useRef,useState } from "react";
import { type StepTransfer } from "@/features/transfers/transfer-ui.types";
import {
cancelBdcTransfer,
confirmBdcTransfer,
createTemplate,
deleteTemplate,
listDrafts,
listFrequentRecipients,
listScheduledTransfers,
listTemplates,
parseTaxes,
reserveBdcTransfer,
type Draft,
type FrequentRecipient,
type Scheduled,
type Template,
updateTemplate,
} from "@/features/transfers/transfer-store";
import { onlyDigits } from "@/shared/lib/text";
import { isPermissionError,toDataError } from "@/infrastructure/supabase/errors";
import { toast } from "sonner";
import { formatMoney } from "@/shared/lib/format";
import { canTransferBdc,createBdcClient,type BdcAccount } from "@/features/transfers/bdc";
import { detectIdentifierKind } from "@/features/transfers/recipient-validation";
import { executeTransfer } from "@/features/transfers/transfer-orchestrator";
import {
type CoelsaResult,
type Tab,
type TransferPayload,
type TransferSuccess,
} from "@/features/transfers/transfers.types";

/** Estado y acciones de TransfersPage: el componente solo dibuja. */
export function useTransfersPage() {
  const [tab, setTab] = useState<Tab>("unica");
  const [confirm, setConfirm] = useState(false);
  const [destAlias, setDestAlias] = useState("");
  const [saveDestOpen, setSaveDestOpen] = useState(false);
  const [destValidation, setDestValidation] = useState<
    import("@/features/transfers/recipient-validation").RecipientValidationResult | null
  >(null);
  const [transferSuccess, setTransferSuccess] = useState<TransferSuccess | null>(null);
  /** Paso en curso del envio: muestra el overlay que bloquea la pantalla. */
  const [processing, setProcessing] = useState<{ paso: StepTransfer; monto: number } | null>(null);
  const [prefilledRecipient, setPrefilledRecipient] = useState<CoelsaResult | undefined>(undefined);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  /** Scheduled que se esta editando en la pestana "Programar" (null = nueva). */
  const [editingScheduled, setEditingScheduled] = useState<Scheduled | null>(null);
  /** Real template list (table `plantillas_transferencia`, migration 1016). */
  const [templates, setTemplates] = useState<Template[]>([]);
  const [templatesError, setTemplatesError] = useState<string | null>(null);
  /** Template picked: it prefills the form and is cleared afterwards. */
  const [templatePrefill, setTemplatePrefill] = useState<Template | null>(null);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [scheduled, setScheduled] = useState<Scheduled[]>([]);
  const [frequents, setFrequents] = useState<FrequentRecipient[]>([]);
  const [listsError, setListsError] = useState<string | null>(null);
  const [otpOpen, setOtpOpen] = useState(false);
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [confirmEliminacion, setConfirmEliminacion] = useState<{
    tipo: "borrador" | "programada";
    id: string;
  } | null>(null);

  const customer = useCurrentCustomer();
  const customerCuit = onlyDigits(customer.data?.cuit);
  const customerName = customer.data?.name ?? "";
  const subaccountsQuery = useTransferSubaccounts();
  const { subaccounts, totalAvailable } = subaccountsQuery;
  const sentMonthQuery = useSentThisMonth();
  const sentMonth = sentMonthQuery.data ?? { monto: 0, ops: 0 };
  // Despues de operar se releen saldos y enviado (los calcula la base).
  const loadData = async () => {
    await Promise.all([subaccountsQuery.refetch(), sentMonthQuery.refetch()]);
  };

  /**
     /**
      * Drafts, scheduled transfers and frequent recipients live in Supabase: they are
      * reloaded on mount so they survive a reload / another tab / another device.
   */
  const loadLists = useCallback(async () => {
    setListsError(null);
    try {
      const [b, p, f] = await Promise.all([
        listDrafts(),
        listScheduledTransfers(),
        listFrequentRecipients(),
      ]);
      setDrafts(b);
      setScheduled(p);
      setFrequents(f);
      // Templates (migration 1016) load separately on purpose: if the table
      // does not exist yet it must not break the other lists.
      try {
        setTemplates(await listTemplates());
        setTemplatesError(null);
      } catch (e) {
        setTemplatesError(toDataError(e).message);
      }
    } catch (e) {
      setListsError(toDataError(e).message);
    }
  }, []);

  useEffect(() => {
    void loadLists();
  }, [loadLists]);

  /** Refreshes scheduled transfers only (when opening that tab), in case the worker ran one. */
  const refreshScheduledTransfers = useCallback(async () => {
    try {
      setScheduled(await listScheduledTransfers());
    } catch {
      // el error de listas ya se muestra en la pantalla
    }
  }, []);

  /** Closes the dialog, switches tab and prefills the form. */
  const applyTemplate = (p: Template) => {
    setTemplatesOpen(false);
    setTab(p.tipo);
    setTemplatePrefill(p);
    toast.success(
      p.destinatario
        ? `Template "${p.nombre}" cargada`
        : `Template "${p.nombre}" cargada${p.monto != null ? ` — ${formatMoney(p.monto)}` : ""}. Elegi el CBU/CVU/alias del destinatario.`,
    );
  };

  const handleDeleteTemplate = async (p: Template) => {
    try {
      await deleteTemplate(p.id);
      setTemplates((prev) => prev.filter((x) => x.id !== p.id));
      toast.success(`Template "${p.nombre}" eliminada`);
    } catch (e) {
      toast.error(toDataError(e).message);
    }
  };

  /** Creates a generic template (no recipient) from the templates modal. */
  const createTemplateQuick = async (input: {
    nombre: string;
    monto?: number;
    subcuentaOrigen?: string;
    concepto?: string;
  }): Promise<boolean> => {
    try {
      const row = await createTemplate({
        nombre: input.nombre,
        tipo: "unica",
        monto: input.monto,
        subcuentaOrigen: input.subcuentaOrigen,
        concepto: input.concepto,
      });
      setTemplates((prev) =>
        [...prev.filter((x) => x.id !== row.id), row].sort((a, b) =>
          a.nombre.localeCompare(b.nombre),
        ),
      );
      toast.success(`Template "${row.nombre}" guardada`);
      return true;
    } catch (e) {
      toast.error(toDataError(e).message);
      return false;
    }
  };

  /** Updates a template from the modal (name, amount, origin and concept). */
  const editTemplate = async (
    id: string,
    input: { nombre: string; monto?: number; subcuentaOrigen?: string; concepto?: string },
  ): Promise<boolean> => {
    try {
      const row = await updateTemplate(id, input);
      setTemplates((prev) =>
        [...prev.filter((x) => x.id !== row.id), row].sort((a, b) =>
          a.nombre.localeCompare(b.nombre),
        ),
      );
      toast.success(`Template "${row.nombre}" actualizada`);
      return true;
    } catch (e) {
      toast.error(toDataError(e).message);
      return false;
    }
  };

  const [otpSending, setOtpSending] = useState(false);

  const resetOtp = () => {
    setOtp(["", "", "", "", "", ""]);
    otpRefs.current[0]?.focus();
  };

  const sendOtpEmail = async () => {
    setOtpSending(true);
    try {
      await sendTransferOtp();
      toast.success("Código enviado a tu correo");
      return true;
    } catch (e) {
      toast.error(userMessage(e, "No se pudo enviar el código. Intenta reenviar."));
      return false;
    } finally {
      setOtpSending(false);
    }
  };

  const openOtp = async (payload: TransferPayload) => {
    setTransferPayload(payload);
    resetOtp();
    setOtpOpen(true);
    // Envía el código por Resend al correo autenticado (credenciales RESEND_API_KEY / RESEND_FROM)
    await sendOtpEmail();
  };

  const [transferPayload, setTransferPayload] = useState<TransferPayload | null>(null);

  const [otpVerifying, setOtpVerifying] = useState(false);

  const confirmWithOtp = async () => {
    const code = otp.join("");
    if (code.length !== 6) {
      toast.error("Ingresa el código de 6 dígitos");
      return;
    }
    if (!transferPayload) {
      toast.error("No hay datos de transferencia para confirmar");
      return;
    }
    setOtpVerifying(true);
    try {
      await verifyTransferOtp(code);
    } catch (e) {
      toast.error(userMessage(e, "Código incorrecto o expirado."));
      setOtpVerifying(false);
      return;
    }
    setOtpVerifying(false);
    setOtpOpen(false);
    setConfirm(false);
    const payloadTrasOtp = transferPayload;
    if (payloadTrasOtp) await runTransfer(payloadTrasOtp);
  };

  /**
   * Runs the transfer with the payload already built (bank + record in `movimientos`).
   * It is separate from the OTP check so it can be skipped when `OTP_ENABLED` is false.
   */
  const runTransfer = async (payload: TransferPayload) => {
    try {
      /** Subcuenta de origen (para el comprobante). */
      const originDe = (id: string) => subaccounts.find((x) => x.id === id);

      if (canTransferBdc()) {
        const bdc = createBdcClient();
        const sub = subaccounts.find((s) => s.id === payload.subcuentaOrigen);

        const cbuOrigin = sub?.cbu ?? "";
        const cuitOrigin = onlyDigits(customerCuit);
        if (!cbuOrigin)
          throw new Error("La subcuenta seleccionada no tiene CBU/CVU de origen configurado.");
        if (!cuitOrigin)
          throw new Error(
            "El cliente/empresa no tiene CUIT cargado. No se puede enviar la transferencia al banco.",
          );

        const from: BdcAccount = {
          address: cbuOrigin,
          personId: cuitOrigin,
        };
        const cuitDestination = onlyDigits(payload.destinatarioCuit);
        if (!cuitDestination)
          throw new Error("El destinatario no tiene CUIT validado por el banco.");
        const to: BdcAccount = {
          address: payload.destinatarioCbu,
          personId: cuitDestination,
        };

        const originId = `MOLI${Date.now()}`; // BDC exige <=22 chars y solo [a-zA-Z0-9]

        // 1) Reservar ANTES de enviar: si no alcanza (monto + comisión + IVA) falla
        //    acá y el banco nunca recibe el pedido.
        setProcessing({ paso: "reserva", monto: payload.monto });
        const reserve = await reserveBdcTransfer({
          subcuentaOrigen: payload.subcuentaOrigen,
          originId,
          destinatarioCbu: payload.destinatarioCbu,
          destinatarioNombre: payload.destinatarioNombre,
          destinatarioCuit: payload.destinatarioCuit,
          destinatarioBanco: payload.destinatario?.banco ?? null,
          monto: payload.monto,
          concepto: payload.concepto || null,
        });
        const fee = Number(reserve.comision);
        const tax = Number(reserve.impuesto);
        const taxes = parseTaxes(reserve.taxes);

        // 2) Enviar. Si el pedido falla se pregunta al banco antes de liberar la
        //    reserva: un timeout puede haber ejecutado igual la transferencia.
        let envioMessage: string | undefined;
        setProcessing({ paso: "envio", monto: payload.monto });
        try {
          await bdc.autenticar();
          const envio = await bdc.transferir({
            originId,
            desde: from,
            hasta: to,
            importe: payload.monto,
            descripcion: payload.concepto || "Transferencia MoliPlay",
          });
          envioMessage = envio.message;
        } catch (e) {
          const existe = await bdc.consultarTransferencia(originId).then(
            (r) => Boolean(r?.data),
            () => false,
          );
          if (!existe) {
            await cancelBdcTransfer(originId, toDataError(e).message).catch(() => {});
            throw e;
          }
        }

        let status = "";
        try {
          const consulta = await bdc.consultarTransferencia(originId);
          status = consulta?.data?.estado ?? "";
        } catch {
          // la consulta de estado es informativa: no frená la operación
        }

        // 3) Contabilizar: retenido -> banco + comisión + IVA. Idempotente por TXID.
        //    Si falla, el dinero ya salió y queda reservado (retenido): se avisa
        //    para confirmarlo desde backoffice, nunca se libera.
        setProcessing({ paso: "confirmacion", monto: payload.monto });
        try {
          await confirmBdcTransfer(originId, status || null);
        } catch (e) {
          toast.error(
            `Transferencia enviada al banco, pero no se pudo contabilizar: ${toDataError(e).message}. Los fondos quedan retenidos; avisá a soporte con el TXID ${originId}.`,
          );
        }

        toast.success(
          `Transferencia enviada al banco — TXID: ${originId}${status ? ` · ${status}` : ""}`,
        );
        setTransferSuccess({
          txid: originId,
          estado: status,
          mensaje: envioMessage ?? "Transferencia creada con exito",
          monto: payload.monto,
          concepto: payload.concepto,
          origenNombre: originDe(payload.subcuentaOrigen)?.nombre,
          origenCbu: originDe(payload.subcuentaOrigen)?.cbu ?? undefined,
          destino: payload.destinatarioCbu,
          comision: fee,
          impuesto: tax,
          impuestos: taxes,
          fecha: new Date().toISOString(),
        });
        setDestAlias(
          payload.destinatarioAlias ||
            payload.destinatarioNombre ||
            payload.destinatarioCbu.slice(0, 10) + "...",
        );
        setDestValidation({
          status: "valid",
          ok: true,
          kind: detectIdentifierKind(payload.destinatarioCbu),
          identifier: payload.destinatarioCbu,
          provider: "bdc",
          titular: payload.destinatario ?? {
            nombre: payload.destinatarioNombre,
            cuit: payload.destinatarioCuit,
            cbu: payload.destinatarioCbu,
            alias: payload.destinatarioAlias,
          },
          validatedAt: new Date().toISOString(),
        });
        setSaveDestOpen(true);
        setTransferPayload(null);
        await loadData();
        return;
      }

      // Flujo desacoplado: validación → ejecución → movimiento
      setProcessing({ paso: "envio", monto: payload.monto });
      const result = await executeTransfer({
        subcuentaOrigenId: payload.subcuentaOrigen,
        destinatarioIdentifier: payload.destinatarioCbu,
        monto: payload.monto,
        concepto: payload.concepto || null,
      });
      if (!result.ok) {
        const msg =
          result.validation.status === "not_found"
            ? "Destinatario no encontrado"
            : result.validation.status === "rejected"
              ? "Validación rechazada"
              : result.validation.status === "timeout"
                ? "Timeout validando destinatario"
                : (result.error ?? "Validación fallida");
        toast.error(msg);
        return;
      }
      toast.success(`Transferencia enviada — TXID: ${result.txn.id_txn}`);
      setTransferSuccess({
        txid: result.txn.id_txn,
        mensaje: "Transferencia registrada correctamente",
        monto: payload.monto,
        concepto: payload.concepto,
        origenNombre: originDe(payload.subcuentaOrigen)?.nombre,
        origenCbu: originDe(payload.subcuentaOrigen)?.cbu ?? undefined,
        destino: payload.destinatarioCbu,
        comision: result.txn.comision,
        impuesto: result.txn.impuesto,
        impuestos: result.txn.impuestos,
        fecha: new Date().toISOString(),
      });
      setDestAlias(
        result.validation.titular?.alias ?? payload.destinatarioCbu.slice(0, 10) + "...",
      );
      setDestValidation(result.validation);
      setSaveDestOpen(true);
      setTransferPayload(null);
      await loadData();
    } catch (e) {
      const err = toDataError(e);
      if (isPermissionError(e)) {
        toast.error("Sin permisos para realizar esta transferencia");
      } else {
        toast.error(err.message || "No se pudo enviar la transferencia");
      }
    } finally {
      setProcessing(null);
    }
  };

  const tabs: { key: Tab; label: string }[] = [
    { key: "unica", label: "Transferencia unica" },
    { key: "programar", label: "Programar" },
    { key: "borradores", label: "Borradores" },
    { key: "programadas", label: "Transferencias programadas" },
    { key: "destinatarios", label: "Destinatarios frecuentes" },
  ];
  return {
    tab,
    setTab,
    confirm,
    setConfirm,
    destAlias,
    saveDestOpen,
    setSaveDestOpen,
    destValidation,
    setDestValidation,
    transferSuccess,
    setTransferSuccess,
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
    otpOpen,
    setOtpOpen,
    otp,
    setOtp,
    otpRefs,
    confirmEliminacion,
    setConfirmEliminacion,
    customerCuit,
    customerName,
    subaccounts,
    totalAvailable,
    sentMonth,
    loadData,
    refreshScheduledTransfers,
    applyTemplate,
    handleDeleteTemplate,
    createTemplateQuick,
    editTemplate,
    otpSending,
    resetOtp,
    sendOtpEmail,
    openOtp,
    setTransferPayload,
    otpVerifying,
    confirmWithOtp,
    runTransfer,
    tabs,
  };
}

export type TransfersPageVm = ReturnType<typeof useTransfersPage>;
