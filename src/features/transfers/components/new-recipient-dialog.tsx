import { Input,Label,Select } from "@/shared/ui/form-controls";
import { toast } from "sonner";
import { FormDialog } from "@/shared/ui/form-dialog";
import { toDataError } from "@/infrastructure/supabase/errors";
import { createFrequentRecipient } from "@/features/transfers/transfer-store";
import { detectIdentifierKind } from "@/features/transfers/recipient-validation";
import { validateRecipient } from "@/features/transfers/recipient-bdc";

import type { RecipientsPageVm } from "./use-recipients-page";

export function NewRecipientDialog({
  newOpen,
  setNewOpen,
  newCbu,
  newAlias,
  newName,
  newCuit,
  loadRecipients,
  setNewName,
  setNewAlias,
  setNewCbu,
  setNewCuit,
}: Pick<
  RecipientsPageVm,
  | "newOpen"
  | "setNewOpen"
  | "newCbu"
  | "newAlias"
  | "newName"
  | "newCuit"
  | "loadRecipients"
  | "setNewName"
  | "setNewAlias"
  | "setNewCbu"
  | "setNewCuit"
>) {
  return (
    <FormDialog
      open={newOpen}
      onClose={() => setNewOpen(false)}
      title="Nuevo destinatario"
      description="Agregalo a tu agenda para reutilizarlo en transferencias (CBU/CVU/Alias validado vía capa desacoplada)."
      submitLabel="Agregar destinatario"
      onSubmit={async () => {
        const identifier = (newCbu || newAlias).trim();
        if (!identifier) {
          toast.error("Ingresa CBU/CVU (22 dígitos) o Alias");
          return;
        }
        const res = await validateRecipient(identifier, detectIdentifierKind(identifier));
        if (!res.ok) {
          toast.error(res.errorMessage ?? "Destinatario no válido");
          return;
        }
        try {
          await createFrequentRecipient({
            identifier: res.identifier,
            nombre: newName || res.titular?.nombre || "Destinatario",
            alias: res.titular?.alias ?? newAlias,
            cbu: res.titular?.cbu ?? newCbu,
            cuit: newCuit || res.titular?.cuit,
            banco: res.titular?.banco ?? undefined,
          });
          await loadRecipients();
          setNewOpen(false);
          setNewName("");
          setNewAlias("");
          setNewCbu("");
          setNewCuit("");
          toast.success("Destinatario agregado a tu agenda");
        } catch (e) {
          toast.error(toDataError(e).message);
        }
      }}
    >
      <div>
        <Label>Nombre o razon social</Label>
        <Input
          placeholder="Ej. Proveedor SA"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Alias</Label>
          <Input
            placeholder="proveedor.sa"
            value={newAlias}
            onChange={(e) => setNewAlias(e.target.value)}
          />
        </div>
        <div>
          <Label>Categoria</Label>
          <Select>
            <option>Proveedor</option>
            <option>Empleado</option>
            <option>Servicios</option>
            <option>Otro</option>
          </Select>
        </div>
      </div>
      <div>
        <Label>CBU / CVU / Alias</Label>
        <Input
          placeholder="22 dígitos o alias 6-20"
          value={newCbu}
          onChange={(e) => setNewCbu(e.target.value)}
        />
        <div className="text-[11px] text-muted-foreground mt-1">
          Se validará vía servicio desacoplado (mock hoy, COELSA mañana)
        </div>
      </div>
      <div>
        <Label>CUIT/CUIL (opcional)</Label>
        <Input
          placeholder="XX-XXXXXXXX-X"
          value={newCuit}
          onChange={(e) => setNewCuit(e.target.value)}
        />
      </div>
      <label className="flex items-center gap-2 text-xs">
        <input type="checkbox" /> Marcar como favorito
      </label>
    </FormDialog>
  );
}
