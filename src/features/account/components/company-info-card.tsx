import { Building2 } from "lucide-react";
import { Card } from "@/shared/ui/card";
import { Input, Label, Select } from "@/shared/ui/form-controls";
import { BtnOutline, BtnPrimary } from "@/shared/ui/button";

import type { AccountPageVm } from "./use-account-page";

export function CompanyInfoCard({
  isPJ,
  form,
  companyInfo,
  setF,
  saving,
  customer,
  setForm,
  customerToForm,
  save,
}: Pick<
  AccountPageVm,
  | "isPJ"
  | "form"
  | "companyInfo"
  | "setF"
  | "saving"
  | "customer"
  | "setForm"
  | "customerToForm"
  | "save"
>) {
  return (
    <>
      {isPJ && (
        <Card>
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Building2 size={16} /> Informacion de la Empresa
          </h3>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label>Nombre Legal</Label>
              <Input
                value={form.nombreLegal ?? companyInfo.nombreLegal}
                onChange={(e) => setF("nombreLegal", e.target.value)}
              />
            </div>
            <div>
              <Label>Nombre Comercial</Label>
              <Input
                value={form.nombreFantasia ?? companyInfo.nombreFantasia}
                onChange={(e) => setF("nombreFantasia", e.target.value)}
              />
            </div>
            <div>
              <Label>CUIT</Label>
              <Input
                value={form.cuit ?? companyInfo.cuit}
                readOnly
                title="El CUIT lo cambia solo el equipo de MoliPay"
              />
            </div>
            <div>
              <Label>Tipo de sociedad</Label>
              <Select
                value={form.tipo_sociedad ?? companyInfo.tipoId}
                onChange={(e) => setF("tipo_sociedad", e.target.value)}
              >
                <option>{form.tipo_sociedad ?? companyInfo.tipoId}</option>
              </Select>
            </div>
            <div>
              <Label>Actividad principal</Label>
              <Input
                value={form.actividad ?? "Servicios financieros"}
                onChange={(e) => setF("actividad", e.target.value)}
              />
            </div>
            <div>
              <Label>Fecha de inscripcion</Label>
              <Input
                type="date"
                value={form.fecha_inscripcion ?? companyInfo.fechaInscripcion}
                onChange={(e) => setF("fecha_inscripcion", e.target.value)}
              />
            </div>
            <div>
              <Label>Telefono</Label>
              <Input
                value={form.telefono ?? ""}
                onChange={(e) => setF("telefono", e.target.value)}
              />
            </div>
            <div className="sm:col-span-2 flex gap-2 justify-end">
              <BtnOutline
                disabled={saving}
                onClick={() => customer && setForm(customerToForm(customer))}
              >
                Cancelar
              </BtnOutline>
              <BtnPrimary disabled={saving} onClick={save}>
                {saving ? "Guardando…" : "Guardar cambios"}
              </BtnPrimary>
            </div>
          </div>
        </Card>
      )}
    </>
  );
}
