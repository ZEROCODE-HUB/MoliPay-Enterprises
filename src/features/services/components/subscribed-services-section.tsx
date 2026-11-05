import { Clock,Search } from "lucide-react";
import { Card } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { BtnOutline,BtnPrimary } from "@/shared/ui/button";
import { Input,Select } from "@/shared/ui/form-controls";
import { PREVIEW_LIMIT,cats } from "@/features/services/services.rules";

import type { ServicesPageVm } from "./use-services-page";

export function SubscribedServicesSection({
  sectionTab,
  sort,
  setSort,
  setCatFilt,
  catFilt,
  suscAll,
  suscritos,
  setEditService,
  setPay,
  setSuscAll,
}: Pick<
  ServicesPageVm,
  | "sectionTab"
  | "sort"
  | "setSort"
  | "setCatFilt"
  | "catFilt"
  | "suscAll"
  | "suscritos"
  | "setEditService"
  | "setPay"
  | "setSuscAll"
>) {
  return (
    <>
      {sectionTab === "suscritos" && (
        <Card className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-sm">Servicios suscritos</h3>
          </div>
          <div className="flex flex-wrap gap-2 mb-4">
            <div className="relative w-full sm:flex-1 sm:min-w-[200px]">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <Input placeholder="Buscar servicio o numero de cuenta..." className="pl-9" />
            </div>
            <Select value={sort} onChange={(e) => setSort(e.target.value)}>
              <option value="vencimiento">Orden: vencimiento</option>
              <option value="monto">Monto</option>
              <option value="alfabetico">Alfabetico</option>
            </Select>
          </div>
          <div className="flex flex-wrap gap-1.5 mb-4">
            {cats.map((c) => (
              <button
                key={c}
                onClick={() => setCatFilt(c)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${catFilt === c ? "bg-[color:var(--brand-soft)] text-[color:var(--brand-dark)] border-transparent" : "bg-card hover:bg-muted"}`}
              >
                {c}
              </button>
            ))}
          </div>
          <div className="divide-y">
            {(suscAll ? suscritos : suscritos.slice(0, PREVIEW_LIMIT)).map((s) => {
              const Icon = s.icon;
              return (
                <div key={s.n + s.c} className="flex items-center justify-between gap-3 py-3.5">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-md bg-[color:var(--brand-soft)] flex items-center justify-center shrink-0">
                      <Icon size={18} className="text-[color:var(--brand-dark)]" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-sm truncate">
                        {s.n} <span className="text-muted-foreground font-normal">· {s.cat}</span>
                      </div>
                      <div className="text-xs text-muted-foreground truncate">{s.c}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right hidden sm:block">
                      <div className="text-sm font-semibold">{s.v}</div>
                      <div className="text-[11px] text-muted-foreground flex items-center gap-1 justify-end">
                        <Clock size={10} /> Vence {s.venc}
                      </div>
                    </div>
                    <Badge
                      tone={s.e === "Vencido" ? "danger" : s.e === "Pendiente" ? "warn" : "neutral"}
                    >
                      {s.e}
                    </Badge>
                    <BtnOutline className="h-9 px-2.5 text-xs" onClick={() => setEditService(s)}>
                      Editar
                    </BtnOutline>
                    <BtnPrimary className="h-9 px-4" onClick={() => setPay(s)}>
                      Pagar
                    </BtnPrimary>
                  </div>
                </div>
              );
            })}
          </div>
          {suscritos.length > PREVIEW_LIMIT && (
            <button
              onClick={() => setSuscAll(!suscAll)}
              className="w-full text-center text-xs font-semibold text-primary pt-3 pb-1 hover:opacity-80 transition border-t border-border mt-1"
            >
              {suscAll ? "Mostrar menos" : `Ver todos (${suscritos.length})`}
            </button>
          )}
        </Card>
      )}
    </>
  );
}
