import { paymentsApiUrl } from "@/infrastructure/http/backend-url";
import { Card } from "@/shared/ui/card";
import { ENVIRONMENT_LABEL } from "../developers.rules";
import type { ApiEnvironment,AvailableEndpoint } from "../developers.types";

const methodClass = (method: string) =>
  method === "GET"
    ? "bg-blue-100 text-blue-700"
    : method === "DELETE"
      ? "bg-red-100 text-red-700"
      : "bg-emerald-100 text-emerald-700";

/** Guia rapida de autenticacion, webhooks y pagos (ancla #como-firmar). */
function ApiQuickGuide() {
  const base = paymentsApiUrl();
  return (
    <div id="como-firmar" className="mt-5 space-y-1.5 rounded-md bg-muted p-3 text-xs">
      <div className="font-semibold">Cómo llamar a la API</div>
      <div>
        Mandá tu Secret Key en un solo header y el body como JSON normal. El ambiente (Sandbox o
        Producción) lo define la llave.
      </div>
      <pre className="overflow-x-auto rounded bg-card p-2 font-mono text-[11px]">{`curl -X POST ${base}/v1/checkout/links \\
  -H "Authorization: Bearer mp_sec_..." \\
  -H "Content-Type: application/json" \\
  -d '{"items":[{"nombre":"Cuota octubre","cantidad":1,"precio_unitario":15000}]}'`}</pre>
      <div className="text-muted-foreground">
        Opcional: si preferís firmar, mandá <code>X-MoliPay-ApiKey</code>,{" "}
        <code>X-MoliPay-Timestamp</code> y <code>X-MoliPay-Signature</code> =
        HMAC_SHA256_hex(secret_key, timestamp.METODO.ruta.body).
      </div>
      <div>
        Webhooks: verificá <code>X-MoliPay-Signature: t=…,v1=…</code> con{" "}
        <code>HMAC_SHA256_hex(webhook_secret, t + "." + body)</code>. Respondé 2xx en menos de 5 s;
        si no, reintentamos a 1 min, 5 min, 15 min, 1 h y 24 h.
      </div>
      <div>
        Pagos: tokenizá la tarjeta en el navegador con el SDK de Payway y mandá el token a{" "}
        <code>/v1/payments/execute</code>. La tarjeta nunca pasa por tu servidor ni por el nuestro.
      </div>
      <div>
        En Sandbox las respuestas son simuladas: un <code>payment_token</code> que empieza con{" "}
        <code>tok_rechazo</code> devuelve un rechazo, y los cobros simulados disparan tus webhooks
        de Sandbox.
      </div>
    </div>
  );
}

export function EndpointsCard({
  endpoints,
  environment,
}: {
  endpoints: AvailableEndpoint[];
  environment: ApiEnvironment;
}) {
  return (
    <Card>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-semibold">Endpoints disponibles</h3>
        <span className="text-xs text-muted-foreground">{ENVIRONMENT_LABEL[environment]}</span>
      </div>
      <div className="divide-y">
        {endpoints.map((e) => {
          const allowed = environment === "sandbox" ? e.sandbox : e.production;
          return (
            <div
              key={`${e.method} ${e.path}`}
              className={`flex items-center gap-3 py-2.5 ${allowed ? "" : "opacity-50"}`}
            >
              <span
                className={`inline-flex w-14 justify-center rounded px-2 py-0.5 text-[10px] font-bold ${methodClass(e.method)}`}
              >
                {e.method}
              </span>
              <span className="flex-1 font-mono text-xs">{e.path}</span>
              <span className="hidden text-xs text-muted-foreground md:block">{e.name}</span>
              <span className="w-20 text-right text-[10px]">
                {allowed ? "Habilitado" : allowed === false ? "No habilitado" : "—"}
              </span>
            </div>
          );
        })}
      </div>
      <ApiQuickGuide />
    </Card>
  );
}
