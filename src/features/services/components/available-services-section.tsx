import { ScanLine } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/shared/ui/card";
import { BtnOutline,BtnPrimary } from "@/shared/ui/button";
import { Input,Label,Select } from "@/shared/ui/form-controls";
import { PREVIEW_LIMIT } from "@/features/services/services.rules";

import type { ServicesPageVm } from "./use-services-page";

export function AvailableServicesSection({
  sectionTab,
  nameNew,
  setNameNew,
  catNew,
  setCatNew,
  numberNew,
  setNumberNew,
  setScanOpen,
  addSuscripcion,
  dispAll,
  availables,
  setDispAll,
}: Pick<
  ServicesPageVm,
  | "sectionTab"
  | "nameNew"
  | "setNameNew"
  | "catNew"
  | "setCatNew"
  | "numberNew"
  | "setNumberNew"
  | "setScanOpen"
  | "addSuscripcion"
  | "dispAll"
  | "availables"
  | "setDispAll"
>) {
  return (
    <>
      {sectionTab === "disponibles" && (
        <>
          <Card className="mb-6">
            <h3 className="font-semibold text-sm mb-4">Suscribir un servicio</h3>
            <div className="grid md:grid-cols-2 gap-3 mb-3">
              <div>
                <Label>Nombre del servicio</Label>
                <Input
                  value={nameNew}
                  onChange={(e) => setNameNew(e.target.value)}
                  placeholder="Ej. Mi proveedor"
                />
              </div>
              <div>
                <Label>Categoria</Label>
                <Select value={catNew} onChange={(e) => setCatNew(e.target.value)}>
                  {[
                    "Servicios publicos",
                    "Telefonia e internet",
                    "Impuestos",
                    "Tarjetas de credito",
                    "Cuotas escolares",
                  ].map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 items-end">
              <div className="flex-1 min-w-[220px]">
                <Label>Numero de cliente / codigo de barra</Label>
                <Input
                  value={numberNew}
                  onChange={(e) => setNumberNew(e.target.value)}
                  placeholder="Escanear o ingresar numero"
                />
              </div>
              <BtnOutline className="h-10" onClick={() => setScanOpen(true)}>
                <ScanLine size={14} /> Escanear codigo
              </BtnOutline>
              <BtnPrimary className="h-10" disabled={!numberNew.trim()} onClick={addSuscripcion}>
                Suscribir
              </BtnPrimary>
            </div>
          </Card>

          <Card className="mb-6">
            <h3 className="font-semibold text-sm mb-4">Servicios disponibles para suscribir</h3>
            <div className="divide-y">
              {(dispAll ? availables : availables.slice(0, PREVIEW_LIMIT)).map((s) => {
                const Icon = s.icon;
                return (
                  <div key={s.n + s.c} className="flex items-center justify-between gap-3 py-3.5">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center shrink-0">
                        <Icon size={18} className="text-muted-foreground" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-sm truncate">
                          {s.n} <span className="text-muted-foreground font-normal">· {s.cat}</span>
                        </div>
                        <div className="text-xs text-muted-foreground truncate">No suscrito</div>
                      </div>
                    </div>
                    <BtnPrimary
                      className="h-9 px-4 shrink-0"
                      onClick={() => {
                        toast.success("Suscripcion a " + s.n + " iniciada");
                      }}
                    >
                      Suscribir
                    </BtnPrimary>
                  </div>
                );
              })}
            </div>
            {availables.length > PREVIEW_LIMIT && (
              <button
                onClick={() => setDispAll(!dispAll)}
                className="w-full text-center text-xs font-semibold text-primary pt-3 pb-1 hover:opacity-80 transition border-t border-border mt-1"
              >
                {dispAll ? "Mostrar menos" : `Ver todos (${availables.length})`}
              </button>
            )}
          </Card>
        </>
      )}
    </>
  );
}
