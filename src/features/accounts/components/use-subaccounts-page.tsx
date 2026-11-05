import { useNavigate } from "@tanstack/react-router";
import { useMemo,useState,useEffect } from "react";
import { toast } from "sonner";
import { isAppError,userMessage } from "@/shared/lib/errors";
import {
addMoney,
compareMoney,
formatMoneyAmount,
isPositiveMoney,
parseMoneyInput,
sumMoney,
toDecimalString,
} from "@/shared/lib/money";
import { useSubaccountActions,useSubaccounts } from "../accounts.hooks";
import {
STATUS_FROM_CODE,
esPool,
toSubView,
toSubaccountInput,
type Sub,
type SubStatusCode,
} from "./subaccount-view";

/** Estado y acciones de SubaccountsPage: el componente solo dibuja. */
export function useSubaccountsPage() {
  const navigate = useNavigate();
  const subaccounts = useSubaccounts();
  const actions = useSubaccountActions();
  const subs = useMemo(() => (subaccounts.data ?? []).map(toSubView), [subaccounts.data]);
  const loading = subaccounts.isLoading;
  const [menuId, setMenuId] = useState<string | null>(null);

  const [newOpen, setNewOpen] = useState(false);
  const [transfOpen, setTransfOpen] = useState(false);
  const [detailSub, setDetailSub] = useState<Sub | null>(null);
  const [editSub, setEditSub] = useState<Sub | null>(null);
  const [q, setQ] = useState("");
  const [kind, setKind] = useState("Todos");
  const [status, setStatus] = useState("Todos");
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [confirmDelete, setConfirmDelete] = useState<Sub | null>(null);

  const [form, setForm] = useState({
    n: "",
    apellido: "",
    email: "",
    tipo: "Operativa",
    resp: "",
    lim: "",
    saldo: "",
    activar: true,
  });

  const [transfFrom, setTransfFrom] = useState("");
  const [transfHacia, setTransfHacia] = useState("");
  const [transfAmount, setTransfAmount] = useState("");
  const [transfConcept, setTransfConcept] = useState("");
  const [transfLoading, setTransfLoading] = useState(false);

  const filtradas = useMemo(
    () =>
      subs.filter(
        (s) =>
          (q === "" || s.n.toLowerCase().includes(q.toLowerCase()) || s.cbu.includes(q.trim())) &&
          (kind === "Todos" || s.tipo === kind) &&
          (status === "Todos" || s.e === status),
      ),
    [subs, q, kind, status],
  );

  const totalPages = Math.max(1, Math.ceil(filtradas.length / pageSize));
  const paginated = filtradas.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => {
    setPage(1);
  }, [q, kind, status]);

  const totalDisp = sumMoney(subs.map((s) => s.disp));
  const totalRet = sumMoney(subs.map((s) => s.ret));
  const total = addMoney(totalDisp, totalRet);

  const openNew = () => {
    setEditSub(null);
    setForm({
      n: "",
      apellido: "",
      email: "",
      tipo: "Operativa",
      resp: "",
      lim: "",
      saldo: "",
      activar: true,
    });
    setNewOpen(true);
  };
  const openEdit = (s: Sub) => {
    setEditSub(s);
    setForm({
      n: s.n,
      apellido: s.apellido,
      email: s.email,
      tipo: s.tipo,
      resp: s.resp,
      lim: s.lim,
      saldo: toDecimalString(s.disp),
      activar: s.e === "Activa",
    });
    setNewOpen(true);
  };

  // Fondeo rapido: abre la transferencia interna con esta subcuenta como
  // destino y la Recaudacion (pool) como origen si existe. Si la subcuenta es
  // la Recaudacion, se invierte: sale desde el pool.
  const openFondeo = (s: Sub) => {
    const pool = subs.find((x) => esPool(x) && x.id !== s.id);
    if (esPool(s)) {
      setTransfFrom(s.id ?? "");
      setTransfHacia("");
    } else {
      setTransfFrom(pool?.id ?? "");
      setTransfHacia(s.id ?? "");
    }
    setTransfAmount("");
    setTransfConcept("");
    setDetailSub(null);
    setTransfOpen(true);
  };

  const verHistory = (s: Sub) => {
    navigate({ to: "/app/historial", search: { subcuenta: s.n } });
  };

  const onSubmitSub = async () => {
    if (!subaccounts.legajo) {
      toast.error("No se pudo identificar la cuenta");
      return;
    }
    try {
      const input = toSubaccountInput(form);
      if (editSub && editSub.id) {
        await actions.update(editSub.id, input);
        toast.success("Subcuenta actualizada");
      } else {
        await actions.create(input, form.activar);
        toast.success("Subcuenta creada correctamente");
      }
      setNewOpen(false);
      setEditSub(null);
    } catch (e) {
      toast.error(isAppError(e) ? e.message : "No se pudo guardar la subcuenta");
    }
  };

  const onDelete = async () => {
    if (!confirmDelete?.id) return;
    try {
      await actions.remove(confirmDelete.id);
      toast.success("Subcuenta eliminada");
    } catch (e) {
      toast.error(isAppError(e) ? e.message : "No se pudo eliminar la subcuenta");
    } finally {
      setConfirmDelete(null);
    }
  };

  // Antes se mostraba "listo" aunque la base rechazara el cambio: ahora el error llega a la pantalla.
  const changeStatus = async (id: string, status: SubStatusCode) => {
    try {
      await actions.setStatus(id, STATUS_FROM_CODE[status]);
      if (detailSub?.id === id) setDetailSub((d) => (d ? { ...d, e: status } : d));
      toast.success(status === "Activa" ? "Subcuenta reactivada" : "Subcuenta pausada");
    } catch (e) {
      toast.error(isAppError(e) ? e.message : "No se pudo actualizar el estado");
    }
  };

  const onSubmitTransfer = async () => {
    if (transfLoading) return;
    const origin = subs.find((x) => x.id === transfFrom);
    const destination = subs.find((x) => x.id === transfHacia);
    const amount = parseMoneyInput(transfAmount);
    if (!origin || !destination) {
      toast.error("Selecciona las subcuentas de origen y destino");
      return;
    }
    if (transfFrom === transfHacia) {
      toast.error("Las subcuentas deben ser distintas");
      return;
    }
    if (!amount || !isPositiveMoney(amount)) {
      toast.error("Ingresa un monto válido");
      return;
    }
    // Control de la pantalla; la base vuelve a validar el saldo.
    if (compareMoney(origin.disp, amount) < 0) {
      toast.error("Saldo insuficiente en la subcuenta de origen");
      return;
    }
    setTransfLoading(true);
    try {
      await actions.transfer({
        fromId: origin.id!,
        toId: destination.id!,
        amount: amount,
        concept: transfConcept || null,
      });
      setTransfOpen(false);
      setTransfAmount("");
      setTransfConcept("");
      toast.success(`Transferencia interna por ${formatMoneyAmount(amount)} realizada`);
    } catch (e) {
      if (isAppError(e) && e.kind === "permission") {
        toast.error("Sin permisos para transferir entre estas subcuentas");
      } else {
        toast.error(userMessage(e, "No se pudo realizar la transferencia"));
      }
    } finally {
      setTransfLoading(false);
    }
  };
  return {
    subaccounts,
    subs,
    loading,
    menuId,
    setMenuId,
    newOpen,
    setNewOpen,
    transfOpen,
    setTransfOpen,
    detailSub,
    setDetailSub,
    editSub,
    setEditSub,
    q,
    setQ,
    kind,
    setKind,
    status,
    setStatus,
    page,
    setPage,
    pageSize,
    confirmDelete,
    setConfirmDelete,
    form,
    setForm,
    transfFrom,
    setTransfFrom,
    transfHacia,
    setTransfHacia,
    transfAmount,
    setTransfAmount,
    transfConcept,
    setTransfConcept,
    filtradas,
    totalPages,
    paginated,
    totalDisp,
    totalRet,
    total,
    openNew,
    openEdit,
    openFondeo,
    verHistory,
    onSubmitSub,
    onDelete,
    changeStatus,
    onSubmitTransfer,
  };
}

export type SubaccountsPageVm = ReturnType<typeof useSubaccountsPage>;
