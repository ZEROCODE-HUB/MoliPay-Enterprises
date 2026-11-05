import { CreditCard,Download,Landmark,SlidersHorizontal } from "lucide-react";
import { Card } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { BtnOutline,BtnPrimary } from "@/shared/ui/button";
import { fmtArs } from "@/features/account/account.rules";

import type { AccountPageVm } from "./use-account-page";

export function CvuInfoCard({
  cbu,
  isPJ,
  setCbuPreview,
  userName,
  userApellido,
  dp,
  customer,
}: Pick<
  AccountPageVm,
  "cbu" | "isPJ" | "setCbuPreview" | "userName" | "userApellido" | "dp" | "customer"
>) {
  return (
    <div className="space-y-6">
      {/* CVU */}
      <Card>
        <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
          <Landmark size={16} className="shrink-0 text-primary" />
          Informacion de CVU
        </h3>
        <div className="text-xs space-y-2">
          <div className="flex justify-between gap-2">
            <span className="text-muted-foreground">CVU</span>
            <span className="font-mono font-semibold truncate">{cbu.cbu}</span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-muted-foreground">Alias</span>
            <span className="font-mono font-semibold truncate">{cbu.alias}</span>
          </div>
        </div>
      </Card>

      {/* Constancia CBU */}
      <Card>
        <div className="flex items-start justify-between gap-3 mb-2">
          <h3 className="font-semibold text-sm flex items-center gap-2 min-w-0">
            <Landmark size={16} className="shrink-0 text-primary" />
            <span className="truncate">Constancia de CBU</span>
          </h3>
          <Badge tone="success">Oficial</Badge>
        </div>
        <p className="text-xs text-muted-foreground mb-3">
          Documento oficial con razon social{isPJ ? ", CUIT" : ""}, CBU y alias.
        </p>
        <BtnPrimary className="w-full" onClick={() => setCbuPreview(true)}>
          <Download size={14} /> Descargar constancia (PDF)
        </BtnPrimary>
      </Card>

      {/* FacturaciOn */}
      <Card>
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          <CreditCard size={16} /> Facturacion
        </h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Metodo de pago</span>
            <span className="font-semibold">Debito CVU</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Proxima factura</span>
            <span className="font-semibold">01/07/2026</span>
          </div>
        </div>
        <BtnOutline className="w-full mt-4">Ver historial de facturas</BtnOutline>
      </Card>

      {/* Representantes legales (solo PJ) */}
      {isPJ && (
        <Card>
          <h3 className="font-semibold text-sm mb-3">Representantes legales</h3>
          <div className="space-y-3 text-sm">
            <div>
              <div className="font-semibold">
                {userName} {userApellido}
              </div>
              <div className="text-xs text-muted-foreground">{dp.cuitCuil} &middot; Presidenta</div>
            </div>
            <div>
              <div className="font-semibold">Diego Mendez</div>
              <div className="text-xs text-muted-foreground">20-29888777-3 &middot; Apoderado</div>
            </div>
          </div>
        </Card>
      )}

      {/* LImites operativos */}
      <Card>
        <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
          <SlidersHorizontal size={14} /> Limites operativos
        </h3>
        <p className="text-[11px] text-muted-foreground mb-3">
          Configurados por Molly. Para modificarlos contacta a tu ejecutivo.
        </p>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Monto max. por transferencia</span>
            <span className="font-semibold">{fmtArs(customer?.limite_transferencia)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Operaciones diarias</span>
            <span className="font-semibold">{customer?.limite_ops_diarias ?? "—"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Monto acumulado diario</span>
            <span className="font-semibold">{fmtArs(customer?.limite_monto_diario)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Horario operativo</span>
            <span className="font-semibold">06:00 &ndash; 23:00</span>
          </div>
        </div>
        <div className="mt-3 text-[11px] text-muted-foreground border-t pt-2">
          Ultima actualizacion: 01/06/2026 por equipo Molly
        </div>
      </Card>
    </div>
  );
}
