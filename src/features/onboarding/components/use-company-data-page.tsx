import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useSessionUser } from "@/features/session/session.hooks";
import { useZodForm } from "@/shared/forms/use-zod-form";
import {
  CUIT_TAKEN_MESSAGE,
  useCuitAvailability,
  useOnboardingDraft,
  useOnboardingProfile,
} from "../onboarding.hooks";
import { isProvisionalCuit, isValidCuit } from "../onboarding.rules";
import { REGISTRY_BODIES, REGISTRY_PLACE, suggestRegistry } from "../company-onboarding.rules";
import { onlyDigits } from "@/shared/lib/text";
import {
  COMPANY_DATA_STEP_FIELDS,
  companyDataIssues,
  fieldsUpTo,
  companyDataSchema,
  type CompanyDataValues,
} from "../onboarding.schema";

export const COMPANY_STEPS = ["Empresa", "Domicilio", "Inscripción e impuestos", "Confirmación"];

const EMPTY: CompanyDataValues = {
  legalName: "",
  tradeName: "",
  cuit: "",
  identificationType: "CUIT",
  companyType: "",
  activityCode: "",
  activityDescription: "",
  legalStreet: "",
  legalLocality: "",
  legalProvince: "",
  legalCountry: "Argentina",
  legalPostalCode: "",
  phone: "",
  email: "",
  registryBody: "",
  registryProvince: "",
  constitutionDate: "",
  registryNumber: "",
  registrationDate: "",
  registryBook: "",
  registryVolume: "",
  registryFolio: "",
  vatCondition: "",
  incomeTaxCondition: "",
  iibbNumber: "",
};

/** Estado y acciones de CompanyDataPage: la pagina solo dibuja. */
export function useCompanyDataPage() {
  const navigate = useNavigate();
  const { companyData, registration, setCompanyData } = useOnboardingDraft();
  const sessionEmail = useSessionUser().user?.email ?? "";
  const profile = useOnboardingProfile();
  const cuitAvailability = useCuitAvailability();
  const [step, setStep] = useState(0);
  const [checkingCuit, setCheckingCuit] = useState(false);
  const form = useZodForm(companyDataSchema, {
    defaultValues: {
      ...(Object.fromEntries(
        Object.entries(EMPTY).map(([k, v]) => [k, companyData[k as keyof typeof companyData] ?? v]),
      ) as CompanyDataValues),
      // El correo de la empresa arranca con el de la cuenta (se puede cambiar).
      email: companyData.email || registration.email || sessionEmail,
    },
  });

  // Precarga lo guardado sin pisar lo ya escrito (el CUIT provisorio 99… no se precarga).
  useEffect(() => {
    const saved = profile.data?.company;
    if (!saved) return;
    const current = form.getValues();
    const keep = (key: keyof CompanyDataValues, value: string | undefined) =>
      current[key] || value || "";
    form.reset({
      ...current,
      cuit: current.cuit || (isProvisionalCuit(saved.cuit) ? "" : (saved.cuit ?? "")),
      registrationDate: keep("registrationDate", saved.registrationDate),
      legalName: keep("legalName", saved.legalName),
      tradeName: keep("tradeName", saved.tradeName),
      companyType: keep("companyType", saved.companyType),
      identificationType: keep("identificationType", saved.identificationType),
    });
  }, [profile.data, form]);

  // El lugar de inscripcion sale del organismo cuando es uno solo (IGJ = CABA).
  const registryBody = form.watch("registryBody");
  useEffect(() => {
    const place = REGISTRY_PLACE[REGISTRY_BODIES[registryBody] ?? ""];
    if (place) form.setValue("registryProvince", place, { shouldValidate: true });
  }, [registryBody, form]);

  /**
   * Lo que se puede saber sin preguntar: organismo y lugar segun el domicilio
   * legal y el tipo societario, y el N° de IIBB (en la mayoria de las
   * jurisdicciones es el CUIT). No pisa lo que el usuario ya eligio.
   */
  const prefillRegistry = () => {
    const v = form.getValues();
    const suggestion = suggestRegistry(v.companyType, v.legalProvince);
    if (suggestion && !v.registryBody) {
      form.setValue("registryBody", suggestion.body);
      form.setValue("registryProvince", suggestion.place);
    }
    if (!v.iibbNumber && isValidCuit(v.cuit)) form.setValue("iibbNumber", onlyDigits(v.cuit));
  };

  /** Avisa en el campo si el CUIT ya es de otra cuenta. true = se puede seguir. */
  const checkCuit = async (cuit: string) => {
    if (!isValidCuit(cuit)) return true;
    setCheckingCuit(true);
    const available = await cuitAvailability.check(cuit);
    setCheckingCuit(false);
    if (available === false) {
      form.setError("cuit", { message: CUIT_TAKEN_MESSAGE });
      return false;
    }
    return true;
  };

  const next = async () => {
    if (step < COMPANY_DATA_STEP_FIELDS.length) {
      const ok = await form.trigger(COMPANY_DATA_STEP_FIELDS[step]);
      // Reglas que cruzan campos (fechas, CUIT de empresa, CP/provincia): en el paso, no al final.
      const allowed = fieldsUpTo(COMPANY_DATA_STEP_FIELDS, step) as string[];
      const cross = companyDataIssues(form.getValues()).filter((i) => allowed.includes(i.path));
      for (const i of cross) form.setError(i.path as never, { type: "custom", message: i.message });
      if (!ok || cross.length > 0) return;
      if (step === 0 && !(await checkCuit(form.getValues("cuit")))) return;
      if (step === 1) prefillRegistry();
      // Se guarda en cada paso: si se corta, retoma donde quedo.
      setCompanyData(form.getValues());
      setStep(step + 1);
      return;
    }
    await form.handleSubmit(
      async (values) => {
        if (!(await checkCuit(values.cuit))) {
          setStep(0);
          return;
        }
        setCompanyData(values);
        void navigate({ to: "/onboarding/datos-personales" });
      },
      // Si quedo algo mal en un paso anterior, se vuelve a ese paso para mostrarlo.
      (errors) => {
        const first = Object.keys(errors)[0];
        const target = COMPANY_DATA_STEP_FIELDS.findIndex((f) => (f as string[]).includes(first));
        if (target >= 0) setStep(target);
      },
    )();
  };

  const back = () => setStep((s) => Math.max(0, s - 1));
  const goTo = (target: number) => setStep(target);

  return { form, step, next, back, goTo, checkCuit, checkingCuit };
}

export type CompanyDataPageVm = ReturnType<typeof useCompanyDataPage>;
