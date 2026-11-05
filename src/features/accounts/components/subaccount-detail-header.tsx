import { Pencil,Trash2,Lock,Pause } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/shared/ui/badge";
import { Input } from "@/shared/ui/form-controls";

import type { SubaccountDetailModalVm } from "./use-subaccount-detail-modal";

export function SubaccountDetailHeader({
  confirmAction,
  sub,
  onChangeStatus,
  editEmail,
  emailVal,
  setEmailVal,
  setEditEmail,
}: Pick<
  SubaccountDetailModalVm,
  | "confirmAction"
  | "sub"
  | "onChangeStatus"
  | "editEmail"
  | "emailVal"
  | "setEmailVal"
  | "setEditEmail"
>) {
  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold">Informacion general</h3>
        <div className="flex gap-1">
          <button
            onClick={async () => {
              if (
                await confirmAction(
                  sub.e === "Activa" ? "pausar esta subcuenta" : "reactivar esta subcuenta",
                  "Los fondos quedaran " +
                    (sub.e === "Activa"
                      ? "congelados hasta que la reactives."
                      : "disponibles nuevamente."),
                )
              )
                onChangeStatus(sub.id!, sub.e === "Activa" ? "Pausada" : "Activa");
            }}
            className="h-7 w-7 inline-flex items-center justify-center rounded-md border bg-card hover:bg-muted transition text-muted-foreground hover:text-foreground"
            title={sub.e === "Activa" ? "Deshabilitar cuenta" : "Reactivar cuenta"}
          >
            <Pause size={13} />
          </button>
          <button
            onClick={async () => {
              if (
                await confirmAction(
                  "eliminar esta subcuenta",
                  "Esta accion es irreversible. Todos los fondos seran transferidos a la cuenta madre.",
                )
              )
                toast.success("Subcuenta eliminada (demo)");
            }}
            className="h-7 w-7 inline-flex items-center justify-center rounded-md border bg-card hover:bg-red-50 hover:text-red-600 transition text-muted-foreground"
            title="Eliminar subcuenta"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>
      <div className="space-y-3 text-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
              Nombre
            </span>
            <p className="font-semibold mt-0.5">{sub.n}</p>
          </div>
          <div>
            <span className="text-[11px] uppercase tracking-wide text-muted-foreground">Email</span>
            <div className="flex items-center gap-1.5 mt-0.5">
              {editEmail ? (
                <div className="flex items-center gap-1 flex-1">
                  <Input
                    value={emailVal}
                    onChange={(e) => setEmailVal(e.target.value)}
                    className="h-8 text-sm flex-1 min-w-0"
                  />
                  <button
                    onClick={() => {
                      setEditEmail(false);
                    }}
                    className="h-8 px-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 rounded border"
                  >
                    OK
                  </button>
                  <button
                    onClick={() => {
                      setEditEmail(false);
                      setEmailVal(sub.email);
                    }}
                    className="h-8 px-2 text-xs text-muted-foreground hover:bg-muted rounded border"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <>
                  <span className="text-muted-foreground">{emailVal || "—"}</span>
                  <button
                    onClick={() => setEditEmail(true)}
                    className="text-muted-foreground hover:text-foreground transition"
                    title="Editar email"
                  >
                    <Pencil size={12} />
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 pt-1">
          <Badge tone={sub.e === "Activa" ? "success" : "warn"}>
            {sub.e === "Activa" ? "Activo" : "Desactivado"}
          </Badge>
          <Badge tone={sub.retirosHab ? "success" : "neutral"}>
            <Lock size={11} className="inline mr-0.5" /> Retiros{" "}
            {sub.retirosHab ? "Habilitados" : "Deshabilitados"}
          </Badge>
        </div>
      </div>
    </section>
  );
}
