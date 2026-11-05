import { Activity,Circle } from "lucide-react";
import { paymentsApiUrl } from "@/infrastructure/http/backend-url";
import { Card } from "@/shared/ui/card";
import { formatShortDateTime,integrationChecklist } from "../developers.rules";
import type { ApiEnvironment,DeveloperIntegration } from "../developers.types";
import { AllowedIpsEditor } from "./allowed-ips-editor";

export function IntegrationStatusCard({
  integration,
  environment,
  hasWebhook,
}: {
  integration: DeveloperIntegration | null;
  environment: ApiEnvironment;
  hasWebhook: boolean;
}) {
  const status = integration?.status;
  const rateLimit =
    environment === "production"
      ? (integration?.productionRateLimit ?? 1000)
      : (integration?.sandboxRateLimit ?? 100);

  return (
    <Card>
      <h3 className="mb-4 flex items-center gap-2 font-semibold">
        <Activity size={16} /> Estado de la integración
      </h3>
      <div className="space-y-2.5">
        {integrationChecklist(status, hasWebhook).map(([step, done]) => (
          <div
            key={step}
            className="flex items-center justify-between border-b py-1.5 text-sm last:border-0"
          >
            <div className="flex items-center gap-2">
              <Circle
                size={8}
                className={
                  done ? "fill-emerald-500 text-emerald-500" : "fill-muted text-muted-foreground"
                }
              />
              <span>{step}</span>
            </div>
            <div className="text-xs text-muted-foreground">{done ? "Listo" : "Pendiente"}</div>
          </div>
        ))}
      </div>
      {status === "pending_production" && (
        <p className="mt-3 text-xs text-amber-700">
          Pediste el pase el {formatShortDateTime(integration?.productionRequestedAt)}. MoliPay lo
          está revisando; mientras tanto el Sandbox sigue funcionando.
        </p>
      )}
      {status === "sandbox" && integration?.lastChange?.note?.startsWith("Pase rechazado") && (
        <p className="mt-3 text-xs text-red-700">{integration.lastChange.note}</p>
      )}
      <div className="mt-4 space-y-0.5 text-xs text-muted-foreground">
        <div>
          Base URL: <code className="font-mono">{paymentsApiUrl()}/v1</code>
        </div>
        <div>Límite: {rateLimit} peticiones por minuto</div>
      </div>
      {integration && <AllowedIpsEditor ips={integration.ipWhitelist} />}
    </Card>
  );
}
