import { useState } from "react";
import { Controller } from "react-hook-form";
import { RefreshCw,Send,Webhook } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { applyServerErrors } from "@/shared/forms/apply-server-errors";
import { FieldError } from "@/shared/forms/field-error";
import { useZodForm } from "@/shared/forms/use-zod-form";
import { userMessage } from "@/shared/lib/errors";
import { Badge } from "@/shared/ui/badge";
import { BtnOutline,BtnPrimary } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { Input,Label } from "@/shared/ui/form-controls";
import { useDeveloperActions } from "../developers.hooks";
import {
DEFAULT_WEBHOOK_EVENTS,
DELIVERY_STATUS_LABEL,
WEBHOOK_EVENT_LABEL,
deliveryTone,
formatShortDateTime,
} from "../developers.rules";
import type { ApiEnvironment,DeveloperWebhook,WebhookDelivery } from "../developers.types";

const webhookSchema = z.object({
  url: z
    .string()
    .trim()
    .min(1, "Ingresá la URL de tu servidor.")
    .url("Ingresá una URL válida.")
    .refine((u) => u.startsWith("https://"), "La URL tiene que ser HTTPS."),
  events: z.array(z.string()).min(1, "Elegí al menos un evento."),
  active: z.boolean(),
});

/**
 * Webhook del ambiente. Quien lo usa le pone `key` por ambiente + webhook, asi el
 * formulario arranca con lo guardado al cambiar de ambiente o despues de crearlo.
 */
export function WebhookCard({
  environment,
  webhook,
  events,
  deliveries,
  enabled,
  onSecret,
}: {
  environment: ApiEnvironment;
  webhook: DeveloperWebhook | null;
  events: string[];
  deliveries: WebhookDelivery[];
  enabled: boolean;
  onSecret: (secret: string) => void;
}) {
  const { saveWebhook, testWebhook } = useDeveloperActions();
  const [busy, setBusy] = useState(false);
  const form = useZodForm(webhookSchema, {
    defaultValues: {
      url: webhook?.callbackUrl ?? "",
      events: webhook?.events ?? DEFAULT_WEBHOOK_EVENTS,
      active: webhook?.active ?? true,
    },
  });
  const { errors, isSubmitting } = form.formState;

  const save = (rotateSecret: boolean) =>
    form.handleSubmit(async (values) => {
      try {
        const { secret } = await saveWebhook({ environment, ...values, rotateSecret });
        if (secret) onSecret(secret);
        toast.success("Webhook guardado");
      } catch (e) {
        applyServerErrors(form, e);
      }
    })();

  const sendTest = async () => {
    setBusy(true);
    try {
      const r = await testWebhook(environment);
      if (r?.succeeded) toast.success(`Tu servidor respondió ${r.httpStatus} en ${r.latencyMs} ms`);
      else
        toast.error(
          `La prueba falló: ${r?.error ?? (r?.httpStatus ? `HTTP ${r.httpStatus}` : "sin respuesta")}`,
        );
    } catch (e) {
      toast.error(userMessage(e, "No se pudo enviar la prueba."));
    } finally {
      setBusy(false);
    }
  };

  const working = busy || isSubmitting;

  return (
    <Card>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="flex items-center gap-2 font-semibold">
          <Webhook size={16} /> Webhooks
        </h3>
        {webhook && (
          <Badge tone={webhook.active ? "success" : "neutral"}>
            {webhook.active ? "Activo" : "Inactivo"}
          </Badge>
        )}
      </div>
      {!enabled ? (
        <p className="text-xs text-muted-foreground">
          {environment === "production"
            ? "Disponible cuando Producción esté habilitada."
            : "Generá tus llaves de Sandbox para configurar webhooks."}
        </p>
      ) : (
        <form
          className="space-y-3"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            void save(false);
          }}
        >
          <div>
            <Label htmlFor={`webhook-url-${environment}`}>URL de tu servidor (HTTPS)</Label>
            <Input
              id={`webhook-url-${environment}`}
              placeholder="https://api.tuempresa.com/webhooks/molipay"
              {...form.register("url")}
            />
            <FieldError message={errors.url?.message} />
          </div>
          <Controller
            control={form.control}
            name="events"
            render={({ field, fieldState }) => (
              <div>
                <div className="grid grid-cols-2 gap-1.5">
                  {events.map((ev) => (
                    <label key={ev} className="flex items-center gap-1.5 text-xs">
                      <input
                        type="checkbox"
                        checked={field.value.includes(ev)}
                        onChange={(e) =>
                          field.onChange(
                            e.target.checked
                              ? [...field.value, ev]
                              : field.value.filter((x) => x !== ev),
                          )
                        }
                      />
                      {WEBHOOK_EVENT_LABEL[ev] ?? ev}
                    </label>
                  ))}
                </div>
                <FieldError message={fieldState.error?.message} />
              </div>
            )}
          />
          <label className="flex items-center gap-1.5 text-xs">
            <input type="checkbox" {...form.register("active")} /> Activo
          </label>
          {webhook && (
            <div className="text-[11px] text-muted-foreground">
              Secreto: whsec_••••{webhook.secretLast4}
            </div>
          )}
          {errors.root?.server && (
            <p className="text-xs text-red-600">{errors.root.server.message}</p>
          )}
          <div className="flex flex-wrap gap-2">
            <BtnPrimary type="submit" disabled={working}>
              Guardar
            </BtnPrimary>
            {webhook && (
              <>
                <BtnOutline type="button" onClick={() => void sendTest()} disabled={working}>
                  <Send size={14} /> Enviar prueba
                </BtnOutline>
                <BtnOutline type="button" onClick={() => void save(true)} disabled={working}>
                  <RefreshCw size={14} /> Rotar secreto
                </BtnOutline>
              </>
            )}
          </div>
        </form>
      )}
      {deliveries.length > 0 && (
        <div className="mt-4 divide-y">
          {deliveries.map((d) => (
            <div key={d.id} className="py-2">
              <div className="flex items-center justify-between">
                <code className="flex-1 truncate pr-2 text-xs">
                  {d.event}
                  {d.isTest ? " (prueba)" : ""}
                </code>
                <Badge tone={deliveryTone(d.status)}>{DELIVERY_STATUS_LABEL[d.status]}</Badge>
              </div>
              <div className="mt-1 flex justify-between text-xs text-muted-foreground">
                <span>{d.httpStatus ? `HTTP ${d.httpStatus}` : (d.error ?? "")}</span>
                <span>{formatShortDateTime(d.createdAt)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
