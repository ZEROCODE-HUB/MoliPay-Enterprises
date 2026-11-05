import { Modal } from "@/shared/ui/modal";
import { toast } from "sonner";
import { Download } from "lucide-react";
import { Card } from "@/shared/ui/card";
import { BtnOutline,BtnPrimary } from "@/shared/ui/button";
import { MollyLogo } from "@/shared/ui/molly-logo";

import type { AccountPageVm } from "./use-account-page";

export function CbuPreviewModal({
  cbuPreview,
  setCbuPreview,
  isPJ,
  companyInfo,
  userName,
  userApellido,
  dp,
  cbu,
}: Pick<
  AccountPageVm,
  | "cbuPreview"
  | "setCbuPreview"
  | "isPJ"
  | "companyInfo"
  | "userName"
  | "userApellido"
  | "dp"
  | "cbu"
>) {
  return (
    <>
      {cbuPreview && (
        <Modal open onClose={() => setCbuPreview(false)} size="custom" className="max-w-lg">
          <div className="min-h-0 flex-1 overflow-y-auto">
            <div className="sticky top-0 bg-card border-b px-6 py-4 flex justify-between items-center z-10">
              <div className="font-semibold">Vista previa &mdash; Constancia de CBU</div>
              <BtnOutline className="h-8 px-3 text-xs" onClick={() => setCbuPreview(false)}>
                Cerrar
              </BtnOutline>
            </div>
            <div className="p-8 space-y-5">
              <div className="flex items-center justify-between border-b pb-4">
                <MollyLogo />
                <div className="text-right text-xs text-muted-foreground">
                  <div className="font-mono font-semibold text-foreground">CBU-EMP-2026-000042</div>
                  <div>Generado: {new Date().toLocaleString("es-AR")}</div>
                </div>
              </div>
              <h2 className="text-xl font-semibold">Constancia de CBU</h2>
              <p className="text-xs text-muted-foreground">
                Molly Money Life SA certifica que la siguiente cuenta esta activa:
              </p>
              <Card className="bg-muted/30">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between gap-3">
                    <span className="text-muted-foreground">
                      {isPJ ? "Razon social" : "Titular"}
                    </span>
                    <span className="font-semibold text-right">
                      {isPJ ? companyInfo.nombreLegal : `${userName} ${userApellido}`}
                    </span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-muted-foreground">{isPJ ? "CUIT" : "CUIL"}</span>
                    <span className="font-mono font-semibold">{dp.cuitCuil}</span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-muted-foreground">CVU</span>
                    <span className="font-mono font-semibold text-right break-all">{cbu.cbu}</span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-muted-foreground">Alias</span>
                    <span className="font-mono font-semibold">{cbu.alias}</span>
                  </div>
                </div>
              </Card>
              <div className="text-[11px] text-muted-foreground border-t pt-3">
                Documento firmado digitalmente por Molly Money Life SA. Valido como constancia
                oficial de cuenta.
              </div>
              <div className="flex gap-2 pt-1">
                <BtnOutline className="flex-1" onClick={() => setCbuPreview(false)}>
                  Cancelar
                </BtnOutline>
                <BtnPrimary
                  className="flex-1"
                  onClick={() => {
                    setCbuPreview(false);
                    toast.success("Constancia de CBU descargada");
                  }}
                >
                  <Download size={14} /> Descargar PDF
                </BtnPrimary>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
