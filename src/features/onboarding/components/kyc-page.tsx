import { useEffect, useState } from "react";
import { Controller } from "react-hook-form";
import { useNavigate } from "@tanstack/react-router";
import { useSessionUser } from "@/features/session/session.hooks";
import { applyServerErrors } from "@/shared/forms/apply-server-errors";
import { useZodForm } from "@/shared/forms/use-zod-form";
import {
  AuthShell,
  Field,
  FileUpload,
  FormTitle,
  SelectField,
  Stepper,
  WizardNav,
} from "@/shared/ui/auth-kit";
import {
  useKycDocuments,
  useOnboardingActions,
  useOnboardingDraft,
  useOnboardingProfile,
} from "../onboarding.hooks";
import { PROVINCES, customerName, personDeclared } from "../onboarding.rules";
import { addressSchema, type AddressValues } from "../onboarding.schema";
import type { AccountType, KycDocument, KycFile, KycFiles } from "../onboarding.types";
import { BackToLoginLink } from "./back-to-login-link";

const STEPS = ["DNI", "Servicio", "Selfie", "Residencia"];

const EMPTY_FILES: KycFiles = { idFront: null, idBack: null, utilityBill: null, selfie: null };

/** Documentos que pide cada paso (el ultimo es el domicilio). */
const STEP_DOCUMENTS: KycDocument[][] = [["idFront", "idBack"], ["utilityBill"], ["selfie"], []];

export function KycPage() {
  const navigate = useNavigate();
  const sessionEmail = useSessionUser().user?.email ?? "";
  const draft = useOnboardingDraft();
  const profile = useOnboardingProfile();
  const documents = useKycDocuments(profile.data?.legajo);
  const { submit } = useOnboardingActions();
  const isCompanyAccount = (draft.accountType ?? profile.data?.accountType) === "company";
  const [step, setStep] = useState(0);
  const [files, setFiles] = useState<KycFiles>(EMPTY_FILES);
  const form = useZodForm(addressSchema, {
    defaultValues: {
      line1: draft.address.line1 ?? "",
      line2: draft.address.line2 ?? "",
      city: draft.address.city ?? "",
      province: draft.address.province ?? "",
      postalCode: draft.address.postalCode ?? "",
    },
  });
  const { errors, isSubmitting } = form.formState;

  // Si ya envio el alta antes: documentos cargados (los elegidos ahora tienen prioridad)...
  useEffect(() => {
    const saved = documents.data;
    if (saved) setFiles((prev) => ({ ...EMPTY_FILES, ...saved, ...pickChosen(prev) }));
  }, [documents.data]);

  // ...y el domicilio guardado.
  useEffect(() => {
    const saved = profile.data?.address;
    if (!saved?.line1) return;
    form.reset({
      line1: saved.line1 ?? "",
      line2: saved.line2 ?? "",
      city: saved.city ?? "",
      province: saved.province ?? "",
      postalCode: saved.postalCode ?? "",
    });
  }, [profile.data, form]);

  const stepComplete = STEP_DOCUMENTS[step].every((doc) => !!files[doc]);
  const setFile = (doc: KycDocument) => (value: KycFile) =>
    setFiles((f) => ({ ...f, [doc]: value }));

  const finish = form.handleSubmit(async (address: AddressValues) => {
    draft.setAddress(address);
    // Si el borrador se perdio (p. ej. entro directo con login), se completa con lo del servidor.
    const accountType: AccountType | null = draft.accountType ?? profile.data?.accountType ?? null;
    const email = draft.registration.email || sessionEmail;
    if (!accountType || !email) {
      form.setError("root.server", {
        message: "No pudimos identificar tu cuenta. Volvé a iniciar sesión y retomá el alta.",
      });
      return;
    }
    const company = accountType === "company";
    const base = {
      direccion: address.line1,
      direccion2: address.line2,
      ciudad: address.city,
      provincia: address.province,
      cp: address.postalCode,
      fechaNacimiento: draft.registration.birthDate ?? null,
    };
    const declared = personDeclared({
      ...draft.personalData,
      ...address,
      taxId: draft.personalData.cuit,
      birthDate: draft.registration.birthDate,
    });
    const profileFields = company
      ? {
          empresa: {
            legal_name: draft.companyData.legalName,
            trade_name: draft.companyData.tradeName,
            company_type: draft.companyData.companyType,
            identification_type: draft.companyData.identificationType,
            registration_date: draft.companyData.registrationDate,
          },
          representante: declared,
          tipoSociedad: draft.companyData.companyType,
          nombreLegal: draft.companyData.legalName,
          nombreFantasia: draft.companyData.tradeName,
          fechaInscripcion: draft.companyData.registrationDate,
        }
      : {
          persona: declared,
          genero: draft.personalData.gender,
          cuitCuil: draft.personalData.cuit,
          ocupacion: draft.personalData.occupation,
          origenFondos: draft.personalData.fundsOrigin,
          esPEP: draft.personalData.isPep,
        };
    try {
      await submit({
        email,
        accountType,
        name: customerName(accountType, draft.registration, draft.companyData.legalName),
        cuit: (company ? draft.companyData.cuit : draft.personalData.cuit) ?? "",
        profile: { ...base, ...profileFields },
        documents: files,
      });
    } catch (e) {
      applyServerErrors(form, e);
      return;
    }
    navigate({ to: company ? "/onboarding/integrantes" : "/onboarding/en-proceso" });
  });

  return (
    <AuthShell
      leftEyebrow="Paso 5 · Verificación de identidad"
      leftTitle="Validamos tu identidad de forma segura."
      leftBody="Tus documentos se procesan en un entorno cifrado y se conservan según normativa BCRA y Ley 25.246."
      step={`Paso ${step + 1} de 4`}
    >
      <FormTitle
        eyebrow="KYC · Documentación"
        title={isCompanyAccount ? "Documentos del representante legal" : "Validación KYC"}
        subtitle={
          isCompanyAccount
            ? "Cargá tu propio DNI, comprobante y selfie. Los documentos de la empresa van más adelante."
            : undefined
        }
      />
      <Stepper steps={STEPS} current={step} />

      {step === 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-black-800">Cargá el DNI frente y dorso</h2>
          <FileUpload label="DNI frente" value={files.idFront} onChange={setFile("idFront")} />
          <FileUpload label="DNI dorso" value={files.idBack} onChange={setFile("idBack")} />
          <WizardNav onNext={() => setStep(1)} nextDisabled={!stepComplete} nextLabel="Siguiente" />
        </div>
      )}

      {step === 1 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-black-800">Cargá un servicio a tu nombre</h2>
          <FileUpload
            label="Factura de servicio"
            hint="Debe contener tu dirección y no debe tener más de 3 meses de antigüedad."
            value={files.utilityBill}
            onChange={setFile("utilityBill")}
          />
          <WizardNav
            onBack={() => setStep(0)}
            onNext={() => setStep(2)}
            nextDisabled={!stepComplete}
            nextLabel="Siguiente"
          />
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-black-800">Cargá una selfie</h2>
          <FileUpload
            label="Selfie"
            hint="De frente, en un lugar bien iluminado, sin anteojos ni sombreros."
            value={files.selfie}
            onChange={setFile("selfie")}
            accept="image/*"
          />
          <WizardNav
            onBack={() => setStep(1)}
            onNext={() => setStep(3)}
            nextDisabled={!stepComplete}
            nextLabel="Siguiente"
          />
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-black-800">Domicilio de residencia</h2>
          <Field label="Dirección" error={errors.line1?.message} {...form.register("line1")} />
          <Field
            label="Dirección (opcional)"
            placeholder="Piso, departamento, referencia"
            {...form.register("line2")}
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Ciudad" error={errors.city?.message} {...form.register("city")} />
            <Controller
              control={form.control}
              name="province"
              render={({ field, fieldState }) => (
                <SelectField
                  label="Provincia"
                  value={field.value}
                  onChange={field.onChange}
                  options={PROVINCES}
                  error={fieldState.error?.message}
                />
              )}
            />
          </div>
          <Field
            label="Código postal"
            error={errors.postalCode?.message}
            {...form.register("postalCode")}
          />
          {errors.root?.server && (
            <p className="text-sm text-red-600">{errors.root.server.message}</p>
          )}
          <WizardNav
            onBack={() => setStep(2)}
            onNext={() => void finish()}
            nextLabel={isSubmitting ? "Enviando..." : "Finalizar"}
            nextDisabled={isSubmitting}
          />
        </div>
      )}
      <BackToLoginLink />
    </AuthShell>
  );
}

/** Archivos que el usuario eligio en esta sesion (tienen prioridad sobre los ya guardados). */
function pickChosen(files: KycFiles): Partial<KycFiles> {
  return Object.fromEntries(
    Object.entries(files).filter(([, f]) => !!f?.file),
  ) as Partial<KycFiles>;
}
