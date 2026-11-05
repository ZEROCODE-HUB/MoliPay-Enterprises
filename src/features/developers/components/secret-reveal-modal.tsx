import { BtnPrimary } from "@/shared/ui/button";
import { Modal,ModalBody,ModalFooter,ModalHeader,useModalTitleId } from "@/shared/ui/modal";
import { CopyableField } from "./copyable-field";

export type RevealedSecret = { title: string; rows: [label: string, value: string][] };

/**
 * Muestra un secreto UNA vez (llaves o secreto de webhook). No se cierra con Escape ni
 * tocando afuera: hay que confirmar que se guardo. El valor vive solo en memoria.
 */
export function SecretRevealModal({
  secret,
  onClose,
}: {
  secret: RevealedSecret | null;
  onClose: () => void;
}) {
  const titleId = useModalTitleId();
  if (!secret) return null;
  return (
    <Modal open onClose={onClose} size="lg" dismissible={false} labelledBy={titleId}>
      <ModalHeader title={secret.title} titleId={titleId} />
      <ModalBody className="space-y-3">
        <p className="text-sm text-red-700">
          Guardala ahora en un lugar seguro: es la única vez que se muestra. MoliPay la guarda
          cifrada y no la puede recuperar.
        </p>
        {secret.rows.map(([label, value]) => (
          <CopyableField key={label} label={label} value={value} />
        ))}
      </ModalBody>
      <ModalFooter className="justify-end">
        <BtnPrimary onClick={onClose}>Ya la guardé</BtnPrimary>
      </ModalFooter>
    </Modal>
  );
}
