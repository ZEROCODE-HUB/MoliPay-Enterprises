import {
type Draft,
type FrequentRecipient,
type Template,
} from "@/features/transfers/transfer-store";
import { useEffect,useState } from "react";
import { moneyInputToNumber } from "@/shared/lib/money";
import { toast } from "sonner";
import { validateRecipient } from "@/features/transfers/recipient-bdc";
import { detectIdentifierKind } from "@/features/transfers/recipient-validation";
import { useQuote } from "@/features/transfers/transfer-ui.rules";
import {
type CoelsaResult,
type Subaccount,
type TransferPayload,
} from "@/features/transfers/transfers.types";

/** Estado y acciones de Unica: el componente solo dibuja. */
export function useSingleTransferForm({
  confirm,
  setConfirm,
  onOtpRequired,
  subcuentas: subaccounts,
  onTransferPayload,
  onSaveDraft,
  frecuentes: frequents,
  prefilledDestinatario: prefilledRecipient,
  onClearPrefill,
  template,
  onClearTemplate,
}: {
  confirm: boolean;
  setConfirm: (v: boolean) => void;
  onOtpRequired: (payload: TransferPayload) => void | Promise<void>;
  subcuentas: Subaccount[];
  onTransferPayload: (p: TransferPayload) => void;
  onSaveDraft: (d: Draft) => void | Promise<void>;
  frecuentes: FrequentRecipient[];
  prefilledDestinatario?: CoelsaResult;
  onClearPrefill?: () => void;
  template?: Template | null;
  onClearTemplate?: () => void;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [selectedRecipient, setSelectedRecipient] = useState<CoelsaResult | null>(
    () => prefilledRecipient ?? null,
  );
  const [frequentsOpen, setFrequentsOpen] = useState(false);
  const [monto, setAmount] = useState("");
  const [subaccountOrigin, setSubaccountOrigin] = useState("");
  const [concept, setConcept] = useState("Pago a proveedor");

  useEffect(() => {
    if (subaccounts.length > 0 && !subaccountOrigin) {
      setSubaccountOrigin(subaccounts[0].id);
    }
  }, [subaccounts, subaccountOrigin]);

  useEffect(() => {
    if (prefilledRecipient) {
      onClearPrefill?.();
      setSearchQuery(prefilledRecipient.cbu);
      setSelectedRecipient(prefilledRecipient);
      // El frecuente guarda solo nombre/CUIT/CBU/alias: se revalida contra el banco
      // para traer el resto del detalle (banco, tipo de cuenta, moneda, estado) sin
      // que haya que apretar "Validar".
      void handleSearch(prefilledRecipient.cbu);
    }
  }, [prefilledRecipient, onClearPrefill]);

  // Template picked in the dialog: prefills recipient, amount, concept and subaccount.
  // Declared AFTER the effect that sets the first subaccount, so this one wins.
  //
  useEffect(() => {
    if (!template) return;
    const d = template.destinatario;
    if (d?.cbu) {
      setSearchQuery(d.cbu);
      setSelectedRecipient({
        nombre: d.nombre,
        cuit: d.cuit ?? "",
        cbu: d.cbu,
        alias: d.alias ?? "",
      });
      // Misma idea que con los frecuentes: revalidar para tener el detalle del banco.
      void handleSearch(d.cbu);
    }
    // Generic template (e.g. "Sueldos"): the recipient is NOT touched. If one is already
    // picked it is kept; otherwise the user searches for each person.
    if (template.monto != null) setAmount(String(template.monto));
    if (template.concepto) setConcept(template.concepto);
    if (template.subcuentaOrigen) setSubaccountOrigin(template.subcuentaOrigen);
    onClearTemplate?.();
  }, [template, onClearTemplate]);

  const saveAsDraft = async () => {
    // Mismo criterio que "Continuar": si el destinatario no esta validado se
    // valida aca (antes hacia un return silencioso y parecia que no guardaba).
    const dest = selectedRecipient ?? (await handleSearch());
    if (!dest) return;

    const amount = moneyInputToNumber(monto);
    if (!amount || amount <= 0) {
      toast.error("Ingresa un monto valido para guardar el borrador");
      return;
    }
    if (!subaccountOrigin) {
      toast.error("Selecciona una subcuenta de origen");
      return;
    }

    // The draft is persisted in `transferencias_borrador` (via transfer-store);
    // here the row is only assembled. It creates no movement: when executed it goes
    // through validation -> execution -> movement.
    await onSaveDraft({
      id: `d${Date.now()}`,
      destinatario: dest.nombre,
      alias: dest.alias,
      cbu: dest.cbu,
      cuit: dest.cuit,
      subcuentaOrigen: subaccountOrigin,
      montoNum: amount,
      monto: `$ ${amount.toLocaleString("es-AR")}`,
      concepto: concept,
      ref: "",
      fecha: new Date().toLocaleDateString("es-AR"),
    });
  };

  /** Vuelve el formulario a cero (para salir sin guardar nada). */
  const resetForm = () => {
    setSelectedRecipient(null);
    setSearchQuery("");
    setAmount("");
    setConcept("Pago a proveedor");
    setConfirm(false);
    toast.success("Formulario limpiado");
  };

  /** Validates the recipient typed in the field. Returns the holder or null. */
  const handleSearch = async (identifier?: string): Promise<CoelsaResult | null> => {
    const q = (identifier ?? searchQuery).trim();
    if (!q) {
      toast.error("Ingresa el CBU/CVU o alias del destinatario");
      return null;
    }
    setSearching(true);
    try {
      const res = await validateRecipient(q, detectIdentifierKind(q));
      if (res.ok && res.titular) {
        onClearPrefill?.();
        const holder: CoelsaResult = {
          nombre: res.titular.nombre,
          cuit: res.titular.cuit,
          cbu: res.titular.cbu,
          alias: res.titular.alias,
          banco: res.titular.banco,
          bancoCodigo: res.titular.bancoCodigo,
          tipoCuenta: res.titular.tipoCuenta,
          moneda: res.titular.moneda,
          activa: res.titular.activa,
          tipoPersona: res.titular.tipoPersona,
          tipoDoc: res.titular.tipoDoc,
        };
        setSelectedRecipient(holder);
        if (res.provider === "bdc") {
          toast.success("Titular verificado por Banco de Comercio");
        }
        return holder;
      }
      const msg =
        res.status === "invalid_format"
          ? "Formato inválido: CBU/CVU 22 dígitos o Alias 6-20 caracteres"
          : res.status === "not_found"
            ? "Destinatario no encontrado"
            : res.status === "rejected"
              ? "Validación rechazada"
              : (res.errorMessage ?? "No se pudo validar el destinatario");
      toast.error(msg);
      return null;
    } catch {
      toast.error("Error validando destinatario");
      return null;
    } finally {
      setSearching(false);
    }
  };

  const subaccountSeleccionada = subaccounts.find((s) => s.id === subaccountOrigin);
  const amountNumber = moneyInputToNumber(monto);
  const availableOrigin = Number(subaccountSeleccionada?.saldo_disponible ?? 0);
  // Validacion en tiempo real: monto + comision + IVA contra el disponible del origen.
  const cot = useQuote(
    subaccountOrigin,
    amountNumber,
    selectedRecipient?.cbu ?? null,
    availableOrigin,
  );
  return {
    confirm,
    setConfirm,
    onOtpRequired,
    subaccounts,
    onTransferPayload,
    onSaveDraft,
    frequents,
    onClearPrefill,
    template,
    onClearTemplate,
    searchQuery,
    setSearchQuery,
    searching,
    selectedRecipient,
    setSelectedRecipient,
    frequentsOpen,
    setFrequentsOpen,
    monto,
    setAmount,
    subaccountOrigin,
    setSubaccountOrigin,
    concept,
    setConcept,
    saveAsDraft,
    resetForm,
    handleSearch,
    subaccountSeleccionada,
    amountNumber,
    availableOrigin,
    cot,
  };
}

export type UnicaVm = ReturnType<typeof useSingleTransferForm>;
