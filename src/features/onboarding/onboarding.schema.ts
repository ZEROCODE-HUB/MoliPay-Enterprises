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

export type CrossIssue = { path: string; message: string };

/**
 * Reglas que cruzan campos de la empresa (las mismas que _company_profile_check).
 * Se evaluan aunque falten campos de otros pasos: zod solo corre superRefine cuando todo
 * el objeto es valido, y asi estas reglas recien saltaban al enviar (y las rechazaba la base).
 */
export function companyDataIssues(v: Partial<Record<string, string>>): CrossIssue[] {
  const out: CrossIssue[] = [];
  if (isFutureDate(v.constitutionDate ?? ""))
    out.push({ path: "constitutionDate", message: "No puede ser futura" });
  if (isFutureDate(v.registrationDate ?? ""))
    out.push({ path: "registrationDate", message: "No puede ser futura" });
  if (v.constitutionDate && v.registrationDate && v.constitutionDate > v.registrationDate)
    out.push({
      path: "registrationDate",
      message: "No puede ser anterior a la fecha de constitución",
    });
  if (v.cuit && onlyDigits(v.cuit).length === 11 && !isCompanyCuit(v.cuit))
    out.push({ path: "cuit", message: "El CUIT de una empresa empieza con 30, 33 o 34" });
  if (
    v.legalCountry === "Argentina" &&
    v.legalPostalCode &&
    v.legalProvince &&
    !postalCodeMatches(v.legalPostalCode, v.legalProvince)
  )
    out.push({
      path: "legalPostalCode",
      message: "Código postal inválido para la provincia (ej. 1427 o C1427ABC)",
    });
  return out;
}

/** Reglas que cruzan campos del representante o apoderado (las de _company_person_check). */
export function companyMemberIssues(v: Partial<Record<string, string>>): CrossIssue[] {
  const out: CrossIssue[] = [];
  if (
    v.documentType === "DNI" &&
    v.taxId &&
    v.documentNumber &&
    onlyDigits(v.taxId).length === 11 &&
    !cuitMatchesDocument(v.taxId, v.documentNumber)
  )
    out.push({ path: "documentNumber", message: "No coincide con el CUIT/CUIL" });
  if (v.birthDate && !isAdult(v.birthDate))
    out.push({ path: "birthDate", message: "Tiene que ser mayor de edad" });
  if (
    v.residenceCountry === "Argentina" &&
    v.postalCode &&
    v.province &&
    !postalCodeMatches(v.postalCode, v.province)
  )
    out.push({ path: "postalCode", message: "Código postal inválido para la provincia" });
  if (needsSpouse(v.maritalStatus)) {
    if (!v.spouseName) out.push({ path: "spouseName", message: "Requerido" });
    if (!v.spouseNationality) out.push({ path: "spouseNationality", message: "Requerido" });
    if (!v.spouseGender) out.push({ path: "spouseGender", message: "Requerido" });
    if (!isValidCuit(v.spouseTaxId ?? ""))
      out.push({ path: "spouseTaxId", message: "CUIT/CUIL inválido" });
  }
  if (v.isPep === PEP_YES) {
    if (!v.pepPosition) out.push({ path: "pepPosition", message: "Requerido" });
    if (!v.pepJurisdiction) out.push({ path: "pepJurisdiction", message: "Requerido" });
    if (!v.pepFrom) out.push({ path: "pepFrom", message: "Requerido" });
    if (!v.pepTo) out.push({ path: "pepTo", message: "Requerido" });
    else if (v.pepFrom && v.pepTo !== PEP_CURRENT && v.pepTo < v.pepFrom)
      out.push({ path: "pepTo", message: "No puede ser anterior al año de inicio" });
  }
  return out;
}

/** Campos de los pasos 0..step (las reglas cruzadas se muestran apenas se completan). */
export const fieldsUpTo = <K extends string>(steps: K[][], step: number): K[] =>
  steps.slice(0, step + 1).flat();

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
    for (const i of companyDataIssues(v)) issue(ctx, i.path, i.message);
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
    for (const i of companyMemberIssues(v)) issue(ctx, i.path, i.message);
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
