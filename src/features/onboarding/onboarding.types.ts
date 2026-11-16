/** Persona humana o juridica (empresa). */
export type AccountType = "individual" | "company";

export type Registration = {
  firstName: string;
  lastName: string;
  birthDate: string;
  email: string;
};

export type PersonalData = {
  firstName: string;
  lastName: string;
  nationality: string;
  residenceCountry: string;
  documentType: string;
  documentNumber: string;
  gender: string;
  cuit: string;
  occupation: string;
  fundsOrigin: string;
  isPep: boolean;
};

/**
 * Datos Generales de la empresa: los campos del F.0186. Las listas se guardan
 * con la etiqueta que ve el usuario; companyProfilePayload las pasa a la base.
 */
export type CompanyData = {
  legalName: string;
  cuit: string;
  legalStreet: string;
  legalLocality: string;
  /** Nombre de provincia (PROVINCE_CATALOG); texto si el pais no es Argentina. */
  legalProvince: string;
  legalCountry: string;
  legalPostalCode: string;
  phone: string;
  email: string;
  registryBody: string;
  registryProvince: string;
  constitutionDate: string;
  registryNumber: string;
  registrationDate: string;
  registryBook: string;
  registryVolume: string;
  registryFolio: string;
  activityCode: string;
  activityDescription: string;
  vatCondition: string;
  incomeTaxCondition: string;
  iibbNumber: string;
  tradeName: string;
  companyType: string;
  identificationType: string;
};

/** Localidad con su codigo postal numerico (tabla ar_localities). */
export type Locality = {
  provinceCode: string;
  name: string;
  /** Departamento: distingue localidades con el mismo nombre en una provincia. */
  department: string | null;
  postalCode: string | null;
};

/** Actividad del nomenclador CLAE de ARCA (tabla economic_activities). */
export type EconomicActivity = { code: string; description: string; sector: string };

/** Representante legal o apoderado (F.0186 y los datos que ya pedia el sistema). */
export type CompanyPersonData = {
  firstName: string;
  lastName: string;
  gender: string;
  documentType: string;
  documentNumber: string;
  nationality: string;
  birthDate: string;
  birthPlace: string;
  address: string;
  city: string;
  province: string;
  residenceCountry: string;
  postalCode: string;
  taxId: string;
  email: string;
  phone: string;
  position: string;
  maritalStatus: string;
  spouseName: string;
  spouseNationality: string;
  spouseGender: string;
  spouseTaxId: string;
  /** "SI" | "NO" | "" (sin responder: la DJ PEP no tiene valor por defecto). */
  isPep: string;
  pepPosition: string;
  pepJurisdiction: string;
  pepFrom: string;
  /** Año o "Actualidad". */
  pepTo: string;
};

export type Address = {
  line1: string;
  line2: string;
  city: string;
  province: string;
  postalCode: string;
};

export const KYC_DOCUMENTS = ["idFront", "idBack", "utilityBill", "selfie"] as const;
export type KycDocument = (typeof KYC_DOCUMENTS)[number];

/** Archivo del KYC: `file` = recien elegido; solo `url` = ya cargado antes. */
export type KycFile = { name: string; url?: string; file?: File } | null;
export type KycFiles = Record<KycDocument, KycFile>;

export const CUSTOMER_STATUSES = [
  "pendiente_verificacion",
  "registrado",
  "preactivado",
  "activado",
  "suspendido",
  "deshabilitado",
  "eliminado",
] as const;
/** Estado del cliente (homologado con el admin; valores de la base). */
export type CustomerStatus = (typeof CUSTOMER_STATUSES)[number];

/** Lo que ya hay guardado del cliente, para precargar el alta. */
export type OnboardingProfile = {
  legajo: string;
  accountType: AccountType | null;
  personal: Partial<PersonalData>;
  company: Partial<CompanyData>;
  address: Partial<Address>;
};

export type OnboardingStatus = {
  status: CustomerStatus | null;
  /** Ya envio validaciones o documentos. */
  hasSubmittedDocuments: boolean;
};

export type CompanyMember = {
  id: string;
  submissionId: string;
  role: string;
  roleLabel: string;
  reviewState: string;
  name: string;
  /** CUIT/CUIL declarado (solo digitos), para no cargar dos veces a la misma persona. */
  taxId: string;
  position: string | null;
};

export type BeneficialOwner = {
  id: string;
  submissionId: string;
  controlLabel: string;
  ownershipPct: number | null;
  reviewState: string;
  name: string;
};

export type OnboardingDocument = {
  id: string;
  submissionId: string | null;
  tipo: string;
  label: string;
  status: string;
};

export type OnboardingApplication = {
  id: string;
  status: string;
  customerMessageCode: string | null;
};

export type OnboardingSubmission = {
  email: string;
  accountType: AccountType;
  name: string;
  cuit: string;
  profile: Record<string, unknown>;
  documents: Record<KycDocument, KycFile>;
};
