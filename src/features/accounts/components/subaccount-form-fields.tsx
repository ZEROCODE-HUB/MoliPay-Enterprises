import { Input,Label,Select } from "@/shared/ui/form-controls";
import { FormDialog } from "@/shared/ui/form-dialog";
import { type Sub } from "./subaccount-view";

import type { SubaccountsPageVm } from "./use-subaccounts-page";

export function SubaccountFormFields({
  newOpen,
  setNewOpen,
  setEditSub,
  editSub,
  onSubmitSub,
  form,
  setForm,
}: Pick<
  SubaccountsPageVm,
  "newOpen" | "setNewOpen" | "setEditSub" | "editSub" | "onSubmitSub" | "form" | "setForm"
>) {
  return (
    <FormDialog
      open={newOpen}
      onClose={() => {
        setNewOpen(false);
        setEditSub(null);
      }}
      title={editSub ? "Editar subcuenta" : "Nueva subcuenta"}
      description={
        editSub
          ? "Modifica los datos, el responsable y el límite diario de la subcuenta."
          : "Genera un CVU adicional asociado a tu cuenta madre."
      }
      submitLabel={editSub ? "Guardar cambios" : "Crear subcuenta"}
      onSubmit={onSubmitSub}
    >
      <div>
        <Label>Nombre de la subcuenta</Label>
        <Input
          value={form.n}
          onChange={(e) => setForm((p) => ({ ...p, n: e.target.value }))}
          placeholder="Ej. Sucursal Sur"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Apellido</Label>
          <Input
            value={form.apellido}
            onChange={(e) => setForm((p) => ({ ...p, apellido: e.target.value }))}
            placeholder="Apellido del titular"
          />
        </div>
        <div>
          <Label>Email</Label>
          <Input
            value={form.email}
            onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
            placeholder="titular@empresa.com"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Tipo</Label>
          <Select
            value={form.tipo}
            onChange={(e) => setForm((p) => ({ ...p, tipo: e.target.value as Sub["tipo"] }))}
          >
            <option>Operativa</option>
            <option>Recaudacion</option>
            <option>Garantias</option>
            <option>Sueldos</option>
          </Select>
        </div>
        <div>
          <Label>Responsable</Label>
          <Input
            value={form.resp}
            onChange={(e) => setForm((p) => ({ ...p, resp: e.target.value }))}
            placeholder="Usuario o area"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Límite diario de egreso (ARS)</Label>
          <Input
            value={form.lim}
            onChange={(e) => setForm((p) => ({ ...p, lim: e.target.value }))}
            placeholder="Vacío = sin límite"
          />
        </div>
      </div>
      <label className="flex items-center gap-2 text-xs">
        <input
          type="checkbox"
          checked={form.activar}
          onChange={(e) => setForm((p) => ({ ...p, activar: e.target.checked }))}
        />{" "}
        Activar inmediatamente al crear
      </label>
    </FormDialog>
  );
}
