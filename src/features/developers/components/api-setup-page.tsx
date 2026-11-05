import { Link,useNavigate } from "@tanstack/react-router";
import { BookOpen,ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/shared/ui/badge";
import { BtnPrimary } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { useConfirm } from "@/shared/ui/confirm-provider";
import { useDeveloperPortal } from "../developers.hooks";
import {
STATUS_DESCRIPTION,
STATUS_LABEL,
isApiModuleEnabled,
statusTone,
} from "../developers.rules";

/** Entrada al modulo de APIs externas: estado y acceso a "API e integraciones". */
export function ApiSetupPage() {
  const navigate = useNavigate();
  const confirm = useConfirm();
  const query = useDeveloperPortal();
  const status = query.data?.integration?.status;
  const enabled = isApiModuleEnabled(status);

  // Habilitar = generar las llaves de Sandbox en "API e integraciones", donde la Secret Key
  // se muestra una sola vez. El pase a Producción se pide ahí.
  const requestAccess = async () => {
    const ok = await confirm({
      title: "El módulo de APIs externas no está habilitado para su cuenta",
      message:
        "¿Desea habilitar el Sandbox? Se activa en el momento y no mueve dinero real. Para operar en Producción, después solicitás el pase y MoliPay lo aprueba.",
      confirmLabel: "Habilitar Sandbox",
    });
    if (!ok) return;
    toast.info("Tocá «Generar llaves de Sandbox» para obtener tu API Key y tu Secret Key.");
    void navigate({ to: "/app/api" });
  };

  return (
    <>
      <nav className="mb-4 flex items-center gap-1.5 text-xs text-muted-foreground">
        <Link to="/app" className="transition hover:text-foreground">
          Inicio
        </Link>
        <span>/</span>
        <span className="font-semibold text-foreground">Configuración de APIs Externas</span>
      </nav>

      <div className="mb-6">
        <h1 className="text-xl font-semibold">Configuración de APIs Externas</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Gestione el acceso a las APIs externas de la plataforma: credenciales de Sandbox y
          Producción, webhooks y permisos.
        </p>
      </div>

      <Card className="max-w-xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
          <div className="flex-1">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              Módulo de APIs Externas
              {status && <Badge tone={statusTone(status)}>{STATUS_LABEL[status]}</Badge>}
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              {query.isPending
                ? "Cargando…"
                : status
                  ? STATUS_DESCRIPTION[status]
                  : "Este módulo le permite integrar sus sistemas (ERP, e-commerce, software contable) con las APIs de MoliPay. Actualmente no está habilitado para su cuenta."}
            </p>
          </div>
          <div className="flex shrink-0 flex-col gap-2">
            <Link
              to="/app/api"
              hash="como-firmar"
              className="inline-flex h-9 items-center gap-2 whitespace-nowrap rounded-md border bg-card px-4 text-sm font-semibold transition hover:bg-muted"
            >
              <BookOpen size={14} /> Ver documentación
            </Link>
            {enabled ? (
              <BtnPrimary onClick={() => void navigate({ to: "/app/api" })}>
                <ExternalLink size={14} /> Ir a API e integraciones
              </BtnPrimary>
            ) : (
              <BtnPrimary
                onClick={() => void requestAccess()}
                disabled={status === "pending_validation"}
              >
                <ExternalLink size={14} /> Solicitar habilitación
              </BtnPrimary>
            )}
          </div>
        </div>
      </Card>
    </>
  );
}
