import { z } from "zod";
import { onlyDigits } from "@/shared/lib/text";
import { requiredText } from "@/shared/validation/primitives";
import { isValidCuit } from "./onboarding.rules";

/** CUIT/CUIL: se escribe con o sin guiones; tienen que quedar 11 digitos. */
const cuitField = (requiredMessage: string, label: string) =>
  z
    .string()
    .trim()
    .min(1, requiredMessage)
    .superRefine((value, ctx) => {
      const digits = onlyDigits(value).length;
      if (digits > 11)
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Máximo 11 dígitos permitidos. Quitá los excedentes.",
        });
      else if (digits !== 11)
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `El ${label} debe tener exactamente 11 dígitos.`,
        });
      else if (!isValidCuit(value))
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `El ${label} no es válido. Revisá los dígitos.`,
        });
    });

export const personalDataSchema = z.object({
  firstName: requiredText("Ingresá tu nombre"),
  lastName: requiredText("Ingresá tu apellido"),
  nationality: requiredText("Seleccioná tu nacionalidad"),
  residenceCountry: requiredText("Seleccioná tu país de residencia"),
  documentType: requiredText("Seleccioná el tipo de documento"),
  documentNumber: requiredText("Ingresá el número de documento"),
  gender: requiredText("El género es requerido"),
  cuit: cuitField("Ingresá tu CUIT/CUIL", "CUIT/CUIL"),
  occupation: requiredText("Seleccioná una ocupación"),
  fundsOrigin: requiredText("Seleccioná el origen de fondos"),
  isPep: z.boolean(),
});
export type PersonalDataValues = z.output<typeof personalDataSchema>;

/** Campos de cada paso del asistente de datos personales (para validar paso a paso). */
export const PERSONAL_DATA_STEP_FIELDS: (keyof PersonalDataValues)[][] = [
  [
    "firstName",
    "lastName",
    "gender",
    "cuit",
    "nationality",
    "residenceCountry",
    "documentType",
    "documentNumber",
    "occupation",
  ],
  ["fundsOrigin"],
  ["isPep"],
];

export const companyDataSchema = z.object({
  cuit: cuitField("Requerido", "CUIT"),
  registrationDate: requiredText("Requerido"),
  companyType: requiredText("Requerido"),
  identificationType: requiredText("Requerido"),
  legalName: requiredText("Requerido"),
  tradeName: requiredText("Requerido"),
});
export type CompanyDataValues = z.output<typeof companyDataSchema>;

export const companyPersonSchema = z.object({
  firstName: requiredText("Requerido"),
  lastName: requiredText("Requerido"),
  taxId: cuitField("Requerido", "CUIT/CUIL"),
  nationality: requiredText("Requerido"),
  documentType: requiredText("Requerido"),
  documentNumber: requiredText("Requerido"),
  birthDate: requiredText("Requerido"),
  isPep: requiredText("Requerido"),
});
export type CompanyPersonValues = z.output<typeof companyPersonSchema>;

export const addressSchema = z.object({
  line1: requiredText("Requerido"),
  line2: z.string().trim(),
  city: requiredText("Requerido"),
  province: requiredText("Requerido"),
  postalCode: requiredText("Requerido"),
});
export type AddressValues = z.output<typeof addressSchema>;
