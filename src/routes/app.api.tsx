import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  RefreshCw,
  Copy,
  Webhook,
  BookOpen,
  CheckCircle2,
  Circle,
  Activity,
  Code2,
  KeyRound,
  Send,
  ShieldAlert,
  X,
} from "lucide-react";
import { PageHeader, Card, BtnPrimary, BtnOutline, Badge, Stat, Input, Label } from "@/components/portal-shell";
import {
  EVENTOS_LABEL,
  backendUrl,
  cargarEstadoApi,
  generarLlaves,
  guardarIps,
  guardarWebhook,
  probarWebhook,
  solicitarPase,
  type AmbienteApi,
  type EstadoIntegracion,
} from "@/lib/api-desarrolladores";

export const Route = createFileRoute("/app/api")({ component: Page });

const QK = ["api-desarrolladores"] as const;

const ESTADO_LABEL: Record<EstadoIntegracion, string> = {
  Pendiente_Validacion: "Pendiente de validación",
  Homologacion: "Sandbox",
  Pendiente_Pase_Produccion: "Pase a producción en revisión",
  Produccion: "Producción",
  Suspendido: "Suspendida",
  Revocado: "Revocada",
};

function tono(e: EstadoIntegracion | undefined): "neutral" | "success" | "warn" | "danger" {
  if (e === "Produccion") return "success";
  if (e === "Suspendido" || e === "Revocado") return "danger";
  if (e === "Pendiente_Pase_Produccion") return "warn";
  return "neutral";
}

function copiar(v: string) {
  void navigator.clipboard.writeText(v).then(
    () => toast.success("Copiado"),
    () => toast.error("No se pudo copiar"),
  );
}

function fechaHora(iso: string | null | undefined) {
  return iso ? new Date(iso).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" }) : "—";
}

function Page() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: QK, queryFn: cargarEstadoApi, refetchInterval: 30_000 });
  const [ambiente, setAmbiente] = useState<AmbienteApi>("Homologacion");
  const [secreto, setSecreto] = useState<{ titulo: string; filas: [string, string][] } | null>(null);
  const [paseAbierto, setPaseAbierto] = useState(false);
  const [notasPase, setNotasPase] = useState("");
  const [trabajando, setTrabajando] = useState(false);

  const d = q.data;
  const integ = d?.integracion ?? null;
  const estado = integ?.estado;
  const llave = d?.llaves.find((k) => k.ambiente === ambiente) ?? null;
  const stats = d?.stats[ambiente];
  const webhook = d?.webhooks.find((w) => w.ambiente === ambiente) ?? null;
  const logs = (d?.logs ?? []).filter((l) => l.ambiente === ambiente).slice(0, 10);
  const entregas = (d?.entregas ?? []).filter((e) => e.ambiente === ambiente).slice(0, 6);
  const prodHabilitada = estado === "Produccion";
  const bloqueada = estado === "Suspendido";

  const recargar = () => qc.invalidateQueries({ queryKey: QK });

  const generar = async () => {
    if (llave && !window.confirm("Se genera un par nuevo y el actual deja de funcionar al instante. ¿Continuar?")) return;
    setTrabajando(true);
    try {
      const r = await generarLlaves(ambiente);
      setSecreto({
        titulo: ambiente === "Produccion" ? "Llaves de Producción" : "Llaves de Sandbox",
        filas: [
          ["API Key (X-MoliPay-ApiKey)", r.api_key],
          ["Secret Key (firma HMAC)", r.secret_key],
        ],
      });
      void recargar();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setTrabajando(false);
    }
  };

  const pedirPase = async () => {
    setTrabajando(true);
    try {
      await solicitarPase(notasPase);
      toast.success("Solicitud enviada. Te avisamos cuando MoliPay la apruebe.");
      setPaseAbierto(false);
      setNotasPase("");
      void recargar();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setTrabajando(false);
    }
  };

  const okRecientes = logs.filter((l) => l.status < 400).length;

  return (
    <>
      <PageHeader
        title="API e integraciones"
        description="Credenciales, webhooks, sandbox y documentacion tecnica."
        action={
          <a href="#como-firmar">
            <BtnPrimary>
              <BookOpen size={14} /> Ver documentacion
            </BtnPrimary>
          </a>
        }
      />

      {/* Ambiente */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {(["Homologacion", "Produccion"] as const).map((a) => (
          <button
            key={a}
            type="button"
            onClick={() => setAmbiente(a)}
            className={`h-9 px-4 rounded-md border text-sm font-semibold ${
              ambiente === a ? "bg-primary text-primary-foreground border-primary" : "bg-card hover:bg-muted"
            }`}
          >
            {a === "Homologacion" ? "Sandbox (pruebas)" : "Producción"}
          </button>
        ))}
        {estado && <Badge tone={tono(estado)}>{ESTADO_LABEL[estado]}</Badge>}
      </div>

      {q.isError && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {(q.error as Error).message}
        </div>
      )}
      {bloqueada && (
        <div className="mb-4 flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          <ShieldAlert size={16} className="mt-0.5" />
          <span>
            Tu integración está suspendida: {integ?.motivo_suspension ?? "consultá a soporte"}. Todas las peticiones se rechazan
            con 403 hasta que MoliPay la reactive.
          </span>
        </div>
      )}
      {estado === "Revocado" && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          Tu integración fue revocada{integ?.motivo_revocacion ? `: ${integ.motivo_revocacion}` : ""}. Podés empezar de nuevo
          generando llaves de Sandbox.
        </div>
      )}

      <div className="grid md:grid-cols-4 gap-4 mb-6">
        <Stat
          label="Requests ultimo mes"
          value={(stats?.requests ?? 0).toLocaleString("es-AR")}
          sub={ambiente === "Homologacion" ? "Sandbox" : "Producción"}
        />
        <Stat
          label="Tasa de exito"
          value={stats?.tasa_exito != null ? `${String(stats.tasa_exito).replace(".", ",")}%` : "—"}
          sub="ultimos 30 dias"
        />
        <Stat
          label="Latencia media"
          value={stats?.latencia_media != null ? `${stats.latencia_media} ms` : "—"}
          sub={stats?.latencia_p95 != null ? `P95: ${stats.latencia_p95} ms` : "sin datos"}
        />
        <Stat
          label="Webhooks activos"
          value={String((d?.webhooks ?? []).filter((w) => w.activo).length)}
          sub={`${entregas.filter((e) => e.estado === "Exitoso").length} OK · ${entregas.filter((e) => e.estado === "Reintentando").length} reintentando`}
        />
      </div>

      <div className="grid lg:grid-cols-[1fr_1fr] gap-6 mb-6">
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold flex items-center gap-2">
              <Code2 size={16} /> Credenciales
            </h3>
            <Badge tone={ambiente === "Produccion" ? (prodHabilitada ? "success" : "neutral") : "warn"}>
              {ambiente === "Produccion" ? "Produccion" : "Sandbox"}
            </Badge>
          </div>
          {q.isLoading ? (
            <p className="text-sm text-muted-foreground">Cargando…</p>
          ) : llave ? (
            <div className="space-y-3">
              <Cred label="API Key" value={llave.api_key} />
              <Cred label="Secret Key" value={`mp_sec_••••••••••••••••${llave.secret_ultimos4}`} oculto />
              <div className="text-xs text-muted-foreground">
                Creada {fechaHora(llave.created_at)} · último uso {fechaHora(llave.ultimo_uso_at)}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              {ambiente === "Homologacion"
                ? "Generá tus llaves de Sandbox para empezar a probar. Se crean en el momento y no mueven dinero real."
                : prodHabilitada
                  ? "Producción está habilitada. Generá tus llaves mp_live_ para operar con dinero real."
                  : "Las llaves de Producción se habilitan cuando MoliPay aprueba tu pase. Primero probá en Sandbox."}
            </p>
          )}
          <div className="flex flex-wrap gap-2 mt-5">
            {(ambiente === "Homologacion" || prodHabilitada) && !bloqueada && (
              <BtnOutline onClick={() => void generar()} disabled={trabajando}>
                {llave ? <RefreshCw size={14} /> : <KeyRound size={14} />}{" "}
                {llave ? "Rotar claves" : ambiente === "Homologacion" ? "Generar llaves de Sandbox" : "Generar llaves de Producción"}
              </BtnOutline>
            )}
            {estado === "Homologacion" && (
              <BtnPrimary onClick={() => setPaseAbierto(true)} disabled={trabajando}>
                Solicitar pase a producción
              </BtnPrimary>
            )}
          </div>
          <div className="mt-4 p-3 bg-muted rounded text-xs text-muted-foreground">
            <CheckCircle2 size={12} className="inline mr-1 text-emerald-600" />
            La Secret Key se muestra una sola vez al generarla. Si la perdés, rotá las claves. Recomendamos rotarlas cada 90 dias.
          </div>
        </Card>

        <Card>
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Activity size={16} /> Estado de la integración
          </h3>
          <div className="space-y-2.5">
            {(
              [
                ["Sandbox activo", !!estado && estado !== "Pendiente_Validacion" && estado !== "Revocado"],
                ["Pase a producción solicitado", estado === "Pendiente_Pase_Produccion" || estado === "Produccion"],
                ["Producción habilitada", estado === "Produccion"],
                ["Webhook configurado", !!webhook],
              ] as [string, boolean][]
            ).map(([s, ok]) => (
              <div key={s} className="flex items-center justify-between text-sm py-1.5 border-b last:border-0">
                <div className="flex items-center gap-2">
                  <Circle size={8} className={ok ? "fill-emerald-500 text-emerald-500" : "fill-muted text-muted-foreground"} />
                  <span>{s}</span>
                </div>
                <div className="text-xs text-muted-foreground">{ok ? "Listo" : "Pendiente"}</div>
              </div>
            ))}
          </div>
          {estado === "Pendiente_Pase_Produccion" && (
            <p className="mt-3 text-xs text-amber-700">
              Pediste el pase el {fechaHora(integ?.pase_solicitado_at)}. MoliPay lo está revisando; mientras tanto el Sandbox sigue
              funcionando.
            </p>
          )}
          {estado === "Homologacion" && integ?.ultimo_cambio?.nota?.startsWith("Pase rechazado") && (
            <p className="mt-3 text-xs text-red-700">{integ.ultimo_cambio.nota}</p>
          )}
          <div className="mt-4 text-xs text-muted-foreground space-y-0.5">
            <div>
              Base URL: <code className="font-mono">{backendUrl()}/v1</code>
            </div>
            <div>
              Límite: {ambiente === "Produccion" ? (integ?.rate_limit_produccion ?? 1000) : (integ?.rate_limit_sandbox ?? 100)} peticiones
              por minuto
            </div>
          </div>
          {integ && <IpsEditor ips={integ.ip_whitelist} onGuardado={() => void recargar()} />}
        </Card>
      </div>

      <div className="grid lg:grid-cols-[1.2fr_1fr] gap-6">
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Endpoints disponibles</h3>
            <span className="text-xs text-muted-foreground">{ambiente === "Homologacion" ? "Sandbox" : "Producción"}</span>
          </div>
          <div className="divide-y">
            {(d?.endpoints ?? []).map((e) => {
              const permitido = ambiente === "Homologacion" ? e.sandbox : e.produccion;
              return (
                <div key={`${e.metodo} ${e.path}`} className={`flex items-center gap-3 py-2.5 ${permitido ? "" : "opacity-50"}`}>
                  <span
                    className={`inline-flex w-14 justify-center px-2 py-0.5 rounded text-[10px] font-bold ${
                      e.metodo === "GET"
                        ? "bg-blue-100 text-blue-700"
                        : e.metodo === "DELETE"
                          ? "bg-red-100 text-red-700"
                          : "bg-emerald-100 text-emerald-700"
                    }`}
                  >
                    {e.metodo}
                  </span>
                  <span className="font-mono text-xs flex-1">{e.path}</span>
                  <span className="text-xs text-muted-foreground hidden md:block">{e.nombre}</span>
                  <span className="text-[10px] w-20 text-right">
                    {permitido ? "Habilitado" : permitido === false ? "No habilitado" : "—"}
                  </span>
                </div>
              );
            })}
          </div>
          <div id="como-firmar" className="mt-5 rounded-md bg-muted p-3 text-xs space-y-1.5">
            <div className="font-semibold">Cómo llamar a la API</div>
            <div>
              Mandá tu Secret Key en un solo header y el body como JSON normal. El ambiente (Sandbox o Producción) lo define la
              llave.
            </div>
            <pre className="overflow-x-auto rounded bg-card p-2 font-mono text-[11px]">{`curl -X POST ${backendUrl()}/v1/checkout/links \\
  -H "Authorization: Bearer mp_sec_..." \\
  -H "Content-Type: application/json" \\
  -d '{"items":[{"nombre":"Cuota octubre","cantidad":1,"precio_unitario":15000}]}'`}</pre>
            <div className="text-muted-foreground">
              Opcional: si preferís firmar, mandá <code>X-MoliPay-ApiKey</code>, <code>X-MoliPay-Timestamp</code> y{" "}
              <code>X-MoliPay-Signature</code> = HMAC_SHA256_hex(secret_key, timestamp.METODO.ruta.body).
            </div>
            <div>
              Webhooks: verificá <code>X-MoliPay-Signature: t=…,v1=…</code> con <code>HMAC_SHA256_hex(webhook_secret, t + "." + body)</code>.
              Respondé 2xx en menos de 5 s; si no, reintentamos a 1 min, 5 min, 15 min, 1 h y 24 h.
            </div>
            <div>
              Pagos: tokenizá la tarjeta en el navegador con el SDK de Payway y mandá el token a <code>/v1/payments/execute</code>. La
              tarjeta nunca pasa por tu servidor ni por el nuestro.
            </div>
            <div>
              En Sandbox las respuestas son simuladas: un <code>payment_token</code> que empieza con <code>tok_rechazo</code> devuelve un
              rechazo, y los cobros simulados disparan tus webhooks de Sandbox.
            </div>
          </div>
        </Card>

        <div className="space-y-6">
          <WebhookCard
            key={`${ambiente}-${webhook?.id ?? "nuevo"}`}
            ambiente={ambiente}
            webhook={webhook}
            eventos={d?.eventos_disponibles ?? Object.keys(EVENTOS_LABEL)}
            entregas={entregas}
            habilitado={!!estado && !bloqueada && estado !== "Revocado" && (ambiente === "Homologacion" || prodHabilitada)}
            onSecreto={(s) => setSecreto({ titulo: "Secreto del webhook", filas: [["Webhook secret", s]] })}
            onGuardado={() => void recargar()}
          />

          <Card>
            <h3 className="font-semibold text-sm mb-3">ultimas requests</h3>
            {logs.length === 0 ? (
              <p className="text-xs text-muted-foreground">Todavía no hay peticiones en este ambiente.</p>
            ) : (
              <div className="divide-y text-xs">
                {logs.map((r, i) => (
                  <div key={i} className="flex items-center gap-2 py-2" title={r.codigo_error ?? r.request_id ?? ""}>
                    <span className={`w-12 text-center font-bold ${r.metodo === "GET" ? "text-blue-700" : "text-emerald-700"}`}>
                      {r.metodo}
                    </span>
                    <span className="font-mono flex-1 truncate">{r.ruta}</span>
                    <span className={`font-mono font-semibold ${r.status < 400 ? "text-emerald-700" : "text-red-700"}`}>{r.status}</span>
                    <span className="font-mono text-muted-foreground w-16 text-right">{r.latencia_ms ?? "—"} ms</span>
                    <span className="text-muted-foreground w-24 text-right">{fechaHora(r.created_at)}</span>
                  </div>
                ))}
              </div>
            )}
            {logs.length > 0 && (
              <div className="mt-2 text-[11px] text-muted-foreground">
                {okRecientes} de {logs.length} exitosas
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Secreto visible una sola vez */}
      {secreto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" />
          <div className="relative bg-card rounded-lg w-full max-w-lg p-6 shadow-xl">
            <h3 className="font-semibold mb-1">{secreto.titulo}</h3>
            <p className="text-sm text-red-700 mb-4">
              Guardala ahora en un lugar seguro: es la única vez que se muestra. MoliPay la guarda cifrada y no la puede recuperar.
            </p>
            <div className="space-y-3">
              {secreto.filas.map(([l, v]) => (
                <Cred key={l} label={l} value={v} />
              ))}
            </div>
            <div className="mt-5 flex justify-end">
              <BtnPrimary onClick={() => setSecreto(null)}>Ya la guardé</BtnPrimary>
            </div>
          </div>
        </div>
      )}

      {paseAbierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setPaseAbierto(false)} />
          <div className="relative bg-card rounded-lg w-full max-w-md p-6 shadow-xl">
            <button onClick={() => setPaseAbierto(false)} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground">
              <X size={16} />
            </button>
            <h3 className="font-semibold mb-1">Solicitar pase a producción</h3>
            <p className="text-sm text-muted-foreground mb-4">
              MoliPay revisa tu integración y habilita las llaves mp_live_ para operar con dinero real. Necesitás al menos una petición
              exitosa en Sandbox.
            </p>
            <Label>Contanos qué vas a integrar (opcional)</Label>
            <textarea
              className="w-full min-h-[90px] rounded-md border bg-background px-3 py-2 text-sm"
              value={notasPase}
              onChange={(e) => setNotasPase(e.target.value)}
              placeholder="Ej.: cobro de cuotas desde nuestro ERP con links de pago y consulta de saldos"
            />
            <div className="mt-4 flex justify-end gap-2">
              <BtnOutline onClick={() => setPaseAbierto(false)}>Cancelar</BtnOutline>
              <BtnPrimary onClick={() => void pedirPase()} disabled={trabajando}>
                Enviar solicitud
              </BtnPrimary>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function WebhookCard({
  ambiente,
  webhook,
  eventos,
  entregas,
  habilitado,
  onSecreto,
  onGuardado,
}: {
  ambiente: AmbienteApi;
  webhook: { url_callback: string; eventos_suscritos: string[]; activo: boolean; secret_ultimos4: string } | null;
  eventos: string[];
  entregas: { id: string; evento: string; estado: string; http: number | null; error: string | null; created_at: string; es_prueba: boolean }[];
  habilitado: boolean;
  onSecreto: (s: string) => void;
  onGuardado: () => void;
}) {
  const [url, setUrl] = useState(webhook?.url_callback ?? "");
  const [sel, setSel] = useState<string[]>(webhook?.eventos_suscritos ?? ["cobro.aprobado"]);
  const [activo, setActivo] = useState(webhook?.activo ?? true);
  const [trabajando, setTrabajando] = useState(false);
  useEffect(() => {
    setUrl(webhook?.url_callback ?? "");
    setSel(webhook?.eventos_suscritos ?? ["cobro.aprobado"]);
    setActivo(webhook?.activo ?? true);
  }, [webhook]);

  const guardar = async (rotar = false) => {
    setTrabajando(true);
    try {
      const r = await guardarWebhook({ ambiente, url: url.trim(), eventos: sel, activo, rotar_secreto: rotar });
      if (r.webhook_secret) onSecreto(r.webhook_secret);
      toast.success("Webhook guardado");
      onGuardado();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setTrabajando(false);
    }
  };
  const probar = async () => {
    setTrabajando(true);
    try {
      const r = await probarWebhook(ambiente);
      const e = r.entrega;
      if (e?.estado === "Exitoso") toast.success(`Tu servidor respondió ${e.respuesta_http_status} en ${e.latencia_ms} ms`);
      else toast.error(`La prueba falló: ${e?.ultimo_error ?? (e?.respuesta_http_status ? `HTTP ${e.respuesta_http_status}` : "sin respuesta")}`);
      onGuardado();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setTrabajando(false);
    }
  };

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold flex items-center gap-2">
          <Webhook size={16} /> Webhooks
        </h3>
        {webhook && <Badge tone={webhook.activo ? "success" : "neutral"}>{webhook.activo ? "Activo" : "Inactivo"}</Badge>}
      </div>
      {!habilitado ? (
        <p className="text-xs text-muted-foreground">
          {ambiente === "Produccion" ? "Disponible cuando Producción esté habilitada." : "Generá tus llaves de Sandbox para configurar webhooks."}
        </p>
      ) : (
        <div className="space-y-3">
          <div>
            <Label>URL de tu servidor (HTTPS)</Label>
            <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://api.tuempresa.com/webhooks/molipay" />
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {eventos.map((ev) => (
              <label key={ev} className="flex items-center gap-1.5 text-xs">
                <input
                  type="checkbox"
                  checked={sel.includes(ev)}
                  onChange={(e) => setSel(e.target.checked ? [...sel, ev] : sel.filter((x) => x !== ev))}
                />
                {EVENTOS_LABEL[ev] ?? ev}
              </label>
            ))}
          </div>
          <label className="flex items-center gap-1.5 text-xs">
            <input type="checkbox" checked={activo} onChange={(e) => setActivo(e.target.checked)} /> Activo
          </label>
          {webhook && <div className="text-[11px] text-muted-foreground">Secreto: whsec_••••{webhook.secret_ultimos4}</div>}
          <div className="flex flex-wrap gap-2">
            <BtnPrimary onClick={() => void guardar()} disabled={trabajando || !url.trim() || sel.length === 0}>
              Guardar
            </BtnPrimary>
            {webhook && (
              <>
                <BtnOutline onClick={() => void probar()} disabled={trabajando}>
                  <Send size={14} /> Enviar prueba
                </BtnOutline>
                <BtnOutline onClick={() => void guardar(true)} disabled={trabajando}>
                  <RefreshCw size={14} /> Rotar secreto
                </BtnOutline>
              </>
            )}
          </div>
        </div>
      )}
      {entregas.length > 0 && (
        <div className="divide-y mt-4">
          {entregas.map((w) => (
            <div key={w.id} className="py-2">
              <div className="flex justify-between items-center">
                <code className="text-xs truncate flex-1 pr-2">
                  {w.evento}
                  {w.es_prueba ? " (prueba)" : ""}
                </code>
                <Badge tone={w.estado === "Exitoso" ? "success" : w.estado === "Fallido" ? "danger" : "warn"}>{w.estado}</Badge>
              </div>
              <div className="text-xs text-muted-foreground mt-1 flex justify-between">
                <span>{w.http ? `HTTP ${w.http}` : (w.error ?? "")}</span>
                <span>{fechaHora(w.created_at)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function IpsEditor({ ips, onGuardado }: { ips: string[]; onGuardado: () => void }) {
  const [texto, setTexto] = useState(ips.join("\n"));
  const [abierto, setAbierto] = useState(false);
  useEffect(() => setTexto(ips.join("\n")), [ips]);
  const guardar = async () => {
    try {
      await guardarIps(texto.split(/[\s,;]+/).map((x) => x.trim()).filter(Boolean));
      toast.success("IPs guardadas");
      setAbierto(false);
      onGuardado();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };
  return (
    <div className="mt-4 border-t pt-3">
      <button type="button" className="text-xs font-semibold text-primary" onClick={() => setAbierto((v) => !v)}>
        IPs autorizadas: {ips.length ? ips.join(", ") : "cualquier IP"} · {abierto ? "cerrar" : "editar"}
      </button>
      {abierto && (
        <div className="mt-2 space-y-2">
          <textarea
            className="w-full min-h-[80px] rounded-md border bg-background px-3 py-2 font-mono text-xs"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder={"Vacío = cualquier IP\n203.0.113.10\n198.51.100.0/24"}
          />
          <BtnOutline className="h-8 px-3 text-xs" onClick={() => void guardar()}>
            Guardar IPs
          </BtnOutline>
        </div>
      )}
    </div>
  );
}

function Cred({ label, value, oculto }: { label: string; value: string; oculto?: boolean }) {
  return (
    <div>
      <Label>{label}</Label>
      <div className="flex items-center gap-2 border rounded-md bg-muted p-2">
        <code className="text-xs flex-1 truncate">{value}</code>
        {!oculto && (
          <button className="p-1 hover:opacity-70" onClick={() => copiar(value)} aria-label={`Copiar ${label}`}>
            <Copy size={14} />
          </button>
        )}
      </div>
    </div>
  );
}
