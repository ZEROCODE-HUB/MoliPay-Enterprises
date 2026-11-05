import { useTransferSubaccounts } from "../transfers.hooks";
import { useState,useEffect,useCallback } from "react";
import { toast } from "sonner";
import { toDataError,isPermissionError } from "@/infrastructure/supabase/errors";
import { executeTransfer } from "@/features/transfers/transfer-orchestrator";
import { listFrequentRecipients } from "@/features/transfers/transfer-store";
import { moneyInputToNumber } from "@/shared/lib/money";
import { type Recipient } from "@/features/transfers/recipients.types";
import { aRecipient } from "@/features/transfers/recipients.rules";

/** Estado y acciones de RecipientsPage: el componente solo dibuja. */
export function useRecipientsPage() {
  const [newOpen, setNewOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newAlias, setNewAlias] = useState("");
  const [newCbu, setNewCbu] = useState("");
  const [newCuit, setNewCuit] = useState("");
  const [transfer, setTransfer] = useState<Recipient | null>(null);
  const [remove, setRemove] = useState<Recipient | null>(null);
  const [amount, setAmount] = useState("");
  const [concept, setConcept] = useState("");
  const [subaccountOrigin, setSubaccountOrigin] = useState("");
  const [sending, setSending] = useState(false);
  const [items, setItems] = useState<Recipient[]>([]);
  const [loading, setLoading] = useState(true);

  const loadRecipients = useCallback(async () => {
    setLoading(true);
    try {
      const list = await listFrequentRecipients();
      setItems(list.map(aRecipient));
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const { subaccounts, refetch: loadSubaccounts } = useTransferSubaccounts();
  useEffect(() => {
    if (subaccounts.length > 0) setSubaccountOrigin((current) => current || subaccounts[0].id);
  }, [subaccounts]);

  useEffect(() => {
    void loadRecipients();
  }, [loadRecipients]);

  const handleTransfer = async () => {
    if (!transfer || !subaccountOrigin || !amount) return;
    const amountNum = moneyInputToNumber(amount);
    if (!amountNum || amountNum <= 0) {
      toast.error("Ingresa un monto valido");
      return;
    }
    setSending(true);
    try {
      // Destinatario frecuente → validación desacoplada → ejecución → movimiento
      const res = await executeTransfer({
        subcuentaOrigenId: subaccountOrigin,
        destinatarioIdentifier: transfer.cbu,
        monto: amountNum,
        concepto: concept || null,
      });
      if (!res.ok) {
        toast.error(res.error ?? "Validación fallida");
        return;
      }
      toast.success(`Transferencia enviada — TXID: ${res.txn.id_txn}`);
      setTransfer(null);
      setAmount("");
      setConcept("");
      await loadSubaccounts();
    } catch (e) {
      const err = toDataError(e);
      if (isPermissionError(e)) {
        toast.error("Sin permisos para realizar esta transferencia");
      } else {
        toast.error(err.message || "No se pudo enviar la transferencia");
      }
    } finally {
      setSending(false);
    }
  };
  return {
    newOpen,
    setNewOpen,
    newName,
    setNewName,
    newAlias,
    setNewAlias,
    newCbu,
    setNewCbu,
    newCuit,
    setNewCuit,
    transfer,
    setTransfer,
    remove,
    setRemove,
    amount,
    setAmount,
    concept,
    setConcept,
    subaccountOrigin,
    setSubaccountOrigin,
    sending,
    items,
    setItems,
    loading,
    loadRecipients,
    subaccounts,
    handleTransfer,
  };
}

export type RecipientsPageVm = ReturnType<typeof useRecipientsPage>;
