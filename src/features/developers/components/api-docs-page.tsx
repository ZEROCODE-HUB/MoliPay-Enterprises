import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowLeft,
  BookOpen,
  FlaskConical,
  Lock,
  Rocket,
  Search,
  ShieldCheck,
  Store,
  Webhook,
} from "lucide-react";
import { paymentsApiUrl } from "@/infrastructure/http/backend-url";
import { Badge } from "@/shared/ui/badge";
import { Card } from "@/shared/ui/card";
import { PageHeader } from "@/shared/ui/page-header";
import { LoadingLines } from "@/shared/ui/table-skeleton";
import {
  ACCESS_ERRORS,
  DOC_ENDPOINTS,
  DOC_GROUPS,
  GUIDE_SECTIONS,
  SIGNATURE_EXAMPLE,
  WEBHOOK_EVENTS,
  WEBHOOK_PAYLOAD,
  WEBHOOK_VERIFY,
  type DocEndpoint,
  type DocField,
  type HttpMethod,
} from "../api-docs.content";
import { useDeveloperPortal } from "../developers.hooks";
import { STATUS_LABEL, isApiModuleEnabled, statusTone } from "../developers.rules";
import { CodeBlock, RichText } from "./api-docs-code";

/**
 * Documentacion de la API publica /v1. El contenido vive en api-docs.content.ts; se
 * habilita cuando MoliPay aprueba el acceso de la cuenta.
 */

const METHOD_CLS: Record<HttpMethod, string> = {
  GET: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300",
  POST: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  DELETE: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300",
};

const WEBHOOKS_SECTION = { id: "webhooks", label: "Webhooks" };

function MethodBadge({ method }: { method: HttpMethod }) {
  return (
    <span
      className={`inline-flex w-14 justify-center rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold ${METHOD_CLS[method]}`}
    >
      {method}
    </span>
  );
}

function curlExample(base: string, e: DocEndpoint) {
  const path = e.path.replace(":id", "<id>") + (e.exampleQuery ? `?${e.exampleQuery}` : "");
  const lines = [
    `curl -X ${e.method} "${base}${path}"`,
    `  -H "Authorization: Bearer $MOLIPAY_SECRET"`,
  ];
  if (e.example) {
    lines.push(`  -H "Content-Type: application/json"`);
    lines.push(`  -d '${e.example.replace(/\n\s*/g, " ")}'`);
  }
  return lines.join(" \\\n");
}

function nodeExample(base: string, e: DocEndpoint) {
  const path = e.path.replace(":id", "${id}") + (e.exampleQuery ? `?${e.exampleQuery}` : "");
  const body = e.example ? `,\n  body: JSON.stringify(${e.example.replace(/\n/g, "\n  ")})` : "";
  const headers = e.example
    ? `{\n    Authorization: \`Bearer \${process.env.MOLIPAY_SECRET}\`,\n    "Content-Type": "application/json",\n  }`
    : `{ Authorization: \`Bearer \${process.env.MOLIPAY_SECRET}\` }`;
  return `const res = await fetch(\`${base}${path}\`, {
  method: "${e.method}",
  headers: ${headers}${body},
});
const json = await res.json();
if (!json.ok) throw new Error(\`\${json.error.codigo}: \${json.error.mensaje}\`);
console.log(json.datos);`;
}

/** Seccion visible en pantalla, para resaltarla en el indice. */
function useActiveSection(ids: string[]) {
  const [active, setActive] = useState(ids[0] ?? "");
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((x) => x.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visible) setActive(visible.target.id);
      },
      { rootMargin: "-80px 0px -65% 0px" },
    );
    for (const id of ids) {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [ids]);
  return active;
}

function FieldsTable({ title, fields }: { title: string; fields: DocField[] }) {
  return (
    <div>
      <div className="mb-1.5 text-xs font-medium text-muted-foreground">{title}</div>
      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-xs">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-3 py-2 text-left font-medium">Campo</th>
              <th className="px-3 py-2 text-left font-medium">Tipo</th>
              <th className="px-3 py-2 text-left font-medium">Descripción</th>
            </tr>
          </thead>
          <tbody>
            {fields.map((f) => (
              <tr key={f.name} className="border-t">
                <td className="whitespace-nowrap px-3 py-2 align-top font-mono">
                  {f.name}
                  {f.required && (
                    <span className="ml-1.5 rounded bg-red-50 px-1 text-[10px] font-sans text-red-700 dark:bg-red-500/15 dark:text-red-300">
                      obligatorio
                    </span>
                  )}
                </td>
                <td className="whitespace-nowrap px-3 py-2 align-top text-muted-foreground">
                  {f.type}
                </td>
                <td className="px-3 py-2 align-top">
                  <RichText text={f.desc} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Section({
  id,
  title,
  icon,
  children,
}: {
  id: string;
  title: ReactNode;
  icon?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-20">
      <Card className="space-y-4">
        <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
          {icon}
          {title}
        </h2>
        {children}
      </Card>
    </section>
  );
}

function Note({ tone, children }: { tone: "info" | "warn"; children: ReactNode }) {
  const cls =
    tone === "warn"
      ? "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200"
      : "border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-200";
  return (
    <div className={`rounded-md border px-3 py-2 text-xs leading-relaxed ${cls}`}>{children}</div>
  );
}

function EndpointSection({ endpoint: e, base }: { endpoint: DocEndpoint; base: string }) {
  return (
    <section id={e.id} className="scroll-mt-20">
      <Card className="space-y-4">
        <div className="space-y-2">
          <h3 className="text-base font-semibold text-foreground">{e.title}</h3>
          <div className="flex flex-wrap items-center gap-2 rounded-md border bg-muted/40 px-2.5 py-1.5">
            <MethodBadge method={e.method} />
            <code className="break-all font-mono text-sm">{e.path}</code>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {e.needsMerchant && (
              <Badge tone="neutral">
                <Store size={11} className="mr-1 inline" /> Requiere un comercio
              </Badge>
            )}
            {e.onRequest && <Badge tone="warn">Producción: se habilita a pedido</Badge>}
          </div>
        </div>
        <p className="text-sm leading-relaxed">
          <RichText text={e.desc} />
        </p>
        {e.sandboxNote && (
          <Note tone="info">
            <FlaskConical size={12} className="mr-1 inline" />
            <RichText text={e.sandboxNote} />
          </Note>
        )}
        <div className="grid gap-4 xl:grid-cols-2">
          <div className="min-w-0 space-y-4">
            {e.params && <FieldsTable title="Parámetros de ruta" fields={e.params} />}
            {e.query && <FieldsTable title="Parámetros de consulta (query)" fields={e.query} />}
            {e.body && <FieldsTable title="Body (JSON)" fields={e.body} />}
            {!e.params && !e.query && !e.body && (
              <p className="text-xs text-muted-foreground">Sin parámetros.</p>
            )}
            {e.errors && (
              <div>
                <div className="mb-1.5 text-xs font-medium text-muted-foreground">
                  Errores propios
                </div>
                <ul className="space-y-1 text-xs">
                  {e.errors.map(([code, msg]) => (
                    <li key={code} className="flex gap-2">
                      <code className="whitespace-nowrap font-mono font-medium">{code}</code>
                      <span className="text-muted-foreground">
                        <RichText text={msg} />
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          <div className="min-w-0 space-y-3">
            <CodeBlock
              tabs={[
                { label: "cURL", code: curlExample(base, e) },
                { label: "Node.js", code: nodeExample(base, e) },
              ]}
            />
            <CodeBlock label="Respuesta" tabs={[{ label: "Respuesta", code: e.response }]} />
          </div>
        </div>
      </Card>
    </section>
  );
}

function DocsNav({
  active,
  filter,
  onFilter,
}: {
  active: string;
  filter: string;
  onFilter: (v: string) => void;
}) {
  const f = filter.trim().toLowerCase();
  const match = (text: string) => !f || text.toLowerCase().includes(f);
  const link = (id: string, label: ReactNode) => (
    <a
      href={`#${id}`}
      aria-current={active === id ? "location" : undefined}
      className={`flex items-center gap-2 rounded px-2 py-1 transition ${
        active === id
          ? "bg-primary/10 font-medium text-foreground"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      }`}
    >
      {label}
    </a>
  );
  return (
    <nav aria-label="Índice de la documentación" className="sticky top-20 space-y-4 text-sm">
      <label className="relative block">
        <Search
          size={13}
          className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
        />
        <input
          value={filter}
          onChange={(ev) => onFilter(ev.target.value)}
          placeholder="Buscar endpoint"
          className="h-8 w-full rounded-md border bg-background pl-8 pr-2 text-xs"
        />
      </label>
      <div>
        <div className="mb-1 px-2 text-[11px] font-medium text-muted-foreground">Guía</div>
        <ul className="space-y-0.5">
          {GUIDE_SECTIONS.filter((s) => match(s.label)).map((s) => (
            <li key={s.id}>{link(s.id, s.label)}</li>
          ))}
        </ul>
      </div>
      {DOC_GROUPS.map((g) => {
        const items = DOC_ENDPOINTS.filter(
          (e) => e.group === g.id && match(`${e.title} ${e.path} ${e.method}`),
        );
        if (!items.length) return null;
        return (
          <div key={g.id}>
            <div className="mb-1 px-2 text-[11px] font-medium text-muted-foreground">{g.label}</div>
            <ul className="space-y-0.5">
              {items.map((e) => (
                <li key={e.id}>
                  {link(
                    e.id,
                    <>
                      <span
                        className={`rounded px-1 font-mono text-[9px] font-semibold ${METHOD_CLS[e.method]}`}
                      >
                        {e.method}
                      </span>
                      <span className="truncate">{e.title}</span>
                    </>,
                  )}
                </li>
              ))}
            </ul>
          </div>
        );
      })}
      {match(WEBHOOKS_SECTION.label) && (
        <ul>
          <li>{link(WEBHOOKS_SECTION.id, WEBHOOKS_SECTION.label)}</li>
        </ul>
      )}
    </nav>
  );
}

function LockedDocs() {
  return (
    <Card className="mx-auto max-w-xl text-center">
      <Lock size={28} className="mx-auto text-muted-foreground" />
      <h2 className="mt-3 text-base font-semibold">La documentación técnica está bloqueada</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Se habilita cuando MoliPay aprueba el acceso de tu cuenta al módulo de APIs.
      </p>
      <Link
        to="/app/api-config"
        className="mt-4 inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90"
      >
        Ir a Configuración de APIs
      </Link>
    </Card>
  );
}

export function ApiDocsPage() {
  const base = paymentsApiUrl();
  const portal = useDeveloperPortal();
  const status = portal.data?.integration?.status;
  const [filter, setFilter] = useState("");
  const ids = useMemo(
    () => [
      ...GUIDE_SECTIONS.map((s) => s.id),
      ...DOC_ENDPOINTS.map((e) => e.id),
      WEBHOOKS_SECTION.id,
    ],
    [],
  );
  const active = useActiveSection(portal.isSuccess && isApiModuleEnabled(status) ? ids : []);

  const header = (
    <PageHeader
      title="Documentación de la API"
      description="Integrá tu ERP, CRM o software contable: cobros, links de pago, saldos, movimientos y transferencias"
      action={
        <Link
          to="/app/api"
          className="inline-flex h-10 items-center gap-2 rounded-md border bg-card px-4 text-sm font-medium hover:bg-muted"
        >
          <ArrowLeft size={14} /> API e integraciones
        </Link>
      }
    />
  );

  if (portal.isPending) {
    return (
      <>
        {header}
        <LoadingLines label="Cargando…" />
      </>
    );
  }
  // Si el estado no se pudo leer no se bloquea: la API valida igual cada credencial.
  if (portal.isSuccess && !isApiModuleEnabled(status)) {
    return (
      <>
        {header}
        <LockedDocs />
      </>
    );
  }

  return (
    <>
      {header}

      <Card className="mb-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0 space-y-1">
            <div className="flex items-center gap-2 text-sm font-medium">
              <BookOpen size={15} /> API REST v1 · JSON sobre HTTPS
              {status && <Badge tone={statusTone(status)}>{STATUS_LABEL[status]}</Badge>}
            </div>
            <div className="text-xs text-muted-foreground">
              URL base, igual para los dos ambientes:
            </div>
            <code className="block break-all font-mono text-sm">{base}</code>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:w-[420px]">
            <div className="rounded-md border px-3 py-2">
              <div className="flex items-center gap-1.5 text-xs font-medium">
                <FlaskConical size={12} /> Sandbox
              </div>
              <div className="mt-0.5 text-[11px] text-muted-foreground">
                Llaves <code className="font-mono">mp_test_</code> · respuestas simuladas
              </div>
            </div>
            <div className="rounded-md border px-3 py-2">
              <div className="flex items-center gap-1.5 text-xs font-medium">
                <Rocket size={12} /> Producción
              </div>
              <div className="mt-0.5 text-[11px] text-muted-foreground">
                Llaves <code className="font-mono">mp_live_</code> · dinero real
              </div>
            </div>
          </div>
        </div>
      </Card>

      <div className="mb-4 lg:hidden">
        <select
          aria-label="Ir a la sección"
          className="h-9 w-full rounded-md border bg-background px-2 text-sm"
          value={active}
          onChange={(ev) =>
            document.getElementById(ev.target.value)?.scrollIntoView({ behavior: "smooth" })
          }
        >
          {GUIDE_SECTIONS.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
          {DOC_ENDPOINTS.map((e) => (
            <option key={e.id} value={e.id}>
              {e.method} · {e.title}
            </option>
          ))}
          <option value={WEBHOOKS_SECTION.id}>{WEBHOOKS_SECTION.label}</option>
        </select>
      </div>

      <div className="grid gap-6 lg:grid-cols-[230px_minmax(0,1fr)]">
        <aside className="hidden lg:block">
          <DocsNav active={active} filter={filter} onFilter={setFilter} />
        </aside>

        <div className="min-w-0 space-y-4">
          <Section id="inicio" title="Inicio rápido" icon={<Rocket size={16} />}>
            <ol className="grid gap-3 md:grid-cols-3">
              {(
                [
                  [
                    "Generá tus llaves",
                    "En API e integraciones, generá las llaves de Sandbox y guardá la Secret Key: se muestra una sola vez.",
                  ],
                  [
                    "Probá en Sandbox",
                    "Las respuestas son de ejemplo y no se mueve dinero. Los cobros simulados disparan tu webhook.",
                  ],
                  [
                    "Pasá a Producción",
                    "Con al menos una petición exitosa, pedí el pase. MoliPay lo aprueba y generás las llaves mp_live_.",
                  ],
                ] as const
              ).map(([title, text], n) => (
                <li key={title} className="rounded-md border p-3">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[11px] text-primary-foreground">
                      {n + 1}
                    </span>
                    {title}
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{text}</p>
                </li>
              ))}
            </ol>
            <CodeBlock
              tabs={[
                {
                  label: "cURL",
                  code: `export MOLIPAY_SECRET="mp_sec_xxxxxxxx"\n\ncurl "${base}/v1/balances" \\\n  -H "Authorization: Bearer $MOLIPAY_SECRET"`,
                },
                {
                  label: "Node.js",
                  code: `const res = await fetch("${base}/v1/balances", {\n  headers: { Authorization: \`Bearer \${process.env.MOLIPAY_SECRET}\` },\n});\nconsole.log(await res.json());`,
                },
              ]}
            />
          </Section>

          <Section id="ambientes" title="Ambientes" icon={<FlaskConical size={16} />}>
            <p className="text-sm leading-relaxed">
              El ambiente lo define la credencial, no la URL. Con una llave de Sandbox todas las
              respuestas son simuladas y no se tocan saldos, ledger ni Payway; la respuesta trae{" "}
              <code className="font-mono">"sandbox": true</code> y el header{" "}
              <code className="font-mono">X-MoliPay-Ambiente</code>.
            </p>
            <Note tone="info">
              <Store size={12} className="mr-1 inline" />
              La credencial es de tu <b>cuenta</b> (cliente), no de un comercio. Consultas y
              transferencias usan tus subcuentas; los links y cobros usan tu comercio principal, o
              el que indiques con <code className="font-mono">comercio_id</code> al crear el link.
            </Note>
          </Section>

          <Section id="autenticacion" title="Autenticación" icon={<ShieldCheck size={16} />}>
            <p className="text-sm leading-relaxed">
              Mandá tu Secret Key en el header <code className="font-mono">Authorization</code>.
              Nunca la expongas en el navegador ni en una app móvil: usala solo desde tu servidor.
            </p>
            <CodeBlock
              label="Headers"
              tabs={[
                {
                  label: "Headers",
                  code: `Authorization: Bearer mp_sec_xxxxxxxx\nContent-Type: application/json`,
                },
              ]}
            />
            <details className="rounded-md border px-3 py-2 text-sm">
              <summary className="cursor-pointer font-medium">
                Alternativa: firma HMAC con timestamp
              </summary>
              <div className="mt-3 space-y-3">
                <p className="text-xs leading-relaxed text-muted-foreground">
                  En lugar de mandar el secreto, firmá cada pedido. Headers:{" "}
                  <code className="font-mono">X-MoliPay-ApiKey</code>,{" "}
                  <code className="font-mono">X-MoliPay-Timestamp</code> (unix en segundos) y{" "}
                  <code className="font-mono">X-MoliPay-Signature</code> = HMAC-SHA256 en hex de{" "}
                  <code className="font-mono">{"timestamp.MÉTODO.ruta.body"}</code>. El timestamp
                  tiene que estar cerca del reloj del servidor.
                </p>
                <CodeBlock tabs={[{ label: "Node.js", code: SIGNATURE_EXAMPLE }]} />
              </div>
            </details>
          </Section>

          <Section id="respuestas" title="Respuestas y errores" icon={<AlertTriangle size={16} />}>
            <div className="grid gap-3 md:grid-cols-2">
              <CodeBlock
                label="Éxito"
                tabs={[
                  {
                    label: "Éxito",
                    code: `{\n  "ok": true,\n  "datos": { … },\n  "sandbox": false,\n  "request_id": "…"\n}`,
                  },
                ]}
              />
              <CodeBlock
                label="Error"
                tabs={[
                  {
                    label: "Error",
                    code: `{\n  "ok": false,\n  "error": {\n    "codigo": "INVALID_REQUEST",\n    "mensaje": "Datos incompletos o con formato inválido",\n    "campos": [{ "campo": "monto", "problema": "…" }]\n  },\n  "request_id": "…"\n}`,
                  },
                ]}
              />
            </div>
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-xs">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">HTTP</th>
                    <th className="px-3 py-2 text-left font-medium">error.codigo</th>
                    <th className="px-3 py-2 text-left font-medium">Cuándo</th>
                  </tr>
                </thead>
                <tbody>
                  {ACCESS_ERRORS.map(([http, codes, when]) => (
                    <tr key={codes} className="border-t">
                      <td className="px-3 py-2 align-top font-mono">{http}</td>
                      <td className="px-3 py-2 align-top font-mono text-[11px]">{codes}</td>
                      <td className="px-3 py-2 align-top">
                        <RichText text={when} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-muted-foreground">
              Guardá el <code className="font-mono">request_id</code> (también viene en el header{" "}
              <code className="font-mono">X-Request-Id</code>): con él rastreamos cualquier pedido.
            </p>
          </Section>

          <Section id="limites" title="Límites y seguridad" icon={<Lock size={16} />}>
            <ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed">
              <li>
                Cupo por minuto por credencial (por defecto 100 en Sandbox y 1.000 en Producción).
                Cada respuesta trae <code className="font-mono">X-RateLimit-Limit</code> y{" "}
                <code className="font-mono">X-RateLimit-Remaining</code>; al superarlo recibís 429
                con <code className="font-mono">Retry-After</code>.
              </li>
              <li>
                Podés restringir las IPs de origen en API e integraciones. Con la lista vacía se
                acepta cualquier IP.
              </li>
              <li>Body máximo: 1 MB. Montos en pesos, con hasta 2 decimales.</li>
              <li>
                Cada endpoint se habilita por credencial y ambiente; lo que no está habilitado se
                rechaza con 403.
              </li>
              <li>
                Si sospechás que tu Secret Key se filtró, rotá las claves: la anterior deja de
                funcionar al instante.
              </li>
            </ul>
          </Section>

          {DOC_GROUPS.map((g) => (
            <div key={g.id} className="space-y-4">
              <h2 className="px-1 pt-2 text-sm font-semibold text-muted-foreground">{g.label}</h2>
              {DOC_ENDPOINTS.filter((e) => e.group === g.id).map((e) => (
                <EndpointSection key={e.id} endpoint={e} base={base} />
              ))}
            </div>
          ))}

          <Section id="webhooks" title="Webhooks" icon={<Webhook size={16} />}>
            <p className="text-sm leading-relaxed">
              Configurá una URL por ambiente en API e integraciones. Te avisamos con un{" "}
              <code className="font-mono">POST</code> en JSON cuando pasa algo en tu cuenta, en
              cualquiera de tus comercios:
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {WEBHOOK_EVENTS.map(([ev, d]) => (
                <div key={ev} className="rounded-md border px-3 py-2">
                  <code className="font-mono text-xs font-medium">{ev}</code>
                  <div className="text-xs text-muted-foreground">{d}</div>
                </div>
              ))}
            </div>
            <div className="grid gap-3 xl:grid-cols-2">
              <CodeBlock
                label="Headers"
                tabs={[
                  {
                    label: "Headers",
                    code: `X-MoliPay-Event: cobro.aprobado\nX-MoliPay-Delivery: <id de la entrega>\nX-MoliPay-Timestamp: 1764079380\nX-MoliPay-Signature: t=1764079380,v1=<hex>`,
                  },
                ]}
              />
              <CodeBlock label="Body" tabs={[{ label: "Body", code: WEBHOOK_PAYLOAD }]} />
            </div>
            <p className="text-sm leading-relaxed">
              Verificá la firma antes de procesar: <code className="font-mono">v1</code> =
              HMAC-SHA256(webhook_secret, <code className="font-mono">{"t.body"}</code>) en hex,
              calculado sobre el body crudo.
            </p>
            <CodeBlock tabs={[{ label: "Node.js", code: WEBHOOK_VERIFY }]} />
            <ul className="list-disc space-y-1 pl-5 text-xs leading-relaxed text-muted-foreground">
              <li>Respondé 2xx en menos de 5 segundos y procesá en segundo plano.</li>
              <li>
                Si no, reintentamos a 1 min, 5 min, 15 min, 1 h y 24 h; después la entrega queda
                fallida.
              </li>
              <li>
                Puede llegar más de una vez: usá{" "}
                <code className="font-mono">X-MoliPay-Delivery</code> para no procesarla dos veces.
              </li>
            </ul>
          </Section>
        </div>
      </div>
    </>
  );
}
