import { toast } from "sonner";
import { Card } from "@/shared/ui/card";
import { Input,Label,Select } from "@/shared/ui/form-controls";
import { FormDialog } from "@/shared/ui/form-dialog";

import type { ServicesPageVm } from "./use-services-page";

export function RemittanceModal({
  remesaOpen,
  setRemesaOpen,
}: Pick<ServicesPageVm, "remesaOpen" | "setRemesaOpen">) {
  return (
    <FormDialog
      open={remesaOpen}
      onClose={() => setRemesaOpen(false)}
      title="Enviar remesa internacional"
      description="Procesada via MORE · cotizacion aplicada al confirmar."
      submitLabel="Enviar remesa"
      size="lg"
      onSubmit={() => {
        setRemesaOpen(false);
        toast.success("Remesa enviada · en proceso de liquidacion");
      }}
    >
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Monto en ARS</Label>
          <Input placeholder="$ 0,00" />
        </div>
        <div>
          <Label>Pais destino</Label>
          <Select>
            <option>Colombia</option>
            <option>Mexico</option>
            <option>Espana</option>
            <option>Brasil</option>
            <option>Chile</option>
            <option>Uruguay</option>
          </Select>
        </div>
      </div>
      <div>
        <Label>Banco / cuenta del destinatario</Label>
        <Input placeholder="Ej. Bancolombia · Cuenta ahorros 1234-5678" />
      </div>
      <div>
        <Label>Beneficiario</Label>
        <Input placeholder="Nombre completo y documento" />
      </div>
      <div>
        <Label>Tipo de conversion</Label>
        <Select>
          <option>Automatico (mejor cotizacion disponible)</option>
          <option>Bonos (AL30/AL30D)</option>
          <option>Cripto (USDT)</option>
          <option>P2P</option>
        </Select>
      </div>
      <Card className="bg-muted/30">
        <div className="text-xs text-muted-foreground">Estimacion al confirmar</div>
        <div className="flex justify-between mt-1">
          <span className="font-semibold">1 ARS = 4,02 COP</span>
          <span className="font-semibold">≈ COP 4.020.000</span>
        </div>
      </Card>
    </FormDialog>
  );
}
