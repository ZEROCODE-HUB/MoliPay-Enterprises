import { SubaccountsSummary } from "./subaccounts-summary";
import { SubaccountsList } from "./subaccounts-list";
import { SubaccountFormFields } from "./subaccount-form-fields";
import { InternalTransferFields } from "./internal-transfer-fields";
import { useSubaccountsPage } from "./use-subaccounts-page";
import { Plus,Search,ArrowLeftRight } from "lucide-react";
import { PageHeader } from "@/shared/ui/page-header";
import { Card } from "@/shared/ui/card";
import { BtnPrimary,BtnOutline } from "@/shared/ui/button";
import { Input,Select } from "@/shared/ui/form-controls";
import { ConfirmDialog } from "@/shared/ui/confirm-dialog";
import { SubDetailModal } from "./subaccount-detail-modal";

export function SubaccountsPage() {
  const vm = useSubaccountsPage();
  const {
    setTransfOpen,
    detailSub,
    setDetailSub,
    q,
    setQ,
    kind,
    setKind,
    status,
    setStatus,
    confirmDelete,
    setConfirmDelete,
    openNew,
    openFondeo,
    verHistory,
    onDelete,
    changeStatus,
  } = vm;

  return (
    <>
      <PageHeader
        title="Subcuentas"
        description="Una cuenta madre, múltiples CVU. Gestiona fondos, responsables y límites."
        action={
          <div className="flex gap-2">
            <BtnOutline onClick={() => setTransfOpen(true)}>
              <ArrowLeftRight size={14} /> Transferir entre subcuentas
            </BtnOutline>
            <BtnPrimary onClick={openNew}>
              <Plus size={16} /> Nueva subcuenta
            </BtnPrimary>
          </div>
        }
      />

      <SubaccountsSummary {...vm} />

      <Card className="mb-4 p-3">
        <div className="flex flex-wrap gap-2">
          <div className="relative w-full sm:flex-1 sm:min-w-[220px]">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por nombre o CVU..."
              className="pl-9"
            />
          </div>
          <Select value={kind} onChange={(e) => setKind(e.target.value)}>
            <option>Todos</option>
            <option>Operativa</option>
            <option>Recaudacion</option>
            <option>Garantias</option>
            <option>Sueldos</option>
          </Select>
          <Select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option>Todos</option>
            <option>Activa</option>
            <option>Pausada</option>
          </Select>
        </div>
      </Card>

      <SubaccountsList {...vm} />

      {detailSub && (
        <SubDetailModal
          sub={detailSub}
          onClose={() => setDetailSub(null)}
          onCambiarEstado={changeStatus}
          onFondear={() => openFondeo(detailSub)}
          onVerHistorial={() => verHistory(detailSub)}
        />
      )}

      <SubaccountFormFields {...vm} />

      <InternalTransferFields {...vm} />

      <ConfirmDialog
        confirmLabel="Eliminar"
        variant="danger"
        open={confirmDelete !== null}
        title="¿Eliminar subcuenta?"
        message={`Se quitara la subcuenta ${confirmDelete?.n} (CVU ${confirmDelete?.cbu || "sin asignar"}). Esta accion no se puede deshacer.`}
        onClose={() => setConfirmDelete(null)}
        onConfirm={onDelete}
      />
    </>
  );
}
