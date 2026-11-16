import { onlyDigits } from "@/shared/lib/text";
import { COUNTRIES, OptionLabel } from "./onboarding.rules";
import type { CompanyData, CompanyPersonData } from "./onboarding.types";

/*
 * Alta de persona juridica: Datos Generales y Representantes/Apoderados del
 * F.0186. Los catalogos son los valores que valida la base
 * (20261106190000_onboarding_pj_datos_generales.sql).
 */

// --- Catalogos -------------------------------------------------------------------

/** Jurisdicciones (tabla ar_provinces): codigo ISO 3166-2:AR = letra del CPA. */
export const PROVINCE_CATALOG = [
  { code: "C", name: "CABA" },
  { code: "B", name: "Buenos Aires" },
  { code: "K", name: "Catamarca" },
  { code: "H", name: "Chaco" },
  { code: "U", name: "Chubut" },
  { code: "X", name: "Córdoba" },
  { code: "W", name: "Corrientes" },
  { code: "E", name: "Entre Ríos" },
  { code: "P", name: "Formosa" },
  { code: "Y", name: "Jujuy" },
  { code: "L", name: "La Pampa" },
  { code: "F", name: "La Rioja" },
  { code: "M", name: "Mendoza" },
  { code: "N", name: "Misiones" },
  { code: "Q", name: "Neuquén" },
  { code: "R", name: "Río Negro" },
  { code: "A", name: "Salta" },
  { code: "J", name: "San Juan" },
  { code: "D", name: "San Luis" },
  { code: "Z", name: "Santa Cruz" },
  { code: "S", name: "Santa Fe" },
  { code: "G", name: "Santiago del Estero" },
  { code: "V", name: "Tierra del Fuego" },
  { code: "T", name: "Tucumán" },
] as const;

export const CABA = "C";
export const CABA_LOCALITY = "Ciudad Autónoma de Buenos Aires";
export const PROVINCE_NAMES = PROVINCE_CATALOG.map((p) => p.name);
export const provinceCode = (name: string) => PROVINCE_CATALOG.find((p) => p.name === name)?.code;
export const provinceName = (code: string | null | undefined) =>
  PROVINCE_CATALOG.find((p) => p.code === code)?.name ?? "";

/** Los 4 digitos de un codigo postal: "1427" o del CPA "C1427ABC". */
export function postalDigits(postalCode: string): string {
  const cp = postalCode.trim().toUpperCase();
  if (/^\d{4}$/.test(cp)) return cp;
  return /^[A-Z]\d{4}[A-Z]{3}$/.test(cp) ? cp.slice(1, 5) : "";
}

/** CABA usa los codigos 1000 a 1499. */
export const isCabaPostal = (digits: string) =>
  !!digits && Number(digits) >= 1000 && Number(digits) <= 1499;

/** Lugar de Nac.: provincia argentina o pais. */
export const BIRTH_PLACES = [
  ...PROVINCE_CATALOG.map((p) => p.name),
  ...Object.keys(COUNTRIES).filter((c) => c !== "Argentina"),
];

/** Sexo como figura en el DNI: etiqueta -> valor de la base (F / M / X). */
export const SEX_OPTIONS: Record<string, string> = { Femenino: "F", Masculino: "M", X: "X" };

export const MARITAL_STATUSES: Record<string, string> = {
  "Soltero/a": "soltero",
  "Casado/a": "casado",
  "Unión convivencial": "union_convivencial",
  "Divorciado/a": "divorciado",
  "Separado/a": "separado",
  "Viudo/a": "viudo",
};
const WITH_SPOUSE = new Set(["casado", "union_convivencial"]);
export const needsSpouse = (maritalLabel: string | undefined) =>
  WITH_SPOUSE.has(MARITAL_STATUSES[maritalLabel ?? ""] ?? "");

// --- Declaracion PEP (Res. UIF 35/2023) --------------------------------------------

export const PEP_YES = OptionLabel.yes;
export const PEP_NO = OptionLabel.no;

/** Cargo/Función o afinidad: el cargo, o el vinculo con una persona PEP. */
const PEP_AFFINITY: Record<string, string> = {
  "Cónyuge o conviviente de una persona PEP": "spouse",
  "Familiar de una persona PEP": "relative",
  "Allegado/a cercano/a de una persona PEP": "close_associate",
};
export const PEP_POSITIONS = [
  "Funcionario/a de los poderes Ejecutivo, Legislativo o Judicial",
  "Legislador/a",
  "Juez/a, fiscal o defensor/a",
  "Integrante de un organismo de control o regulación",
  "Directivo/a de una empresa o entidad del Estado",
  "Embajador/a o cónsul",
  "Alto mando de las Fuerzas Armadas o de Seguridad",
  "Autoridad de un partido político",
  "Autoridad de un sindicato o de una obra social",
  "Funcionario/a de un organismo internacional",
  ...Object.keys(PEP_AFFINITY),
];

/** Ejercicio de cargos sucesivos y jurisdicción. */
export const PEP_JURISDICTIONS = [
  "Nacional",
  "Provincial",
  "Ciudad Autónoma de Buenos Aires",
  "Municipal",
  "Extranjera",
  "Organismo internacional",
];

/** Vigencia del ejercicio: años desde 1983, o "Actualidad". */
const THIS_YEAR = new Date().getFullYear();
export const PEP_YEARS = Array.from({ length: THIS_YEAR - 1982 }, (_, i) => String(THIS_YEAR - i));
export const PEP_CURRENT = "Actualidad";

// --- Datos fiscales e inscripcion ------------------------------------------------

export const VAT_CONDITIONS: Record<string, string> = {
  "Responsable inscripto": "responsable_inscripto",
  Exento: "exento",
  "No alcanzado": "no_alcanzado",
};

export const INCOME_TAX_CONDITIONS: Record<string, string> = {
  Inscripto: "inscripto",
  Exento: "exento",
  "No alcanzado": "no_alcanzado",
};

/** Inscripta en. IGJ inscribe en CABA y DPPJ en Buenos Aires. */
export const REGISTRY_BODIES: Record<string, string> = {
  IGJ: "IGJ",
  DPPJ: "DPPJ",
  "Registro Público de la provincia": "REGISTRO_PUBLICO",
  INAES: "INAES",
};
/**
 * Organismo y lugar de inscripcion que corresponden al domicilio legal y al
 * tipo societario: cooperativas en INAES, CABA en IGJ, Buenos Aires en DPPJ y
 * el resto en el Registro Publico de su provincia. Es una sugerencia editable.
 */
export function suggestRegistry(
  companyType: string | undefined,
  legalProvince: string | undefined,
): { body: string; place: string } | null {
  if (!legalProvince) return null;
  if (companyType === "Cooperativa") return { body: "INAES", place: legalProvince };
  if (provinceCode(legalProvince) === CABA) return { body: "IGJ", place: legalProvince };
  if (provinceCode(legalProvince) === "B") return { body: "DPPJ", place: legalProvince };
  return { body: "Registro Público de la provincia", place: legalProvince };
}

/** El CUIT de una persona juridica empieza con 30, 33 o 34. */
export const isCompanyCuit = (cuit: string) => /^3[034]/.test(onlyDigits(cuit));

/** Sexo que sugiere el prefijo del CUIT/CUIL (23 y 24 no lo indican). */
export function sexFromCuit(cuit: string): string {
  const prefix = onlyDigits(cuit).slice(0, 2);
  return prefix === "20" ? "Masculino" : prefix === "27" ? "Femenino" : "";
}

/** Lugar que corresponde a cada organismo, si es uno solo (nombre de provincia). */
export const REGISTRY_PLACE: Record<string, string> = { IGJ: "CABA", DPPJ: "Buenos Aires" };

/** Cargos segun el tipo societario (lo que figura en el estatuto o el acta). */
const POSITIONS_BY_TYPE: Record<string, string[]> = {
  "Sociedad Anónima (SA)": [
    "Presidente",
    "Vicepresidente",
    "Director titular",
    "Director suplente",
  ],
  "Sociedad de Responsabilidad Limitada (SRL)": ["Socio gerente", "Gerente"],
  "Sociedad por Acciones Simplificada (SAS)": [
    "Administrador titular",
    "Administrador suplente",
    "Representante legal",
  ],
  "Sociedad Colectiva": ["Socio administrador"],
  "Sociedad en Comandita": ["Socio administrador"],
  Cooperativa: ["Presidente", "Secretario", "Tesorero", "Consejero"],
  "Asociación Civil": ["Presidente", "Secretario", "Tesorero", "Vocal"],
};

/** Si el tipo societario no tiene cargos propios. */
const GENERAL_POSITIONS = ["Presidente", "Director", "Gerente", "Administrador", "Socio"];

export const positionsFor = (companyType: string | undefined) => [
  ...(POSITIONS_BY_TYPE[companyType ?? ""] ?? GENERAL_POSITIONS),
  "Apoderado",
];

/** Formulario vacio de representante o apoderado (Argentina por defecto). */
export const EMPTY_COMPANY_MEMBER: CompanyPersonData = {
  firstName: "",
  lastName: "",
  gender: "",
  documentType: "DNI",
  documentNumber: "",
  nationality: "Argentina",
  birthDate: "",
  birthPlace: "",
  address: "",
  city: "",
  province: "",
  residenceCountry: "Argentina",
  postalCode: "",
  taxId: "",
  email: "",
  phone: "",
  position: "",
  maritalStatus: "",
  spouseName: "",
  spouseNationality: "Argentina",
  spouseGender: "",
  spouseTaxId: "",
  isPep: "",
  pepPosition: "",
  pepJurisdiction: "",
  pepFrom: "",
  pepTo: "",
};

/** Caracter en la empresa (F.0186: Representante Legal / Apoderados) -> valor de la base. */
export const MEMBER_ROLE_OPTIONS: Record<string, string> = {
  "Representante legal": "legal_representative",
  Apoderado: "attorney",
};

// --- Reglas ----------------------------------------------------------------------

/** El DNI que lleva un CUIT/CUIL (los 8 digitos del medio, sin ceros adelante). */
export function documentFromCuit(cuit: string): string {
  const digits = onlyDigits(cuit);
  return digits.length === 11 ? String(Number(digits.slice(2, 10))) : "";
}

/** El DNI tiene que coincidir con el CUIT/CUIL (con o sin ceros adelante). */
export function cuitMatchesDocument(cuit: string, documentNumber: string): boolean {
  const fromCuit = documentFromCuit(cuit);
  const dni = onlyDigits(documentNumber);
  return !fromCuit || !dni || Number(dni) === Number(fromCuit);
}

/** Mayor de 18 a la fecha (ISO yyyy-mm-dd). */
export function isAdult(birthDate: string, today = new Date()): boolean {
  const [y, m, d] = birthDate.split("-").map(Number);
  if (!y || !m || !d) return false;
  const limit = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate());
  return new Date(y, m - 1, d) <= limit;
}

/** Codigo de 4 digitos, o CPA con la letra de la provincia (C1427ABC). `province` = nombre. */
export function postalCodeMatches(postalCode: string, province: string | undefined): boolean {
  const cp = postalCode.trim().toUpperCase();
  if (/^\d{4}$/.test(cp)) return true;
  if (!/^[A-Z]\d{4}[A-Z]{3}$/.test(cp)) return false;
  const code = provinceCode(province ?? "");
  return !code || cp[0] === code;
}

const isoToday = () => new Date().toISOString().slice(0, 10);
export const isFutureDate = (iso: string) => !!iso && iso > isoToday();

// --- Lo que recibe la base -------------------------------------------------------

const compact = (raw: Record<string, unknown>) =>
  Object.fromEntries(Object.entries(raw).filter(([, v]) => v !== undefined && v !== ""));

const trimmed = (v: string | undefined) => v?.trim() || undefined;

/** p_profile de company_onboarding_start (Datos Generales del F.0186). */
export function companyProfilePayload(c: Partial<CompanyData>): Record<string, unknown> {
  const argentina = (c.legalCountry ?? "Argentina") === "Argentina";
  return compact({
    legal_name: trimmed(c.legalName),
    trade_name: trimmed(c.tradeName),
    company_type: c.companyType,
    identification_type: c.identificationType || "CUIT",
    activity_code: onlyDigits(c.activityCode ?? ""),
    activity_description: trimmed(c.activityDescription),
    legal_street: trimmed(c.legalStreet),
    legal_locality: trimmed(c.legalLocality),
    legal_province: argentina ? provinceCode(c.legalProvince ?? "") : undefined,
    legal_country: COUNTRIES[c.legalCountry ?? "Argentina"],
    legal_postal_code: trimmed(c.legalPostalCode)?.toUpperCase(),
    phone: trimmed(c.phone),
    email: trimmed(c.email)?.toLowerCase(),
    registry_body: REGISTRY_BODIES[c.registryBody ?? ""],
    registry_province: provinceCode(c.registryProvince ?? ""),
    constitution_date: c.constitutionDate,
    registry_number: trimmed(c.registryNumber),
    registration_date: c.registrationDate,
    registry_book: trimmed(c.registryBook),
    registry_volume: trimmed(c.registryVolume),
    registry_folio: trimmed(c.registryFolio),
    vat_condition: VAT_CONDITIONS[c.vatCondition ?? ""],
    income_tax_condition: INCOME_TAX_CONDITIONS[c.incomeTaxCondition ?? ""],
    iibb_number: trimmed(c.iibbNumber),
  });
}

/** Representante legal o apoderado, como lo recibe la base (person_submissions.declared). */
export function companyPersonPayload(p: Partial<CompanyPersonData>): Record<string, unknown> {
  const nationality = COUNTRIES[p.nationality ?? ""];
  const country = COUNTRIES[p.residenceCountry ?? ""];
  const isPep = p.isPep === PEP_YES ? true : p.isPep === PEP_NO ? false : undefined;
  return compact({
    first_name: trimmed(p.firstName),
    last_name: trimmed(p.lastName),
    gender: SEX_OPTIONS[p.gender ?? ""],
    document_country: nationality,
    document_type: p.documentType || "DNI",
    document_number: trimmed(p.documentNumber),
    nationality,
    birth_date: p.birthDate,
    birth_place: p.birthPlace,
    // address_line1 alimenta people; address_street es el "Domicilio Real" del F.0186.
    address_line1: trimmed(p.address),
    address_street: trimmed(p.address),
    city: trimmed(p.city),
    province: trimmed(p.province),
    residence_country: country,
    postal_code: trimmed(p.postalCode)?.toUpperCase(),
    tax_id: onlyDigits(p.taxId ?? ""),
    email: trimmed(p.email)?.toLowerCase(),
    phone: trimmed(p.phone),
    position: p.position,
    marital_status: MARITAL_STATUSES[p.maritalStatus ?? ""],
    spouse: needsSpouse(p.maritalStatus)
      ? compact({
          full_name: trimmed(p.spouseName),
          nationality: COUNTRIES[p.spouseNationality ?? ""],
          gender: SEX_OPTIONS[p.spouseGender ?? ""],
          tax_id: onlyDigits(p.spouseTaxId ?? ""),
        })
      : undefined,
    is_pep: isPep,
    pep_detail: isPep
      ? compact({
          relation: PEP_AFFINITY[p.pepPosition ?? ""] ?? "own",
          position: p.pepPosition,
          jurisdiction: p.pepJurisdiction,
          from_year: p.pepFrom,
          to_year: p.pepTo,
          term: p.pepFrom && p.pepTo ? `${p.pepFrom} a ${p.pepTo.toLowerCase()}` : undefined,
        })
      : undefined,
  });
}
