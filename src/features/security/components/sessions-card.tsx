import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Monitor,Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useAuthActions } from "@/features/auth/auth.hooks";
import { userMessage } from "@/shared/lib/errors";
import { Badge } from "@/shared/ui/badge";
import { BtnOutline } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { useConfirm } from "@/shared/ui/confirm-provider";
import { Input } from "@/shared/ui/form-controls";

/*
 * Tiempo de sesion y lista de dispositivos: datos de ejemplo (no hay backend; ver PENDIENTES).
 * "Cerrar todas las sesiones" si es real: cierra la sesion en todos los dispositivos.
 */

type DeviceSession = {
  device: string;
  location: string;
  ip: string;
  lastSeen: string;
  current: boolean;
};

const SAMPLE_SESSIONS: DeviceSession[] = [
  {
    device: "Chrome · MacBook Pro",
    location: "Buenos Aires, AR",
    ip: "190.12.44.21",
    lastSeen: "Activa ahora",
    current: true,
  },
  {
    device: "Safari · iPhone 14",
    location: "Buenos Aires, AR",
    ip: "190.12.44.21",
    lastSeen: "Hace 2 horas",
    current: false,
  },
  {
    device: "Firefox · Windows",
    location: "Cordoba, AR",
    ip: "200.40.18.92",
    lastSeen: "Hace 3 dias",
    current: false,
  },
];

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

export function SessionsCard() {
  const navigate = useNavigate();
  const confirm = useConfirm();
  const { signOut } = useAuthActions();
  const [sessions, setSessions] = useState(SAMPLE_SESSIONS);

  const goToLogin = () => navigate({ to: "/login", search: { register: undefined } });

  const closeSession = (index: number) => {
    setSessions((prev) => prev.filter((_, i) => i !== index));
    toast.success("Sesión cerrada");
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
      <h3 className="mb-3 flex items-center gap-2 font-semibold">
        <Monitor size={16} /> Sesiones activas
      </h3>
      <SessionTimeout />
      <div className="divide-y">
        {sessions.map((s, i) => (
          <div key={s.device} className="flex items-center justify-between py-3">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold">
                {s.device} {s.current && <Badge tone="success">Actual</Badge>}
              </div>
              <div className="text-xs text-muted-foreground">
                {s.location} · {s.ip} · {s.lastSeen}
              </div>
            </div>
            {!s.current && (
              <button
                onClick={() => closeSession(i)}
                className="flex items-center gap-1 text-xs font-semibold text-red-600"
              >
                <Trash2 size={12} /> Cerrar
              </button>
            )}
          </div>
        ))}
      </div>
      <BtnOutline className="mt-3 w-full" onClick={closeAll}>
        Cerrar todas las sesiones
      </BtnOutline>
    </Card>
  );
}
