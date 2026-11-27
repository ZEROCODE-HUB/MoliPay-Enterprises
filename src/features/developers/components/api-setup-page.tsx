import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { BookOpen, Clock, ExternalLink, Send } from "lucide-react";
import { userMessage } from "@/shared/lib/errors";
import { Badge } from "@/shared/ui/badge";
import { BtnPrimary } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { ErrorNotice } from "@/shared/ui/error-notice";
import { useDeveloperPortal } from "../developers.hooks";
import {
  STATUS_DESCRIPTION,
  STATUS_LABEL,
  canRequestAccess,
  formatShortDateTime,
  isApiModuleEnabled,
  statusTone,
} from "../developers.rules";
import { AccessRequestDialog } from "./access-request-dialog";

/**
 * Entrada al modulo de APIs externas. Flujo: la empresa solicita el acceso,
 * MoliPay lo aprueba y recien ahi se generan las llaves en "API e integraciones".
 */
export function ApiSetupPage() {
  const navigate = useNavigate();
  const query = useDeveloperPortal();
  const [requestOpen, setRequestOpen] = useState(false);
  const integration = query.data?.integration ?? null;
  const status = integration?.status;
  const enabled = isApiModuleEnabled(status);
  const pending = status === "pending_validation";

  return (
    <>
      <nav className="mb-4 flex items-center gap-1.5 text-xs text-muted-foreground">
        <Link to="/app" className="transition hover:text-foreground">
          Inicio
        </Link>
        <span>/</span>
        <span className="font-medium text-foreground">Configuración de APIs Externas</span>
      </nav>

      <div className="mb-6">
        <h1 className="text-xl font-medium">Configuración de APIs Externas</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Conectá tu ERP, CRM o software contable con MoliPay para automatizar cobros,
          transferencias, dispersión de fondos y consultas de saldo.
        </p>
      </div>

      {query.isError && (
        <ErrorNotice className="mb-4 max-w-xl" icon={false}>
          {userMessage(query.error)}
        </ErrorNotice>
      )}

      <Card className="max-w-xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
          <div className="flex-1">
            <h2 className="flex items-center gap-2 text-sm font-medium">
              Módulo de APIs Externas
              {status && <Badge tone={statusTone(status)}>{STATUS_LABEL[status]}</Badge>}
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              {query.isPending
                ? "Cargando…"
                : status
                  ? STATUS_DESCRIPTION[status]
                  : "Todavía no está habilitado para tu cuenta. Solicitá la habilitación: MoliPay revisa tu perfil y, con la aprobación, generás tus credenciales."}
            </p>
            {pending && integration?.accessRequestedAt && (
              <p className="mt-2 flex items-center gap-1.5 text-xs text-amber-700">
                <Clock size={12} /> Solicitado el{" "}
                {formatShortDateTime(integration.accessRequestedAt)}
              </p>
            )}
            {status === "revoked" && integration?.revocationReason && (
              <p className="mt-2 text-xs text-red-700">{integration.revocationReason}</p>
            )}
          </div>
          <div className="flex shrink-0 flex-col gap-2">
            <Link
              to="/app/api-docs"
              className="inline-flex h-9 items-center gap-2 whitespace-nowrap rounded-md border bg-card px-4 text-sm font-medium transition hover:bg-muted"
            >
              <BookOpen size={14} /> Ver documentación
            </Link>
            {enabled ? (
              <BtnPrimary onClick={() => void navigate({ to: "/app/api" })}>
                <ExternalLink size={14} /> Ir a API e integraciones
              </BtnPrimary>
            ) : pending ? (
              <BtnPrimary disabled>
                <Clock size={14} /> Solicitud enviada
              </BtnPrimary>
            ) : (
              <BtnPrimary
                onClick={() => setRequestOpen(true)}
                disabled={query.isPending || !canRequestAccess(status)}
              >
                <Send size={14} />{" "}
                {status === "revoked" ? "Volver a solicitar" : "Solicitar habilitación"}
              </BtnPrimary>
            )}
          </div>
        </div>
      </Card>

      <AccessRequestDialog open={requestOpen} onClose={() => setRequestOpen(false)} />
    </>
  );
}
