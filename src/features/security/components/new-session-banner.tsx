import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { useSessionUser } from "@/features/session/session.hooks";
import { userMessage } from "@/shared/lib/errors";
import { useNewSessionAlert } from "../security.hooks";
import { securityKeys } from "../security.queries";
import { describeUserAgent, lastSeenLabel } from "../security.rules";
import { revokeMySession } from "../security.supabase";

/**
 * Aviso en el portal cuando se inicia sesion en la cuenta desde otro
 * dispositivo. "No fui yo" cierra esa sesion y sugiere cambiar la clave.
 */
export function NewSessionBanner() {
  const { session, others, acknowledge } = useNewSessionAlert();
  const userId = useSessionUser().user?.id ?? "";
  const queryClient = useQueryClient();
  const revoke = useMutation({
    mutationFn: (id: string) => revokeMySession(id),
    onSuccess: (_d, id) => {
      acknowledge(id);
      void queryClient.invalidateQueries({ queryKey: securityKeys.sessions(userId) });
      toast.success("Cerramos esa sesión. Te recomendamos cambiar tu contraseña.", {
        duration: 8000,
      });
    },
    onError: (e) => toast.error(userMessage(e, "No se pudo cerrar la sesion.")),
  });

  if (!session) return null;
  const device = describeUserAgent(session.userAgent) ?? "un dispositivo desconocido";

  return (
    <div
      role="alert"
      className="mb-4 flex flex-col gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 sm:flex-row sm:items-center"
    >
      <ShieldAlert size={20} className="shrink-0 text-amber-600" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="font-medium">Nuevo inicio de sesión en tu cuenta</p>
        <p className="text-xs text-amber-800">
          Desde {device}
          {session.ip ? ` · IP ${session.ip}` : ""} · {lastSeenLabel(session.createdAt)}
          {others > 0 ? ` · y ${others} más` : ""}. Si no fuiste vos, cerrá esa sesión y{" "}
          <Link to="/app/seguridad" className="font-medium underline">
            cambiá tu contraseña
          </Link>
          .
        </p>
      </div>
      <div className="flex shrink-0 gap-2">
        <button
          type="button"
          onClick={() => acknowledge(session.id)}
          className="h-9 rounded-md border border-amber-300 bg-card px-3 text-xs font-medium hover:bg-amber-100"
        >
          Fui yo
        </button>
        <button
          type="button"
          disabled={revoke.isPending}
          onClick={() => revoke.mutate(session.id)}
          className="h-9 rounded-md bg-amber-600 px-3 text-xs font-medium text-white hover:bg-amber-700 disabled:opacity-60"
        >
          {revoke.isPending ? "Cerrando…" : "No fui yo"}
        </button>
      </div>
    </div>
  );
}
