import { describe,expect,it } from "vitest";
import { postLoginDestination } from "./auth.rules";

const access = (
  status: string | null,
  onboardingComplete: boolean | null = null,
  hasOnboardingEvidence = false,
) => ({
  status,
  onboardingComplete,
  hasOnboardingEvidence,
});

describe("postLoginDestination", () => {
  it("activo entra al portal", () => {
    expect(postLoginDestination(access("activado"))).toBe("/app");
    expect(postLoginDestination(access("activo"))).toBe("/app");
  });

  it("sin cliente, o registrado sin nada enviado, va al alta", () => {
    expect(postLoginDestination(access(null))).toBe("/onboarding/datos-personales");
    expect(postLoginDestination(access("registrado", false))).toBe("/onboarding/datos-personales");
  });

  it("registrado que ya envio, pendiente o deshabilitado van a la pantalla de estado", () => {
    expect(postLoginDestination(access("registrado", false, true))).toBe("/onboarding/en-proceso");
    expect(postLoginDestination(access("registrado", true))).toBe("/onboarding/en-proceso");
    expect(postLoginDestination(access("pendiente_verificacion"))).toBe("/onboarding/en-proceso");
    expect(postLoginDestination(access("deshabilitado"))).toBe("/onboarding/en-proceso");
  });

  it("si no se pudo leer el estado, pantalla de estado", () => {
    expect(postLoginDestination(null)).toBe("/onboarding/en-proceso");
  });
});
