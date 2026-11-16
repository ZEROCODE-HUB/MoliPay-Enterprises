import { z } from "zod";
import { onlyDigits } from "@/shared/lib/text";
import { requiredText } from "@/shared/validation/primitives";
import { isValidCuit } from "./onboarding.rules";
import {
  PEP_CURRENT,
  PEP_YES,
  cuitMatchesDocument,
  isAdult,
  isCompanyCuit,
  isFutureDate,
  needsSpouse,
  postalCodeMatches,
} from "./company-onboarding.rules";

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

const optionalText = z.string().trim();
const emailField = requiredText("Requerido").pipe(z.string().email("Ingresá un correo válido"));
const phoneField = requiredText("Requerido").refine(
  (v) => /^\d{8,15}$/.test(onlyDigits(v)),
  "Ingresá el teléfono con código de área (8 a 15 dígitos)",
);

const issue = (ctx: z.RefinementCtx, path: string, message: string) =>
  ctx.addIssue({ code: z.ZodIssueCode.custom, path: [path], message });

/** Datos Generales de la empresa (F.0186). Mismas reglas que _company_profile_check. */
export const companyDataSchema = z
  .object({
    legalName: requiredText("Requerido"),
    tradeName: optionalText,
    cuit: cuitField("Requerido", "CUIT"),
    identificationType: requiredText("Requerido"),
    companyType: requiredText("Requerido"),
    activityCode: requiredText("Elegí la actividad principal"),
    activityDescription: optionalText,
    legalStreet: requiredText("Requerido"),
    legalLocality: requiredText("Requerido"),
    legalProvince: requiredText("Requerido"),
    legalCountry: requiredText("Requerido"),
    legalPostalCode: requiredText("Requerido"),
    phone: phoneField,
    email: emailField,
    registryBody: requiredText("Requerido"),
    registryProvince: requiredText("Requerido"),
    constitutionDate: requiredText("Requerido"),
    registryNumber: optionalText,
    registrationDate: optionalText,
    registryBook: optionalText,
    registryVolume: optionalText,
    registryFolio: optionalText,
    vatCondition: requiredText("Requerido"),
    incomeTaxCondition: requiredText("Requerido"),
    iibbNumber: requiredText("Requerido"),
  })
  .superRefine((v, ctx) => {
    if (isFutureDate(v.constitutionDate)) issue(ctx, "constitutionDate", "No puede ser futura");
    if (isFutureDate(v.registrationDate)) issue(ctx, "registrationDate", "No puede ser futura");
    if (v.constitutionDate && v.registrationDate && v.constitutionDate > v.registrationDate)
      issue(ctx, "registrationDate", "No puede ser anterior a la fecha de constitución");
    if (v.cuit && !isCompanyCuit(v.cuit))
      issue(ctx, "cuit", "El CUIT de una empresa empieza con 30, 33 o 34");
    if (
      v.legalCountry === "Argentina" &&
      v.legalPostalCode &&
      !postalCodeMatches(v.legalPostalCode, v.legalProvince)
    )
      issue(
        ctx,
        "legalPostalCode",
        "Código postal inválido para la provincia (ej. 1427 o C1427ABC)",
      );
  });
export type CompanyDataValues = z.output<typeof companyDataSchema>;

/** Campos de cada paso del alta de la empresa (para validar paso a paso). */
export const COMPANY_DATA_STEP_FIELDS: (keyof CompanyDataValues)[][] = [
  ["legalName", "tradeName", "cuit", "identificationType", "companyType", "activityCode"],
  [
    "legalStreet",
    "legalLocality",
    "legalProvince",
    "legalCountry",
    "legalPostalCode",
    "phone",
    "email",
  ],
  [
    "registryBody",
    "registryProvince",
    "constitutionDate",
    "registryNumber",
    "registrationDate",
    "registryBook",
    "registryVolume",
    "registryFolio",
    "vatCondition",
    "incomeTaxCondition",
    "iibbNumber",
  ],
];

/** Representante legal o apoderado (F.0186). Mismas reglas que _company_person_check. */
export const companyMemberSchema = z
  .object({
    firstName: requiredText("Requerido"),
    lastName: requiredText("Requerido"),
    gender: requiredText("Requerido"),
    documentType: requiredText("Requerido"),
    documentNumber: requiredText("Requerido"),
    nationality: requiredText("Requerido"),
    birthDate: requiredText("Requerido"),
    birthPlace: requiredText("Requerido"),
    address: requiredText("Requerido"),
    city: requiredText("Requerido"),
    province: requiredText("Requerido"),
    residenceCountry: requiredText("Requerido"),
    postalCode: requiredText("Requerido"),
    taxId: cuitField("Requerido", "CUIT"),
    email: emailField,
    phone: phoneField,
    position: requiredText("Requerido"),
    maritalStatus: requiredText("Requerido"),
    spouseName: optionalText,
    spouseNationality: optionalText,
    spouseGender: optionalText,
    spouseTaxId: optionalText,
    isPep: requiredText("Indicá si es o no persona expuesta políticamente"),
    pepPosition: optionalText,
    pepJurisdiction: optionalText,
    pepFrom: optionalText,
    pepTo: optionalText,
  })
  .superRefine((v, ctx) => {
    if (v.documentType === "DNI" && !cuitMatchesDocument(v.taxId, v.documentNumber))
      issue(ctx, "documentNumber", "No coincide con el CUIT/CUIL");
    if (v.birthDate && !isAdult(v.birthDate))
      issue(ctx, "birthDate", "Tiene que ser mayor de edad");
    if (
      v.residenceCountry === "Argentina" &&
      v.postalCode &&
      !postalCodeMatches(v.postalCode, v.province)
    )
      issue(ctx, "postalCode", "Código postal inválido para la provincia");
    if (needsSpouse(v.maritalStatus)) {
      if (!v.spouseName) issue(ctx, "spouseName", "Requerido");
      if (!v.spouseNationality) issue(ctx, "spouseNationality", "Requerido");
      if (!v.spouseGender) issue(ctx, "spouseGender", "Requerido");
      if (!isValidCuit(v.spouseTaxId)) issue(ctx, "spouseTaxId", "CUIT/CUIL inválido");
    }
    if (v.isPep === PEP_YES) {
      if (!v.pepPosition) issue(ctx, "pepPosition", "Requerido");
      if (!v.pepJurisdiction) issue(ctx, "pepJurisdiction", "Requerido");
      if (!v.pepFrom) issue(ctx, "pepFrom", "Requerido");
      if (!v.pepTo) issue(ctx, "pepTo", "Requerido");
      else if (v.pepFrom && v.pepTo !== PEP_CURRENT && v.pepTo < v.pepFrom)
        issue(ctx, "pepTo", "No puede ser anterior al año de inicio");
    }
  });
export type CompanyMemberValues = z.output<typeof companyMemberSchema>;

/** Bloques del formulario de persona (el representante los recorre como pasos). */
export const COMPANY_MEMBER_STEP_FIELDS: (keyof CompanyMemberValues)[][] = [
  [
    "firstName",
    "lastName",
    "gender",
    "nationality",
    "taxId",
    "documentType",
    "documentNumber",
    "birthDate",
    "birthPlace",
  ],
  ["address", "city", "province", "residenceCountry", "postalCode", "email", "phone"],
  ["position", "maritalStatus", "spouseName", "spouseNationality", "spouseGender", "spouseTaxId"],
  ["isPep", "pepPosition", "pepJurisdiction", "pepFrom", "pepTo"],
];

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
