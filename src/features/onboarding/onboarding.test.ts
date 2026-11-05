import { describe, expect, it } from "vitest";
import { migrateDraftV0 } from "./onboarding.draft-migration";
import { customerName, isProvisionalCuit, normalizeCustomerStatus } from "./onboarding.rules";
import { companyDataSchema, personalDataSchema } from "./onboarding.schema";
import { toAccountType, toOnboardingProfile } from "./onboarding.supabase";

describe("migrateDraftV0", () => {
  it("traduce el borrador viejo sin perder datos", () => {
    const draft = migrateDraftV0({
      tipoCuenta: "juridica",
      registro: { nombre: "Ana", email: "ana@x.com" },
      datosEmpresa: { cuit: "30123456789", nombreLegal: "Acme SA" },
      kyc: { direccion: "Calle 1", cp: "1000" },
      emailValidado: true,
    });
    expect(draft.accountType).toBe("company");
    expect(draft.registration).toMatchObject({ firstName: "Ana", email: "ana@x.com" });
    expect(draft.companyData).toMatchObject({ cuit: "30123456789", legalName: "Acme SA" });
    expect(draft.address).toMatchObject({ line1: "Calle 1", postalCode: "1000" });
    expect(draft.emailVerified).toBe(true);
  });

  it("un borrador vacío queda sin tipo de cuenta", () => {
    expect(migrateDraftV0({}).accountType).toBeNull();
  });
});

describe("normalizeCustomerStatus", () => {
  it("acepta estados vigentes, traduce los viejos y lo desconocido es registrado", () => {
    expect(normalizeCustomerStatus(" Activado ")).toBe("activado");
    expect(normalizeCustomerStatus("activo")).toBe("activado");
    expect(normalizeCustomerStatus("rechazado")).toBe("deshabilitado");
    expect(normalizeCustomerStatus("otro")).toBe("registrado");
    expect(normalizeCustomerStatus(null)).toBe("registrado");
  });
});

describe("reglas del alta", () => {
  it("nombre: razón social en empresa, nombre y apellido en persona", () => {
    expect(customerName("company", { firstName: "Ana" }, "Acme SA")).toBe("Acme SA");
    expect(customerName("company", { firstName: "Ana" })).toBe("Ana");
    expect(customerName("individual", { firstName: "Ana", lastName: "Paz" })).toBe("Ana Paz");
  });

  it("detecta el CUIT provisorio", () => {
    expect(isProvisionalCuit("99000000001")).toBe(true);
    expect(isProvisionalCuit("30123456789")).toBe(false);
    expect(isProvisionalCuit(null)).toBe(false);
  });

  it("mapea la fila del cliente", () => {
    expect(toAccountType("juridica")).toBe("company");
    expect(toAccountType(null)).toBeNull();
    const profile = toOnboardingProfile({
      legajo: "L1",
      tipo_persona: "fisica",
      genero: "Femenino",
      cuit_cuil: "20123456789",
      ocupacion: null,
      origen_fondos: null,
      es_pep: null,
      cuit: null,
      fecha_inscripcion: null,
      tipo_sociedad: null,
      nombre_legal: null,
      nombre_fantasia: null,
      direccion: "Calle 1",
      direccion2: null,
      ciudad: null,
      provincia: null,
      cp: null,
    });
    expect(profile.accountType).toBe("individual");
    expect(profile.personal).toMatchObject({ gender: "Femenino", cuit: "20123456789" });
    expect(profile.address.line1).toBe("Calle 1");
  });
});

describe("schemas", () => {
  const personal = {
    firstName: "Ana",
    lastName: "Pérez",
    nationality: "Argentina",
    residenceCountry: "Argentina",
    documentType: "DNI",
    documentNumber: "12345678",
    gender: "Femenino",
    cuit: "20-12345678-6",
    occupation: "Otro",
    fundsOrigin: "Sueldo",
    isPep: false,
  };

  it("el CUIT acepta guiones pero exige 11 dígitos", () => {
    expect(personalDataSchema.safeParse(personal).success).toBe(true);
    expect(personalDataSchema.safeParse({ ...personal, cuit: "20-123" }).success).toBe(false);
    expect(personalDataSchema.safeParse({ ...personal, cuit: "20-12345678-99" }).success).toBe(
      false,
    );
  });

  it("la empresa exige todos sus datos", () => {
    const company = {
      cuit: "30123456781",
      identificationType: "CUIT",
      registrationDate: "2020-01-01",
      companyType: "Otro",
      legalName: "Acme SA",
      tradeName: "Acme",
    };
    expect(companyDataSchema.safeParse(company).success).toBe(true);
    expect(companyDataSchema.safeParse({ ...company, tradeName: " " }).success).toBe(false);
    expect(companyDataSchema.safeParse({ ...company, cuit: "30123456789" }).success).toBe(false);
  });
});
