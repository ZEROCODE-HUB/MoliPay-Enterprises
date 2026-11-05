import { Input,Label,Select } from "@/shared/ui/form-controls";
import { FormDialog } from "@/shared/ui/form-dialog";
import { formatMoneyAmount } from "@/shared/lib/money";

import type { SubaccountsPageVm } from "./use-subaccounts-page";

export function InternalTransferFields({
  transfOpen,
  setTransfOpen,
  onSubmitTransfer,
  transfFrom,
  setTransfFrom,
  subs,
  transfHacia,
  setTransfHacia,
  transfAmount,
  setTransfAmount,
  transfConcept,
  setTransfConcept,
}: Pick<
  SubaccountsPageVm,
  | "transfOpen"
  | "setTransfOpen"
  | "onSubmitTransfer"
  | "transfFrom"
  | "setTransfFrom"
  | "subs"
  | "transfHacia"
  | "setTransfHacia"
  | "transfAmount"
  | "setTransfAmount"
  | "transfConcept"
  | "setTransfConcept"
>) {
  return (
    <FormDialog
      open={transfOpen}
      onClose={() => setTransfOpen(false)}
      title="Transferir entre subcuentas"
      description="Movimiento interno · acreditacion inmediata, sin comision."
      submitLabel="Transferir"
      onSubmit={onSubmitTransfer}
    >
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Desde</Label>
          <Select value={transfFrom} onChange={(e) => setTransfFrom(e.target.value)}>
            <option value="">Selecciona...</option>
            {subs.map((s) => (
              <option key={s.id ?? s.n} value={s.id}>
                {s.n} — {formatMoneyAmount(s.disp)}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label>Hacia</Label>
          <Select value={transfHacia} onChange={(e) => setTransfHacia(e.target.value)}>
            <option value="">Selecciona...</option>
            {subs.map((s) => (
              <option key={s.id ?? s.n} value={s.id}>
                {s.n} — {formatMoneyAmount(s.disp)}
              </option>
            ))}
          </Select>
        </div>
      </div>
      <div>
        <Label>Monto (ARS)</Label>
        <Input
          value={transfAmount}
          onChange={(e) => setTransfAmount(e.target.value)}
          placeholder="0,00"
        />
      </div>
      <div>
        <Label>Concepto</Label>
        <Input
          value={transfConcept}
          onChange={(e) => setTransfConcept(e.target.value)}
          placeholder="Barrido fin de dia, fondeo, etc."
        />
      </div>
    </FormDialog>
  );
}
