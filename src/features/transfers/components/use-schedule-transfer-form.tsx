import {
type FrequentRecipient,
type Scheduled,
type Template,
} from "@/features/transfers/transfer-store";
import { useEffect,useRef,useState } from "react";
import { detectIdentifierKind } from "@/features/transfers/recipient-validation";
import { toast } from "sonner";
import { validateRecipient } from "@/features/transfers/recipient-bdc";
import { type Subaccount } from "@/features/transfers/transfers.types";

/** Estado y acciones de Programar: el componente solo dibuja. */
export function useScheduleTransferForm({
  subcuentas: subaccounts,
  frecuentes: frequents = [],
  onSuccess,
  template,
  onClearTemplate,
  programada,
  onCancelarEdicion,
}: {
  subcuentas: Subaccount[];
  /** Frequent recipients to pick from the list (same as in the single transfer). */
  frecuentes?: FrequentRecipient[];
  onSuccess: (s: Scheduled) => void | Promise<void>;
  template?: Template | null;
  onClearTemplate?: () => void;
  /** When provided, this scheduled transfer is being EDITED instead of created. */
  programada?: Scheduled | null;
  /** Leaves edit mode (goes back to the scheduled list). */
  onCancelarEdicion?: () => void;
}) {
  const editing = Boolean(programada);
  const [confirm, setConfirm] = useState(false);
  const [frequentsOpen, setFrequentsOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [destQuery, setDestQuery] = useState("");
  const [destValid, setDestValid] = useState<
    import("@/features/transfers/recipient-validation").RecipientValidationResult | null
  >(null);
  const [validating, setValidating] = useState(false);
  const [subaccountOrigin, setSubaccountOrigin] = useState(subaccounts[0]?.id ?? "");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState("");
  const [hour, setHour] = useState("14:30");
  const [concept, setConcept] = useState("Pago a proveedor");

  // Sync the default subaccount once they load asynchronously.
  useEffect(() => {
    if (subaccounts.length > 0 && !subaccountOrigin) setSubaccountOrigin(subaccounts[0].id);
  }, [subaccounts, subaccountOrigin]);

  // Template picked: prefills recipient (left to validate), amount,
  // concept and subaccount. After the effect above so this one wins.
  useEffect(() => {
    if (!template) return;
    setDestQuery(template.destinatario?.cbu ?? "");
    setDestValid(null);
    if (template.monto != null) setAmount(String(template.monto));
    if (template.concepto) setConcept(template.concepto);
    if (template.subcuentaOrigen) setSubaccountOrigin(template.subcuentaOrigen);
    onClearTemplate?.();
  }, [template, onClearTemplate]);

  // Editing a scheduled transfer: it loads into this same form (like drafts and
  // frequent recipients). The recipient was already validated, so it is prefilled
  // as valid and the API is not queried again.
  //
  // The ref avoids re-applying the prefill on every render (it would overwrite
  // what the user is typing). It resets when edit mode ends.
  const programadaAplicada = useRef<string | null>(null);
  useEffect(() => {
    if (!programada) {
      programadaAplicada.current = null;
      return;
    }
    if (programadaAplicada.current === programada.id) return;
    programadaAplicada.current = programada.id;

    const p = programada;
    const cbu = p.cbu ?? "";
    setDestQuery(cbu);
    setDestValid(
      cbu
        ? {
            status: "valid",
            ok: true,
            kind: detectIdentifierKind(cbu),
            identifier: cbu,
            provider: "bdc",
            titular: {
              nombre: p.destinatario,
              cuit: p.cuit ?? "",
              cbu,
              alias: p.alias ?? "",
              banco: p.banco,
            },
            validatedAt: new Date().toISOString(),
          }
        : null,
    );
    setAmount(p.montoNum ? String(p.montoNum) : "");
    setDate(p.fechaISO ?? "");
    if (p.hora) setHour(p.hora);
    if (p.concepto) setConcept(p.concepto);
    if (p.subcuentaOrigen) setSubaccountOrigin(p.subcuentaOrigen);
    setConfirm(false);
  }, [programada]);

  const handleValidate = async (
    identifier?: string,
  ): Promise<
    import("@/features/transfers/recipient-validation").RecipientValidationResult | null
  > => {
    const q = (identifier ?? destQuery).trim();
    if (!q) {
      toast.error("Ingresa un CBU/CVU o Alias");
      return null;
    }
    setValidating(true);
    try {
      const res = await validateRecipient(q, detectIdentifierKind(q));
      if (res.ok) {
        setDestValid(res);
        return res;
      } else {
        setDestValid(null);
        toast.error(res.errorMessage ?? "Destinatario no válido");
        return null;
      }
    } catch {
      toast.error("Error validando destinatario");
      return null;
    } finally {
      setValidating(false);
    }
  };
  return {
    subaccounts,
    frequents,
    onSuccess,
    template,
    onClearTemplate,
    programada,
    onCancelarEdicion,
    editing,
    confirm,
    setConfirm,
    frequentsOpen,
    setFrequentsOpen,
    saving,
    setSaving,
    destQuery,
    setDestQuery,
    destValid,
    setDestValid,
    validating,
    subaccountOrigin,
    setSubaccountOrigin,
    amount,
    setAmount,
    date,
    setDate,
    hour,
    setHour,
    concept,
    setConcept,
    handleValidate,
  };
}

export type ProgramarVm = ReturnType<typeof useScheduleTransferForm>;
