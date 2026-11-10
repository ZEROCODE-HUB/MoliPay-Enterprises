import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Laptop, Monitor, RefreshCw, Smartphone, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useAuthActions } from "@/features/auth/auth.hooks";
import { useSessionUser } from "@/features/session/session.hooks";
import { userMessage } from "@/shared/lib/errors";
import { Badge } from "@/shared/ui/badge";
import { BtnOutline } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { useConfirm } from "@/shared/ui/confirm-provider";
import { Input } from "@/shared/ui/form-controls";
import { securityKeys, securityQueries } from "../security.queries";
import { describeUserAgent, lastSeenLabel } from "../security.rules";
import { revokeMySession } from "../security.supabase";
import type { AuthSession } from "../security.types";

/*
 * Sesiones reales de Supabase Auth (RPC my_sessions). El tiempo de sesion sigue siendo
 * de ejemplo: el vencimiento por inactividad se configura en Auth (plan Pro, ver PENDIENTES).
 */

const TIMEOUT_OPTIONS = ["Nunca", "30 minutos", "1 hora", "6 horas", "1 dia"];

const chipClass = (active: boolean) =>
  `px-3 py-1.5 text-xs font-semibold rounded-md border transition ${
    active
      ? "border-primary bg-[color:var(--brand-soft)] text-primary"
      : "border-border hover:border-primary/50 bg-card text-muted-foreground"
  }`;

function SessionTimeout() {
  // "" = sin vencimiento; "custom" = minutos a mano.
  const [timeout, setTimeoutValue] = useState("Nunca");
  const [customMinutes, setCustomMinutes] = useState("");

  return (
    <div className="mb-5 border-b pb-5">
      <div className="mb-2 text-xs text-muted-foreground">
        Tiempo de sesión activa: la sesión se cerrará automáticamente después del período de
        inactividad.
      </div>
      <div className="flex flex-wrap gap-1.5">
        {TIMEOUT_OPTIONS.map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => {
              setTimeoutValue(opt === "Nunca" ? "" : opt);
              setCustomMinutes("");
            }}
            className={chipClass(timeout === opt)}
          >
            {opt}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setTimeoutValue("custom")}
          className={chipClass(timeout === "custom")}
        >
          Custom
        </button>
      </div>
      {timeout === "custom" && (
        <div className="mt-2 flex items-center gap-2">
          <Input
            value={customMinutes}
            onChange={(e) => setCustomMinutes(e.target.value)}
            placeholder="Minutos"
            className="h-9 w-28 text-sm"
            type="number"
            min={1}
          />
          <span className="text-xs text-muted-foreground">minutos</span>
          <BtnOutline
            className="h-9 px-3 text-xs"
            onClick={() => {
              if (!customMinutes || Number(customMinutes) < 1) {
                toast.error("Ingresá un tiempo válido");
                return;
              }
              toast.success(`Tiempo de sesión: ${customMinutes} minutos`);
            }}
          >
            Aplicar
          </BtnOutline>
        </div>
      )}
      {timeout && timeout !== "custom" && (
        <p className="mt-1.5 text-[11px] text-emerald-700">
          Tiempo de sesión configurado: {timeout}
        </p>
      )}
      {timeout === "" && (
        <p className="mt-1.5 text-[11px] text-muted-foreground">
          La sesión no expirará por inactividad.
        </p>
      )}
    </div>
  );
}

function SessionRow({
  session,
  pending,
  onClose,
}: {
  session: AuthSession;
  pending: boolean;
  onClose: (s: AuthSession) => void;
}) {
  const Icon = /Android|iPhone|iPad|Mobile/.test(session.userAgent ?? "") ? Smartphone : Laptop;
  return (
    <div className="flex items-center justify-between gap-3 py-3">
      <div className="flex min-w-0 items-center gap-3">
        <Icon size={18} className="shrink-0 text-muted-foreground" aria-hidden />
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <span className="truncate">
              {describeUserAgent(session.userAgent) ?? "Dispositivo desconocido"}
            </span>
            {session.current && <Badge tone="success">Este dispositivo</Badge>}
          </div>
          <div className="truncate text-xs text-muted-foreground">
            {session.ip && <span className="font-mono">{session.ip} · </span>}
            {session.current ? "Activa ahora" : lastSeenLabel(session.lastActiveAt)} · inició{" "}
            {new Date(session.createdAt).toLocaleDateString("es-AR")}
          </div>
        </div>
      </div>
      {!session.current && (
        <button
          type="button"
          disabled={pending}
          onClick={() => onClose(session)}
          className="flex shrink-0 items-center gap-1 text-xs font-semibold text-red-600 disabled:opacity-50"
        >
          <Trash2 size={12} /> Cerrar
        </button>
      )}
    </div>
  );
}

export function SessionsCard() {
  const navigate = useNavigate();
  const confirm = useConfirm();
  const qc = useQueryClient();
  const { signOut } = useAuthActions();
  const userId = useSessionUser().user?.id ?? "";
  const query = useQuery({ ...securityQueries.sessions(userId), enabled: !!userId });
  const sessions = query.data ?? [];
  const others = sessions.filter((s) => !s.current).length;

  const refresh = () => void qc.invalidateQueries({ queryKey: securityKeys.sessions(userId) });
  const goToLogin = () => navigate({ to: "/login", search: { register: undefined } });

  const revoke = useMutation({
    mutationFn: revokeMySession,
    onSuccess: () => toast.success("Sesión cerrada en ese dispositivo"),
    onError: (e) => toast.error(userMessage(e, "No se pudo cerrar la sesión")),
    onSettled: refresh,
  });

  const closeSession = async (s: AuthSession) => {
    const ok = await confirm({
      title: "Cerrar sesión en otro dispositivo",
      message: `${describeUserAgent(s.userAgent) ?? "Ese dispositivo"} tendrá que volver a ingresar. Puede tardar unos minutos en salir.`,
      confirmLabel: "Cerrar sesión",
      variant: "danger",
    });
    if (ok) revoke.mutate(s.id);
  };

  const closeOthers = async () => {
    const ok = await confirm({
      title: "Cerrar las demás sesiones",
      message: "Se cerrará tu sesión en todos los otros dispositivos. Este sigue abierto.",
      confirmLabel: "Cerrar las demás",
      variant: "danger",
    });
    if (!ok) return;
    try {
      await signOut("others");
      toast.success("Se cerraron las demás sesiones");
    } catch (e) {
      toast.error(userMessage(e, "No se pudieron cerrar las sesiones"));
    }
    refresh();
  };

  const closeAll = async () => {
    const ok = await confirm({
      title: "Cerrar todas las sesiones",
      message:
        "Se cerrará tu sesión en todos los dispositivos, incluido este. Vas a tener que volver a ingresar.",
      confirmLabel: "Cerrar todas",
      variant: "danger",
    });
    if (!ok) return;
    try {
      await signOut("global");
    } catch (e) {
      toast.error(userMessage(e, "No se pudieron cerrar las sesiones"));
      return;
    }
    toast.success("Todas las sesiones fueron cerradas");
    goToLogin();
  };

  return (
    <Card>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 font-semibold">
          <Monitor size={16} /> Sesiones activas
        </h3>
        <button
          type="button"
          onClick={() => query.refetch()}
          className="rounded-md p-1.5 text-muted-foreground hover:bg-muted"
          title="Actualizar"
          aria-label="Actualizar"
        >
          <RefreshCw size={14} className={query.isFetching ? "animate-spin" : ""} />
        </button>
      </div>
      <SessionTimeout />
      {query.isPending ? (
        <div className="space-y-3 py-1" aria-busy>
          {[0, 1].map((i) => (
            <div key={i} className="h-10 animate-pulse rounded-md bg-muted" />
          ))}
        </div>
      ) : query.isError ? (
        <p className="py-3 text-sm text-red-700">
          {userMessage(query.error, "No se pudieron cargar las sesiones")}
        </p>
      ) : (
        <div className="divide-y">
          {sessions.map((s) => (
            <SessionRow key={s.id} session={s} pending={revoke.isPending} onClose={closeSession} />
          ))}
        </div>
      )}
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        {others > 0 && (
          <BtnOutline className="flex-1" onClick={closeOthers}>
            Cerrar las demás ({others})
          </BtnOutline>
        )}
        <BtnOutline className="flex-1" onClick={closeAll}>
          Cerrar todas las sesiones
        </BtnOutline>
      </div>
    </Card>
  );
}
