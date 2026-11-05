/*
 * API para desarrolladores del comercio: estado de la integracion, llaves, webhooks,
 * permisos por endpoint, uso y logs (RPC api_portal_estado).
 */

export type IntegrationStatus =
  | "pending_validation"
  | "sandbox"
  | "pending_production"
  | "production"
  | "suspended"
  | "revoked";

export type ApiEnvironment = "sandbox" | "production";

export type DeveloperIntegration = {
  id: string;
  status: IntegrationStatus;
  sandboxRateLimit: number;
  productionRateLimit: number;
  ipWhitelist: string[];
  productionRequestedAt: string | null;
  productionRequestNotes: string | null;
  approvedAt: string | null;
  suspensionReason: string | null;
  revocationReason: string | null;
  createdAt: string;
  lastChange: { at: string; from: string | null; to: string; note: string | null } | null;
};

export type DeveloperKey = {
  id: string;
  environment: ApiEnvironment;
  apiKey: string;
  secretLast4: string;
  createdAt: string;
  lastUsedAt: string | null;
};

export type DeveloperWebhook = {
  id: string;
  environment: ApiEnvironment;
  callbackUrl: string;
  events: string[];
  active: boolean;
  secretLast4: string;
  updatedAt: string;
};

export type AvailableEndpoint = {
  path: string;
  method: string;
  name: string;
  description: string | null;
  category: string | null;
  /** null = sin regla (se rechaza). */
  sandbox: boolean | null;
  production: boolean | null;
};

export type UsageStats = {
  requests: number;
  succeeded: number;
  successRate: number | null;
  averageLatencyMs: number | null;
  p95LatencyMs: number | null;
};

export type RequestLog = {
  environment: ApiEnvironment | null;
  method: string;
  path: string;
  status: number;
  latencyMs: number | null;
  errorCode: string | null;
  requestId: string | null;
  ip: string | null;
  createdAt: string;
};

export type DeliveryStatus = "pending" | "sending" | "succeeded" | "retrying" | "failed";

export type WebhookDelivery = {
  id: string;
  environment: ApiEnvironment;
  event: string;
  status: DeliveryStatus;
  attempt: number;
  httpStatus: number | null;
  error: string | null;
  latencyMs: number | null;
  isTest: boolean;
  nextRetryAt: string | null;
  createdAt: string;
};

export type DeveloperPortal = {
  /** null = el comercio todavia no genero llaves. */
  integration: DeveloperIntegration | null;
  keys: DeveloperKey[];
  webhooks: DeveloperWebhook[];
  endpoints: AvailableEndpoint[];
  stats: Partial<Record<ApiEnvironment, UsageStats>>;
  logs: RequestLog[];
  deliveries: WebhookDelivery[];
  availableEvents: string[];
};

/** Llaves recien generadas: la Secret Key se muestra UNA vez y no se guarda. */
export type GeneratedKeys = { apiKey: string; secretKey: string };

export type WebhookInput = {
  environment: ApiEnvironment;
  url: string;
  events: string[];
  active: boolean;
  rotateSecret?: boolean;
};

export type WebhookTestResult = {
  succeeded: boolean;
  httpStatus: number | null;
  error: string | null;
  latencyMs: number | null;
} | null;
