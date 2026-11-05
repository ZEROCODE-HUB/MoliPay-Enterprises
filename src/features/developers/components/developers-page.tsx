import { ErrorNotice } from "@/shared/ui/error-notice";
import { useState } from "react";
import { BookOpen } from "lucide-react";
import { userMessage } from "@/shared/lib/errors";
import { Badge } from "@/shared/ui/badge";
import { BtnPrimary } from "@/shared/ui/button";
import { Stat } from "@/shared/ui/card";
import { PageHeader } from "@/shared/ui/page-header";
import { useDeveloperPortal } from "../developers.hooks";
import {
ENVIRONMENT_LABEL,
STATUS_LABEL,
WEBHOOK_EVENT_LABEL,
environmentAccess,
statusTone,
} from "../developers.rules";
import type { ApiEnvironment } from "../developers.types";
import { CredentialsCard } from "./credentials-card";
import { EndpointsCard } from "./endpoints-card";
import { IntegrationStatusCard } from "./integration-status-card";
import { ProductionRequestDialog } from "./production-request-dialog";
import { RequestLogsCard } from "./request-logs-card";
import { SecretRevealModal,type RevealedSecret } from "./secret-reveal-modal";
import { WebhookCard } from "./webhook-card";

const ENVIRONMENT_TABS: [ApiEnvironment, string][] = [
  ["sandbox", "Sandbox (pruebas)"],
  ["production", "Producción"],
];

export function DevelopersPage() {
  const query = useDeveloperPortal({ live: true });
  const [environment, setEnvironment] = useState<ApiEnvironment>("sandbox");
  const [secret, setSecret] = useState<RevealedSecret | null>(null);
  const [productionDialogOpen, setProductionDialogOpen] = useState(false);

  const portal = query.data;
  const integration = portal?.integration ?? null;
  const status = integration?.status;
  const access = environmentAccess(status, environment);
  const apiKey = portal?.keys.find((k) => k.environment === environment) ?? null;
  const stats = portal?.stats[environment];
  const webhook = portal?.webhooks.find((w) => w.environment === environment) ?? null;
  const logs = (portal?.logs ?? []).filter((l) => l.environment === environment).slice(0, 10);
  const deliveries = (portal?.deliveries ?? [])
    .filter((d) => d.environment === environment)
    .slice(0, 6);

  return (
    <>
      <PageHeader
        title="API e integraciones"
        description="Credenciales, webhooks, sandbox y documentación técnica."
        action={
          <a href="#como-firmar">
            <BtnPrimary>
              <BookOpen size={14} /> Ver documentación
            </BtnPrimary>
          </a>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {ENVIRONMENT_TABS.map(([env, label]) => (
          <button
            key={env}
            type="button"
            onClick={() => setEnvironment(env)}
            className={`h-9 rounded-md border px-4 text-sm font-semibold ${
              environment === env
                ? "border-primary bg-primary text-primary-foreground"
                : "bg-card hover:bg-muted"
            }`}
          >
            {label}
          </button>
        ))}
        {status && <Badge tone={statusTone(status)}>{STATUS_LABEL[status]}</Badge>}
      </div>

      {query.isError && (
        <ErrorNotice className="mb-4" icon={false}>
          {userMessage(query.error)}
        </ErrorNotice>
      )}
      {access.suspended && (
        <ErrorNotice className="mb-4">
          <span>
            Tu integración está suspendida: {integration?.suspensionReason ?? "consultá a soporte"}.
            Todas las peticiones se rechazan con 403 hasta que MoliPay la reactive.
          </span>
        </ErrorNotice>
      )}
      {status === "revoked" && (
        <ErrorNotice className="mb-4" icon={false}>
          Tu integración fue revocada
          {integration?.revocationReason ? `: ${integration.revocationReason}` : ""}. Podés empezar
          de nuevo generando llaves de Sandbox.
        </ErrorNotice>
      )}

      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <Stat
          label="Requests último mes"
          value={(stats?.requests ?? 0).toLocaleString("es-AR")}
          sub={ENVIRONMENT_LABEL[environment]}
        />
        <Stat
          label="Tasa de éxito"
          value={
            stats?.successRate != null ? `${String(stats.successRate).replace(".", ",")}%` : "—"
          }
          sub="últimos 30 días"
        />
        <Stat
          label="Latencia media"
          value={stats?.averageLatencyMs != null ? `${stats.averageLatencyMs} ms` : "—"}
          sub={stats?.p95LatencyMs != null ? `P95: ${stats.p95LatencyMs} ms` : "sin datos"}
        />
        <Stat
          label="Webhooks activos"
          value={String((portal?.webhooks ?? []).filter((w) => w.active).length)}
          sub={`${deliveries.filter((d) => d.status === "succeeded").length} OK · ${deliveries.filter((d) => d.status === "retrying").length} reintentando`}
        />
      </div>

      <div className="mb-6 grid gap-6 lg:grid-cols-[1fr_1fr]">
        <CredentialsCard
          environment={environment}
          status={status}
          apiKey={apiKey}
          isLoading={query.isPending}
          onSecret={setSecret}
          onRequestProduction={() => setProductionDialogOpen(true)}
        />
        <IntegrationStatusCard
          integration={integration}
          environment={environment}
          hasWebhook={!!webhook}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <EndpointsCard endpoints={portal?.endpoints ?? []} environment={environment} />
        <div className="space-y-6">
          <WebhookCard
            key={`${environment}-${webhook?.id ?? "new"}`}
            environment={environment}
            webhook={webhook}
            events={
              portal?.availableEvents.length
                ? portal.availableEvents
                : Object.keys(WEBHOOK_EVENT_LABEL)
            }
            deliveries={deliveries}
            enabled={access.canConfigureWebhooks}
            onSecret={(value) =>
              setSecret({ title: "Secreto del webhook", rows: [["Webhook secret", value]] })
            }
          />
          <RequestLogsCard logs={logs} />
        </div>
      </div>

      <SecretRevealModal secret={secret} onClose={() => setSecret(null)} />
      <ProductionRequestDialog
        open={productionDialogOpen}
        onClose={() => setProductionDialogOpen(false)}
      />
    </>
  );
}
