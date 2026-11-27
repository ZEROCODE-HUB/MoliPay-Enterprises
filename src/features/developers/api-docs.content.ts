/*
 * Contenido de la documentacion de la API publica /v1 (molipay-back/src/routes/v1.ts y
 * middleware/api-auth.ts). Si cambia un endpoint en el backend, se cambia aca.
 * En los textos, lo que va entre `comillas invertidas` se muestra como codigo.
 */

export type DocField = { name: string; type: string; required?: boolean; desc: string };

export type HttpMethod = "GET" | "POST" | "DELETE";

export type DocEndpoint = {
  id: string;
  group: DocGroupId;
  method: HttpMethod;
  path: string;
  title: string;
  desc: string;
  /** Requiere que la cuenta tenga un comercio (cobros con tarjeta y links). */
  needsMerchant?: boolean;
  /** Endpoint deshabilitado por defecto en Produccion: lo habilita MoliPay a pedido. */
  onRequest?: boolean;
  sandboxNote?: string;
  params?: DocField[];
  query?: DocField[];
  body?: DocField[];
  /** Query string del ejemplo (sin el "?"). */
  exampleQuery?: string;
  /** Body del ejemplo (JSON). */
  example?: string;
  response: string;
  errors?: [string, string][];
};

export type DocGroupId = "queries" | "links" | "payments" | "transfers" | "chargebacks";

export const DOC_GROUPS: { id: DocGroupId; label: string }[] = [
  { id: "queries", label: "Saldos y movimientos" },
  { id: "links", label: "Links de pago" },
  { id: "payments", label: "Cobros con tarjeta" },
  { id: "transfers", label: "Transferencias" },
  { id: "chargebacks", label: "Contracargos" },
];

/** Secciones fijas de la guia, antes de los endpoints. */
export const GUIDE_SECTIONS: { id: string; label: string }[] = [
  { id: "inicio", label: "Inicio rápido" },
  { id: "ambientes", label: "Ambientes" },
  { id: "autenticacion", label: "Autenticación" },
  { id: "respuestas", label: "Respuestas y errores" },
  { id: "limites", label: "Límites y seguridad" },
];

const ID_PARAM: DocField = { name: "id", type: "UUID", required: true, desc: "Id del recurso." };

export const DOC_ENDPOINTS: DocEndpoint[] = [
  {
    id: "balances",
    group: "queries",
    method: "GET",
    path: "/v1/balances",
    title: "Saldos de subcuentas",
    desc: "Lista las subcuentas de tu cuenta con su CVU y saldo. El `subcuenta_id` es el origen de las transferencias.",
    response: `{
  "ok": true,
  "datos": [
    {
      "subcuenta_id": "6f1c2a9e-1234-4b5c-9d8e-0a1b2c3d4e5f",
      "nombre": "Operativa",
      "tipo": "Operativa",
      "estado": "Activa",
      "cvu": "0000003100000000000001",
      "moneda": "ARS",
      "saldo_disponible": 150000,
      "saldo_retenido": 0
    }
  ],
  "sandbox": false,
  "request_id": "…"
}`,
  },
  {
    id: "transactions",
    group: "queries",
    method: "GET",
    path: "/v1/transactions",
    title: "Listar movimientos",
    desc: "Movimientos de tu cuenta, del más nuevo al más viejo. Para la página siguiente, mandá en `antes` el valor de `siguiente`; cuando viene `null` no hay más.",
    query: [
      { name: "limite", type: "entero (1 a 100)", desc: "Cantidad por página. Por defecto 50." },
      { name: "desde", type: "fecha ISO", desc: "Movimientos desde esta fecha (inclusive)." },
      { name: "hasta", type: "fecha ISO", desc: "Movimientos hasta esta fecha (inclusive)." },
      {
        name: "tipo",
        type: "texto",
        desc: "Filtra por tipo, por ejemplo `tarjeta` o `transferencia`.",
      },
      {
        name: "antes",
        type: "fecha ISO",
        desc: "Paginación: el valor de `siguiente` de la respuesta anterior.",
      },
    ],
    exampleQuery: "limite=20&desde=2026-11-01T00:00:00-03:00",
    response: `{
  "ok": true,
  "datos": {
    "movimientos": [
      {
        "id": "0b7e…", "id_txn": "PAYWAY-123", "tipo": "tarjeta",
        "fecha": "2026-11-25T14:03:00Z", "estado": "APROBADO",
        "monto": 12500, "comision": 0, "impuesto": 0,
        "bandera": "Visa", "cuotas": 1, "site_transaction_id": "ORD-2026-000123",
        "subcuenta_id": null, "cbu_cvu": null
      }
    ],
    "siguiente": "2026-11-20T10:00:00Z"
  },
  "sandbox": false,
  "request_id": "…"
}`,
  },
  {
    id: "transaction",
    group: "queries",
    method: "GET",
    path: "/v1/transactions/:id",
    title: "Obtener un movimiento",
    desc: "Busca un movimiento por su `id` (UUID) o por su `id_txn`.",
    params: [
      { name: "id", type: "UUID o id_txn", required: true, desc: "Movimiento a consultar." },
    ],
    response: `{
  "ok": true,
  "datos": { "id": "0b7e…", "id_txn": "PAYWAY-123", "tipo": "tarjeta", "estado": "APROBADO",
             "monto": 12500, "comision": 0, "impuesto": 0, … },
  "sandbox": false,
  "request_id": "…"
}`,
    errors: [["404 NOT_FOUND", "El movimiento no existe o no es de tu cuenta."]],
  },
  {
    id: "links-list",
    group: "links",
    method: "GET",
    path: "/v1/checkout/links",
    title: "Listar links de pago",
    desc: "Los últimos links de pago de tu cuenta, de todos tus comercios. Cada link trae el `comercio_id` que lo emitió.",
    sandboxNote: "En Sandbox devuelve una lista vacía.",
    query: [{ name: "limite", type: "entero (1 a 100)", desc: "Cantidad. Por defecto 50." }],
    exampleQuery: "limite=10",
    response: `{
  "ok": true,
  "datos": [
    { "id": "9a1d…", "codigo": "LP-AB12CD", "url": "https://pay.molipay.com.ar/p/LP-AB12CD",
      "comercio_id": "3c2f…", "monto": 15000, "estado": "Activo", "referencia": "FACT-0034",
      "expira_en": null, "pagos_parciales": false, "vistas": 4, "pagos": 1,
      "created_at": "2026-11-25T14:03:00Z" }
  ],
  "sandbox": false,
  "request_id": "…"
}`,
  },
  {
    id: "links-create",
    group: "links",
    method: "POST",
    path: "/v1/checkout/links",
    title: "Crear link de pago",
    desc: "Crea un link con uno o más ítems. El monto es la suma de cantidad × precio unitario. Si tu cuenta tiene varios comercios, elegí cuál cobra con `comercio_id`; si no lo mandás, se usa el principal.",
    needsMerchant: true,
    sandboxNote: "En Sandbox devuelve un link de prueba que no se puede pagar.",
    body: [
      { name: "items", type: "array (1 a 50)", required: true, desc: "Ítems a cobrar." },
      { name: "items[].nombre", type: "texto (1 a 200)", required: true, desc: "Concepto." },
      { name: "items[].cantidad", type: "entero (1 a 10.000)", required: true, desc: "Cantidad." },
      {
        name: "items[].precio_unitario",
        type: "número > 0",
        required: true,
        desc: "Precio, hasta 2 decimales.",
      },
      {
        name: "comercio_id",
        type: "UUID",
        desc: "Comercio que emite el link. Tiene que ser de tu cuenta.",
      },
      {
        name: "referencia",
        type: "texto (máx. 120)",
        desc: "Tu referencia interna (factura, orden…).",
      },
      { name: "notas", type: "texto (máx. 500)", desc: "Observaciones." },
      { name: "expira_en", type: "fecha ISO con zona", desc: "Vencimiento. Tiene que ser futura." },
      {
        name: "pagos_parciales",
        type: "booleano",
        desc: "Permite pagar el total en varias partes.",
      },
    ],
    example: `{
  "items": [{ "nombre": "Cuota noviembre", "cantidad": 1, "precio_unitario": 15000 }],
  "referencia": "FACT-0034",
  "expira_en": "2026-12-31T23:59:59-03:00"
}`,
    response: `{
  "ok": true,
  "datos": { "id": "9a1d…", "codigo": "LP-AB12CD", "url": "https://pay.molipay.com.ar/p/LP-AB12CD",
             "monto": 15000, "estado": "Activo", "referencia": "FACT-0034",
             "expira_en": "2026-12-31T23:59:59-03:00", "pagos_parciales": false, "items": [ … ] },
  "sandbox": false,
  "request_id": "…"
}`,
    errors: [
      ["404 MERCHANT_NOT_FOUND", "El `comercio_id` no es de tu cuenta."],
      ["409 NO_MERCHANT", "Tu cuenta no tiene comercios habilitados para cobrar."],
      ["422 UNPROCESSABLE", "Ítems inválidos o vencimiento en el pasado."],
    ],
  },
  {
    id: "links-cancel",
    group: "links",
    method: "DELETE",
    path: "/v1/checkout/links/:id",
    title: "Anular link de pago",
    desc: "Anula un link de tu cuenta. Desde ese momento ya no se puede pagar.",
    params: [ID_PARAM],
    response: `{ "ok": true, "datos": { "id": "9a1d…", "estado": "Cancelado" }, "sandbox": false, "request_id": "…" }`,
    errors: [["404 NOT_FOUND", "El link no existe o no es de tu cuenta."]],
  },
  {
    id: "payments",
    group: "payments",
    method: "POST",
    path: "/v1/payments/execute",
    title: "Cobrar un link con tarjeta",
    desc: "Cobra un link con un `payment_token` generado en el navegador con el SDK de Payway: los datos de la tarjeta nunca pasan por tu servidor ni por el nuestro. El monto lo define el link; `amount` solo aplica a links con pagos parciales.",
    needsMerchant: true,
    sandboxNote:
      "En Sandbox, un `payment_token` que empieza con `tok_rechazo` simula un rechazo; cualquier otro, un cobro aprobado. Los dos disparan el webhook de Sandbox.",
    body: [
      { name: "link_codigo", type: "texto", required: true, desc: "Código del link (`LP-…`)." },
      {
        name: "payment_token",
        type: "texto (8 a 512)",
        required: true,
        desc: "Token del SDK de Payway.",
      },
      { name: "bin", type: "6 dígitos", required: true, desc: "Primeros 6 dígitos de la tarjeta." },
      {
        name: "site_transaction_id",
        type: "texto (8 a 40)",
        required: true,
        desc: "Id único de tu operación. Evita cobros duplicados.",
      },
      {
        name: "cardholder.name",
        type: "texto (2 a 120)",
        required: true,
        desc: "Titular de la tarjeta.",
      },
      { name: "cardholder.email", type: "email", required: true, desc: "Email del titular." },
      {
        name: "cardholder.identification",
        type: "objeto",
        desc: "`type`: dni, cuil, cuit o pass; `number`: 5 a 32 caracteres.",
      },
      { name: "bandera_id", type: "UUID", desc: "Bandera elegida por el comprador." },
      { name: "installments", type: "entero (1 a 24)", desc: "Cuotas. Por defecto 1." },
      {
        name: "amount",
        type: "número > 0",
        desc: "Monto a cobrar, solo en links con pagos parciales.",
      },
    ],
    example: `{
  "link_codigo": "LP-AB12CD",
  "payment_token": "<token del SDK de Payway>",
  "bin": "450799",
  "installments": 1,
  "site_transaction_id": "ORD-2026-000123",
  "cardholder": {
    "name": "Juan Pérez",
    "email": "juan@mail.com",
    "identification": { "type": "dni", "number": "30123456" }
  }
}`,
    response: `{
  "ok": true,
  "datos": { "pago_id": "pay_…", "estado": "approved", "monto": 15000, "cuotas": 1,
             "site_transaction_id": "ORD-2026-000123", "ticket": "000123",
             "card_authorization_code": "TEST01" },
  "sandbox": false,
  "request_id": "…"
}`,
    errors: [
      ["402", "El pago fue rechazado (`estado`: rejected)."],
      ["404 LINK_NOT_FOUND", "El link no existe, está vencido o no es de tu cuenta."],
    ],
  },
  {
    id: "transfers",
    group: "transfers",
    method: "POST",
    path: "/v1/transfers/outbound",
    title: "Transferencia saliente",
    desc: "Transfiere desde una de tus subcuentas a un CBU o CVU, con las mismas reglas que el portal: saldo, límites, comisiones y controles de seguridad. Mueve fondos reales.",
    onRequest: true,
    sandboxNote: "En Sandbox responde una transferencia aprobada sin mover dinero.",
    body: [
      {
        name: "subcuenta_id",
        type: "UUID",
        required: true,
        desc: "Subcuenta de origen (sale de `/v1/balances`).",
      },
      { name: "cbu_cvu", type: "22 dígitos", required: true, desc: "Cuenta destino." },
      {
        name: "monto",
        type: "número",
        required: true,
        desc: "Mayor a 0, hasta 1.000.000.000, máximo 2 decimales.",
      },
      { name: "concepto", type: "texto (máx. 100)", desc: "Concepto de la transferencia." },
    ],
    example: `{
  "subcuenta_id": "6f1c2a9e-1234-4b5c-9d8e-0a1b2c3d4e5f",
  "cbu_cvu": "0000003100012345678901",
  "monto": 15000.50,
  "concepto": "Pago proveedor"
}`,
    response: `{
  "ok": true,
  "datos": { "ok": true, "id_txn": "EXT-…", "estado": "APROBADO", "monto": 15000.5,
             "comision": 0, "impuesto": 0, "total_debitado": 15000.5 },
  "sandbox": false,
  "request_id": "…"
}`,
    errors: [
      ["403 ENDPOINT_NOT_ALLOWED", "No está habilitada para tu credencial. Pedila a MoliPay."],
      [
        "422 TRANSFER_REJECTED",
        "Rechazada (saldo insuficiente, límites…). El motivo viene en el mensaje.",
      ],
    ],
  },
  {
    id: "chargebacks",
    group: "chargebacks",
    method: "GET",
    path: "/v1/chargebacks",
    title: "Listar contracargos",
    desc: "Los últimos 100 contracargos de tus comercios y su estado de recupero.",
    sandboxNote: "En Sandbox devuelve un contracargo de ejemplo.",
    response: `{
  "ok": true,
  "datos": [
    { "id": "5e0a…", "importe": 4000, "estado": "Abierto", "estado_recupero": "Retención programada",
      "marca": "Visa", "motivo": "Desconocimiento de compra", "site_transaction_id": "ORD-2026-000123",
      "fecha_venta": "2026-11-22T10:00:00Z", "fecha_limite": null, "pendiente_recuperar": 0,
      "created_at": "2026-11-25T14:03:00Z" }
  ],
  "sandbox": false,
  "request_id": "…"
}`,
  },
  {
    id: "chargeback-evidence",
    group: "chargebacks",
    method: "POST",
    path: "/v1/chargebacks/:id",
    title: "Enviar evidencia",
    desc: "Agrega tu descargo a un contracargo abierto o en mediación. Cada envío se suma al anterior con fecha y hora.",
    params: [ID_PARAM],
    body: [{ name: "evidencia", type: "texto (10 a 5.000)", required: true, desc: "Tu descargo." }],
    example: `{ "evidencia": "El producto fue entregado el 20/11 con firma del comprador." }`,
    response: `{ "ok": true, "datos": { "id": "5e0a…", "estado": "Abierto", "evidencia_recibida": true }, "sandbox": false, "request_id": "…" }`,
    errors: [["404 NOT_FOUND", "El contracargo no existe, ya está cerrado o no es de tu cuenta."]],
  },
];

/** Errores de autenticacion y acceso: los devuelve cualquier endpoint. */
export const ACCESS_ERRORS: [string, string, string][] = [
  [
    "400",
    "INVALID_JSON · INVALID_REQUEST",
    "Body o parámetros inválidos. `error.campos` dice qué falla.",
  ],
  [
    "401",
    "MISSING_CREDENTIALS · INVALID_SECRET · INVALID_SIGNATURE",
    "Falta la credencial, es inválida o la firma no coincide.",
  ],
  ["401", "TIMESTAMP_OUT_OF_RANGE", "Con firma: el timestamp está lejos del reloj del servidor."],
  [
    "403",
    "PENDING_VALIDATION · PRODUCTION_NOT_ENABLED",
    "La credencial todavía no está aprobada para ese ambiente.",
  ],
  ["403", "SUSPENDED · REVOKED", "Tu acceso está suspendido o fue revocado."],
  ["403", "IP_NOT_ALLOWED", "La IP de origen no está en tu lista de IPs permitidas."],
  [
    "403",
    "ENDPOINT_NOT_ALLOWED · ENDPOINT_DISABLED",
    "El endpoint no está habilitado para tu credencial.",
  ],
  [
    "404",
    "ENDPOINT_NOT_FOUND · NOT_FOUND",
    "La ruta o el recurso no existen, o no son de tu cuenta.",
  ],
  ["405", "METHOD_NOT_ALLOWED", "El método HTTP no se acepta en esa ruta."],
  ["413", "PAYLOAD_TOO_LARGE", "El body supera 1 MB."],
  ["422", "UNPROCESSABLE", "Una regla de negocio rechazó la operación."],
  ["429", "RATE_LIMITED", "Superaste el cupo por minuto. Esperá lo que indica `Retry-After`."],
  ["500", "INTERNAL", "Error nuestro. Reintentá y, si sigue, escribinos con el `request_id`."],
];

export const WEBHOOK_EVENTS: [string, string][] = [
  ["cobro.aprobado", "Se aprobó un cobro de un link."],
  ["cobro.rechazado", "Se rechazó un cobro de un link."],
  ["lote.acreditado", "Se acreditó una liquidación en tu cuenta."],
  ["transferencia.acreditada", "Entró una transferencia a tu cuenta."],
  ["contracargo.notificado", "Llegó un contracargo."],
  ["contracargo.resuelto", "Se resolvió un contracargo."],
];

export const WEBHOOK_PAYLOAD = `{
  "id": "evt_…",
  "evento": "cobro.aprobado",
  "ambiente": "Produccion",
  "creado": "2026-11-25T14:03:00Z",
  "comercio_id": "3c2f…",
  "datos": { "pago_id": "…", "link_id": "…", "monto": 15000, "estado": "Aprobado",
             "site_transaction_id": "ORD-2026-000123", "cuotas": 1, "referencia": "FACT-0034" }
}`;

export const WEBHOOK_VERIFY = `import crypto from "node:crypto";

// rawBody: el body tal como llegó (string), antes de parsear el JSON.
export function verificarWebhook(rawBody, signatureHeader, secret) {
  const partes = Object.fromEntries(
    String(signatureHeader ?? "").split(",").map((p) => p.trim().split("=")),
  );
  if (!partes.t || !partes.v1) return false;
  // Rechazá envíos viejos (5 minutos) para evitar reenvíos.
  if (Math.abs(Date.now() / 1000 - Number(partes.t)) > 300) return false;
  const esperado = crypto
    .createHmac("sha256", secret)
    .update(\`\${partes.t}.\${rawBody}\`)
    .digest("hex");
  const a = Buffer.from(partes.v1, "hex");
  const b = Buffer.from(esperado, "hex");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}`;

export const SIGNATURE_EXAMPLE = `import crypto from "node:crypto";

const ts = Math.floor(Date.now() / 1000).toString();
const metodo = "POST";
const ruta = "/v1/checkout/links";          // path + query, tal cual se envía
const body = JSON.stringify({ items: [ … ] }); // el mismo string que mandás
const firma = crypto
  .createHmac("sha256", process.env.MOLIPAY_SECRET)
  .update(\`\${ts}.\${metodo}.\${ruta}.\${body}\`)
  .digest("hex");

// Headers: X-MoliPay-ApiKey, X-MoliPay-Timestamp: ts, X-MoliPay-Signature: firma`;
