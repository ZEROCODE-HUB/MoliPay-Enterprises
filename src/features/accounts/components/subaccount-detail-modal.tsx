import { SubaccountDetailHeader } from "./subaccount-detail-header";
import { SubaccountFundsActions } from "./subaccount-funds-actions";
import { SubaccountMovementsSection } from "./subaccount-movements-section";
import { useSubaccountDetailModal } from "./use-subaccount-detail-modal";
import "jspdf-autotable";
import { type Sub } from "./subaccount-view";
import { Modal,ModalBody,ModalHeader } from "@/shared/ui/modal";

export function SubDetailModal(props: {
  sub: Sub;
  onClose: () => void;
  onCambiarEstado: (id: string, status: "Activa" | "Pausada") => void;
  onFondear: () => void;
  onVerHistorial: () => void;
}) {
  const vm = useSubaccountDetailModal(props);
  const { onClose, titleId } = vm;

  return (
    <Modal open onClose={onClose} size="xl" labelledBy={titleId}>
      <ModalHeader title="Detalles de Subcuenta" titleId={titleId} onClose={onClose} />
      <ModalBody className="space-y-7">
        <SubaccountDetailHeader {...vm} />

        <SubaccountFundsActions {...vm} />

        <SubaccountMovementsSection {...vm} />
      </ModalBody>
    </Modal>
  );
}
