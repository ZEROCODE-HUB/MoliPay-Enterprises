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

export type CompanyData = {
  cuit: string;
  registrationDate: string;
  companyType: string;
  identificationType: string;
  legalName: string;
  tradeName: string;
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
