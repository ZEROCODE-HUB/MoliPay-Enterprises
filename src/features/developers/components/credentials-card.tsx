import { useState } from "react";
import { CheckCircle2,Code2,KeyRound,RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { userMessage } from "@/shared/lib/errors";
import { Badge } from "@/shared/ui/badge";
import { BtnOutline,BtnPrimary } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { useConfirm } from "@/shared/ui/confirm-provider";
import { useDeveloperActions } from "../developers.hooks";
import { environmentAccess,formatShortDateTime } from "../developers.rules";
import type { ApiEnvironment,DeveloperKey,IntegrationStatus } from "../developers.types";
import { CopyableField } from "./copyable-field";
import type { RevealedSecret } from "./secret-reveal-modal";

export function CredentialsCard({
  environment,
  status,
  apiKey,
  isLoading,
  onSecret,
  onRequestProduction,
}: {
  environment: ApiEnvironment;
  status: IntegrationStatus | undefined;
  apiKey: DeveloperKey | null;
  isLoading: boolean;
  onSecret: (secret: RevealedSecret) => void;
  onRequestProduction: () => void;
}) {
  const confirm = useConfirm();
  const { generateKeys } = useDeveloperActions();
  const [working, setWorking] = useState(false);
  const access = environmentAccess(status, environment);
  const isSandbox = environment === "sandbox";

  const generate = async () => {
    if (apiKey) {
      const ok = await confirm({
        title: "Rotar claves",
        message: "Se genera un par nuevo y el actual deja de funcionar al instante. ¿Continuar?",
        confirmLabel: "Rotar claves",
        variant: "danger",
      });
      if (!ok) return;
    }
    setWorking(true);
    try {
      const keys = await generateKeys(environment);
      onSecret({
        title: isSandbox ? "Llaves de Sandbox" : "Llaves de Producción",
        rows: [
          ["API Key (X-MoliPay-ApiKey)", keys.apiKey],
          ["Secret Key (firma HMAC)", keys.secretKey],
        ],
      });
    } catch (e) {
      toast.error(userMessage(e, "No se pudieron generar las llaves."));
    } finally {
      setWorking(false);
    }
  };

  return (
    <Card>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="flex items-center gap-2 font-semibold">
          <Code2 size={16} /> Credenciales
        </h3>
        <Badge tone={isSandbox ? "warn" : access.productionEnabled ? "success" : "neutral"}>
          {isSandbox ? "Sandbox" : "Producción"}
        </Badge>
      </div>
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Cargando…</p>
      ) : apiKey ? (
        <div className="space-y-3">
          <CopyableField label="API Key" value={apiKey.apiKey} />
          <CopyableField
            label="Secret Key"
            value={`mp_sec_••••••••••••••••${apiKey.secretLast4}`}
            masked
          />
          <div className="text-xs text-muted-foreground">
            Creada {formatShortDateTime(apiKey.createdAt)} · último uso{" "}
            {formatShortDateTime(apiKey.lastUsedAt)}
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          {isSandbox
            ? "Generá tus llaves de Sandbox para empezar a probar. Se crean en el momento y no mueven dinero real."
            : access.productionEnabled
              ? "Producción está habilitada. Generá tus llaves mp_live_ para operar con dinero real."
              : "Las llaves de Producción se habilitan cuando MoliPay aprueba tu pase. Primero probá en Sandbox."}
        </p>
      )}
      <div className="mt-5 flex flex-wrap gap-2">
        {access.canGenerateKeys && (
          <BtnOutline onClick={() => void generate()} disabled={working}>
            {apiKey ? <RefreshCw size={14} /> : <KeyRound size={14} />}{" "}
            {apiKey
              ? "Rotar claves"
              : isSandbox
                ? "Generar llaves de Sandbox"
                : "Generar llaves de Producción"}
          </BtnOutline>
        )}
        {access.canRequestProduction && (
          <BtnPrimary onClick={onRequestProduction} disabled={working}>
            Solicitar pase a producción
          </BtnPrimary>
        )}
      </div>
      <div className="mt-4 rounded bg-muted p-3 text-xs text-muted-foreground">
        <CheckCircle2 size={12} className="mr-1 inline text-emerald-600" />
        La Secret Key se muestra una sola vez al generarla. Si la perdés, rotá las claves.
        Recomendamos rotarlas cada 90 días.
      </div>
    </Card>
  );
}
