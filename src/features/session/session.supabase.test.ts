import { describe,expect,it } from "vitest";
import { toCurrentCustomer } from "./session.supabase";

const row = {
  legajo: "LPJ-30712345678",
  nombre: "Empresa Demo SA",
  nombre_fantasia: "Demo",
  correo: "demo@empresa.com",
  tipo_persona: "juridica",
  cuit: "30712345678",
  cuit_cuil: null,
  cbu: null,
  alias: "demo.mp",
};

describe("toCurrentCustomer", () => {
  it("traduce la fila y prefiere el nombre de fantasia", () => {
    expect(toCurrentCustomer(row)).toMatchObject({
      legajo: "LPJ-30712345678",
      displayName: "Demo",
      personType: "company",
      cuit: "30712345678",
    });
  });

  it("persona fisica usa el CUIL si no hay CUIT", () => {
    expect(
      toCurrentCustomer({
        ...row,
        tipo_persona: "fisica",
        cuit: null,
        cuit_cuil: "20123456789",
        nombre_fantasia: null,
      }),
    ).toMatchObject({
      personType: "individual",
      cuit: "20123456789",
      displayName: "Empresa Demo SA",
    });
  });

  it("un tipo de persona desconocido es un error contract", () => {
    expect(() => toCurrentCustomer({ ...row, tipo_persona: "otro" })).toThrow(
      expect.objectContaining({ kind: "contract" }),
    );
  });
});
