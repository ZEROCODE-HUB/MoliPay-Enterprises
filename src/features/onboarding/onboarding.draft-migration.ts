import type {
  AccountType,
  Address,
  CompanyData,
  PersonalData,
  Registration,
} from "./onboarding.types";

/** Datos del borrador que se guardan en el navegador. */
export type PersistedDraft = {
  accountType: AccountType | null;
  registration: Partial<Registration>;
  personalData: Partial<PersonalData>;
  companyData: Partial<CompanyData>;
  address: Partial<Address>;
  emailVerified: boolean;
};

/** Formato anterior del borrador, en español (misma clave de storage, version 0). */
type DraftV0 = {
  tipoCuenta?: "fisica" | "juridica" | null;
  registro?: { nombre?: string; apellido?: string; fechaNac?: string; email?: string };
  datosPersonales?: {
    genero?: string;
    cuitCuil?: string;
    ocupacion?: string;
    origenFondos?: string;
    esPEP?: boolean;
  };
  datosEmpresa?: {
    cuit?: string;
    fechaInscripcion?: string;
    tipoId?: string;
    nombreLegal?: string;
    nombreFantasia?: string;
  };
  kyc?: {
    direccion?: string;
    direccion2?: string;
    ciudad?: string;
    provincia?: string;
    cp?: string;
  };
  emailValidado?: boolean;
};

/** v0 -> v1: se traduce para no perder las altas que quedaron a medias. */
export function migrateDraftV0(old: DraftV0): PersistedDraft {
  const r = old.registro ?? {};
  const p = old.datosPersonales ?? {};
  const c = old.datosEmpresa ?? {};
  const k = old.kyc ?? {};
  return {
    accountType:
      old.tipoCuenta === "juridica" ? "company" : old.tipoCuenta === "fisica" ? "individual" : null,
    registration: {
      firstName: r.nombre,
      lastName: r.apellido,
      birthDate: r.fechaNac,
      email: r.email,
    },
    personalData: {
      gender: p.genero,
      cuit: p.cuitCuil,
      occupation: p.ocupacion,
      fundsOrigin: p.origenFondos,
      isPep: p.esPEP,
    },
    companyData: {
      cuit: c.cuit,
      registrationDate: c.fechaInscripcion,
      companyType: c.tipoId,
      legalName: c.nombreLegal,
      tradeName: c.nombreFantasia,
    },
    address: {
      line1: k.direccion,
      line2: k.direccion2,
      city: k.ciudad,
      province: k.provincia,
      postalCode: k.cp,
    },
    emailVerified: !!old.emailValidado,
  };
}
