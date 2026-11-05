import { describe,expect,it } from "vitest";
import { environmentAccess,integrationChecklist,parseIpList } from "./developers.rules";
import { toDeveloperPortal } from "./developers.supabase";

const emptyPortal = {
  integracion: null,
  llaves: null,
  webhooks: null,
  endpoints: null,
  stats: null,
  logs: null,
  entregas: null,
  eventos_disponibles: null,
};

describe("toDeveloperPortal", () => {
  it("sin integración: listas vacías y sin estadísticas", () => {
    const p = toDeveloperPortal(emptyPortal);
    expect(p.integration).toBeNull();
    expect(p.keys).toEqual([]);
    expect(p.stats).toEqual({});
  });

  it("traduce estado, ambiente y estadísticas por ambiente", () => {
    const p = toDeveloperPortal({
      ...emptyPortal,
      integracion: {
        id: "i1",
        estado: "Homologacion",
        rate_limit_sandbox: 100,
        rate_limit_produccion: 1000,
        ip_whitelist: null,
        pase_solicitado_at: null,
        pase_notas: null,
        aprobado_at: null,
        motivo_suspension: null,
        motivo_revocacion: null,
        created_at: "2026-11-01",
        ultimo_cambio: null,
      },
      llaves: [
        {
          id: "k1",
          ambiente: "Produccion",
          api_key: "mp_live_x",
          secret_ultimos4: "abcd",
          created_at: "",
          ultimo_uso_at: null,
        },
      ],
      stats: {
        Homologacion: {
          requests: 5,
          exitosas: 4,
          tasa_exito: 80,
          latencia_media: 120,
          latencia_p95: 300,
        },
      },
    });
    expect(p.integration?.status).toBe("sandbox");
    expect(p.integration?.ipWhitelist).toEqual([]);
    expect(p.keys[0].environment).toBe("production");
    expect(p.stats.sandbox).toMatchObject({ requests: 5, successRate: 80 });
    expect(p.stats.production).toBeUndefined();
  });
});

describe("environmentAccess", () => {
  it("en Sandbox se generan llaves y se pide el pase; Producción espera la aprobación", () => {
    expect(environmentAccess("sandbox", "sandbox")).toMatchObject({
      canGenerateKeys: true,
      canRequestProduction: true,
    });
    expect(environmentAccess("sandbox", "production")).toMatchObject({
      canGenerateKeys: false,
      canConfigureWebhooks: false,
    });
    expect(environmentAccess("production", "production")).toMatchObject({
      canGenerateKeys: true,
      canConfigureWebhooks: true,
    });
  });

  it("suspendida: no genera llaves ni configura webhooks", () => {
    expect(environmentAccess("suspended", "sandbox")).toMatchObject({
      canGenerateKeys: false,
      canConfigureWebhooks: false,
    });
  });

  it("checklist y lista de IPs", () => {
    expect(integrationChecklist("pending_production", false).map(([, done]) => done)).toEqual([
      true,
      true,
      false,
      false,
    ]);
    expect(parseIpList("1.1.1.1, 2.2.2.2;3.3.3.3\n")).toEqual(["1.1.1.1", "2.2.2.2", "3.3.3.3"]);
  });
});
