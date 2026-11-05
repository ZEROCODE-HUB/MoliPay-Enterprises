import { NEXT_ONBOARDING_STEP } from "@/features/onboarding/onboarding.rules";
import { FileText,User } from "lucide-react";
import { Card } from "@/shared/ui/card";
import { Input,Label,Select } from "@/shared/ui/form-controls";
import { Badge } from "@/shared/ui/badge";
import { BtnOutline,BtnPrimary } from "@/shared/ui/button";

import type { AccountPageVm } from "./use-account-page";

export function UserInfoCard({
  form,
  userName,
  setF,
  userApellido,
  userEmail,
  statusNorm,
  statusLabel,
  dp,
  isPJ,
  userNac,
  saving,
  customer,
  setForm,
  customerToForm,
  save,
}: Pick<
  AccountPageVm,
  | "form"
  | "userName"
  | "setF"
  | "userApellido"
  | "userEmail"
  | "statusNorm"
  | "statusLabel"
  | "dp"
  | "isPJ"
  | "userNac"
  | "saving"
  | "customer"
  | "setForm"
  | "customerToForm"
  | "save"
>) {
  return (
    <Card>
      <h3 className="font-semibold mb-4 flex items-center gap-2">
        <User size={16} /> Informacion del Usuario
      </h3>
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <Label>Nombre</Label>
          <Input value={form.nombre ?? userName} onChange={(e) => setF("nombre", e.target.value)} />
        </div>
        <div>
          <Label>Apellido</Label>
          <Input
            value={form.apellido ?? userApellido}
            onChange={(e) => setF("apellido", e.target.value)}
          />
        </div>
        <div>
          <Label>Email</Label>
          <Input value={userEmail} readOnly />
        </div>
        <div>
          <Label>Estado</Label>
          <div className="pt-1.5 flex flex-col gap-1">
            <Badge
              tone={
                statusNorm === "activado"
                  ? "success"
                  : statusNorm === "suspendido" || statusNorm === "eliminado"
                    ? "danger"
                    : statusNorm === "deshabilitado"
                      ? "neutral"
                      : "warn"
              }
            >
              {statusLabel}
            </Badge>
            <span className="text-[10px] text-muted-foreground">
              {NEXT_ONBOARDING_STEP[statusNorm]}
            </span>
          </div>
        </div>
      </div>
      <hr className="my-4 border-border" />
      <h4 className="font-semibold mb-3 flex items-center gap-2 text-sm">
        <FileText size={14} /> Datos personales
      </h4>
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <Label>CUIL / CUIT</Label>
          <Input
            value={form.cuit_cuil ?? dp.cuitCuil}
            onChange={(e) => setF("cuit_cuil", e.target.value)}
          />
        </div>
        <div>
          <Label>DNI</Label>
          <Input defaultValue={isPJ ? "30.123.456" : "32.123.456"} />
        </div>
        <div>
          <Label>Genero</Label>
          <Select value={form.genero ?? dp.genero} onChange={(e) => setF("genero", e.target.value)}>
            <option>{form.genero ?? dp.genero}</option>
          </Select>
        </div>
        <div>
          <Label>Nacimiento</Label>
          <Input
            type="date"
            value={form.fecha_nacimiento ?? userNac}
            onChange={(e) => setF("fecha_nacimiento", e.target.value)}
          />
        </div>
        <div>
          <Label>Ocupacion</Label>
          <Input
            value={form.ocupacion ?? dp.ocupacion}
            onChange={(e) => setF("ocupacion", e.target.value)}
          />
        </div>
        <div>
          <Label>Fuente de Fondos</Label>
          <Select
            value={form.origen_fondos ?? dp.origenFondos}
            onChange={(e) => setF("origen_fondos", e.target.value)}
          >
            <option>{form.origen_fondos ?? dp.origenFondos}</option>
          </Select>
        </div>
        <div>
          <Label>PEP</Label>
          <div className="pt-1.5 text-sm">{dp.esPEP ? "Si" : "No"}</div>
        </div>
      </div>
      <div className="flex gap-2 justify-end mt-4">
        <BtnOutline disabled={saving} onClick={() => customer && setForm(customerToForm(customer))}>
          Cancelar
        </BtnOutline>
        <BtnPrimary disabled={saving} onClick={save}>
          {saving ? "Guardando…" : "Guardar cambios"}
        </BtnPrimary>
      </div>
    </Card>
  );
}
