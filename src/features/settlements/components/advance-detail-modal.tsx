import { ErrorNotice } from "@/shared/ui/error-notice";
import { Modal } from "@/shared/ui/modal";
import { downloadXlsx } from "@/shared/lib/download";
import { formatARS } from "@/features/collections/collections.data";
import { BtnOutline,BtnPrimary } from "@/shared/ui/button";
import { CheckCircle2,Download,TrendingUp } from "lucide-react";
import { Badge } from "@/shared/ui/badge";
import {
STATUS_TICKET_LABEL,
STATUS_TICKET_TONE,
fmtDateFull,
pendingCompensar,
} from "@/features/settlements/settlements.rules";

import type { SettlementsPageVm } from "./use-settlements-page";

export function AdvanceDetailModal({
  detail,
  setDetail,
  aceptoOferta,
  setAceptoOferta,
  saving,
  handleAceptar,
  askConfirm,
  handleCancel,
}: Pick<
  SettlementsPageVm,
  | "detail"
  | "setDetail"
  | "aceptoOferta"
  | "setAceptoOferta"
  | "saving"
  | "handleAceptar"
  | "askConfirm"
  | "handleCancel"
>) {
  return (
    <>
      {detail && (
        <Modal open onClose={() => setDetail(null)} size="custom" className="max-w-md">
          <div className="min-h-0 flex-1 overflow-y-auto">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <div className="font-semibold">Adelanto {detail.id}</div>
              <Badge tone={STATUS_TICKET_TONE[detail.estado] ?? "neutral"}>
                {STATUS_TICKET_LABEL[detail.estado] ?? detail.estado}
              </Badge>
            </div>
            <div className="p-6 space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Fecha solicitud</span>
                <span className="font-semibold">{fmtDateFull(detail.fecha)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Monto solicitado</span>
                <span className="font-mono font-semibold">{formatARS(detail.montoSolicitado)}</span>
              </div>
              {detail.plazoAdelantado != null && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Plazo</span>
                  <span className="font-semibold">{detail.plazoAdelantado} días</span>
                </div>
              )}
              {detail.fechaAcreditacion &&
                (detail.estado === "acreditado" || detail.estado === "compensado") && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Acreditado</span>
                    <span className="font-semibold">{fmtDateFull(detail.fechaAcreditacion)}</span>
                  </div>
                )}
              {detail.estado === "rechazado" && detail.rechazoMotivo && (
                <ErrorNotice icon={false}>Motivo del rechazo: {detail.rechazoMotivo}</ErrorNotice>
              )}
              {detail.estado === "pendiente" && (
                <div className="bg-amber-50 border border-amber-200 rounded-md p-3 text-xs text-amber-900">
                  MoliPay está evaluando tu pedido. Vas a recibir una oferta con la tasa y el neto a
                  recibir.
                </div>
              )}
              {detail.estado === "aceptado" && (
                <div className="bg-blue-50 border border-blue-200 rounded-md p-3 text-xs text-blue-900">
                  Aceptaste la oferta. MoliPay va a acreditar{" "}
                  <span className="font-mono font-semibold">
                    {formatARS(detail.netoARecibir ?? 0)}
                  </span>{" "}
                  en tu cuenta. Hasta que se acredite todavía podés cancelarla.
                </div>
              )}
              {(detail.estado === "acreditado" || detail.estado === "compensado") && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-md p-3 text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Neto acreditado</span>
                    <span className="font-mono font-semibold">
                      {formatARS(detail.netoARecibir ?? 0)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Ya descontado de tus liquidaciones
                    </span>
                    <span className="font-mono">{formatARS(detail.compensado ?? 0)}</span>
                  </div>
                  <div className="flex justify-between border-t border-emerald-200 pt-1">
                    <span className="text-muted-foreground font-semibold">
                      Falta descontar
                    </span>
                    <span className="font-mono font-bold">
                      {formatARS(pendingCompensar(detail))}
                    </span>
                  </div>
                </div>
              )}
              {detail.motivo && (
                <div className="pt-3 border-t">
                  <div className="text-xs text-muted-foreground">Motivo</div>
                  <div className="mt-1">{detail.motivo}</div>
                </div>
              )}
              {detail.estado === "aprobado" && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-md p-3 text-xs space-y-1">
                  <div className="flex items-center gap-1.5 text-emerald-700 font-medium mb-1">
                    <TrendingUp size={14} /> Oferta del administrador
                  </div>
                  <p className="text-[11px] text-emerald-900/80 mb-2">
                    MoliPay te ofrece este adelanto. Revisá la tasa y el neto: si te conviene,
                    aceptala; si no, cancelala. La tasa es un descuento único sobre el monto.
                  </p>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Monto aprobado</span>
                    <span className="font-mono font-semibold">
                      {formatARS(detail.montoOfertado ?? detail.montoSolicitado)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tasa</span>
                    <span className="font-mono font-bold text-emerald-700">
                      {detail.tasaInteres ?? 0}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Descuento</span>
                    <span className="font-mono font-semibold text-red-600">
                      - {formatARS(detail.descuento ?? 0)}
                    </span>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-emerald-200">
                    <span className="text-muted-foreground">Neto que se acredita en tu cuenta</span>
                    <span className="font-mono font-bold text-emerald-700">
                      {formatARS(detail.netoARecibir ?? 0)}
                    </span>
                  </div>
                  <label className="flex items-start gap-2 pt-2 text-[12px] text-foreground">
                    <input
                      type="checkbox"
                      className="mt-0.5"
                      checked={aceptoOferta}
                      onChange={(e) => setAceptoOferta(e.target.checked)}
                    />
                    <span>
                      Acepto la tasa de {detail.tasaInteres ?? 0}% y que se acreditarán{" "}
                      <b>{formatARS(detail.netoARecibir ?? 0)}</b> en mi cuenta. El monto de{" "}
                      {formatARS(detail.montoOfertado ?? detail.montoSolicitado)} se descuenta de
                      mis próximas liquidaciones.
                    </span>
                  </label>
                </div>
              )}
              <div className="flex gap-2 pt-4">
                <BtnOutline className="flex-1" onClick={() => setDetail(null)}>
                  Cerrar
                </BtnOutline>
                {detail.estado === "aprobado" && (
                  <BtnPrimary
                    className="flex-1"
                    disabled={saving || !aceptoOferta}
                    onClick={() => handleAceptar(detail)}
                  >
                    <CheckCircle2 size={14} /> {saving ? "Aceptando…" : "Aceptar"}
                  </BtnPrimary>
                )}
                {(detail.estado === "pendiente" ||
                  detail.estado === "aprobado" ||
                  detail.estado === "aceptado") && (
                  <button
                    className="inline-flex items-center justify-center gap-2 h-10 px-5 rounded-sm border border-red-200 bg-white text-red-600 text-sm font-semibold cursor-pointer hover:bg-red-50 active:bg-red-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-150 flex-1"
                    disabled={saving}
                    onClick={async () => {
                      if (
                        await askConfirm({
                          title: "Cancelar adelanto",
                          message:
                            detail.estado === "pendiente"
                              ? "¿Seguro que querés cancelar esta solicitud? Esta acción no se puede deshacer."
                              : "¿Cancelás la oferta? El adelanto pasará a Cancelado y se liberará el cupo de tus lotes.",
                          confirmLabel: "Cancelar adelanto",
                          cancelLabel: "Volver",
                          variant: "danger",
                        })
                      ) {
                        handleCancel(detail.fullId);
                      }
                    }}
                  >
                    {saving
                      ? "Cancelando…"
                      : detail.estado === "pendiente"
                        ? "Cancelar pedido"
                        : "Cancelar oferta"}
                  </button>
                )}
                {(detail.estado === "acreditado" || detail.estado === "compensado") && (
                  <BtnPrimary
                    className="flex-1"
                    onClick={() => {
                      downloadXlsx(
                        `adelanto_${detail.id}.xlsx`,
                        [
                          {
                            Adelanto: detail.id,
                            "Fecha solicitud": fmtDateFull(detail.fecha),
                            "Monto aprobado": detail.montoOfertado ?? detail.montoSolicitado,
                            "Tasa %": detail.tasaInteres ?? 0,
                            Descuento: detail.descuento ?? 0,
                            "Neto acreditado": detail.netoARecibir ?? 0,
                            Acreditado: fmtDateFull(detail.fechaAcreditacion),
                            Compensado: detail.compensado ?? 0,
                            "Falta descontar": pendingCompensar(detail),
                          },
                        ],
                        { sheetName: "Adelanto" },
                      );
                    }}
                  >
                    <Download size={14} /> Comprobante
                  </BtnPrimary>
                )}
              </div>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
