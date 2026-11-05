import { useEffect,useState } from "react";
import { Controller } from "react-hook-form";
import { useNavigate } from "@tanstack/react-router";
import { useZodForm } from "@/shared/forms/use-zod-form";
import { onlyDigits } from "@/shared/lib/text";
import { AuthShell,Field,FormTitle,SelectField,Stepper,WizardNav } from "@/shared/ui/auth-kit";
import { useOnboardingDraft,useOnboardingProfile } from "../onboarding.hooks";
import { COMPANY_TYPES,isProvisionalCuit } from "../onboarding.rules";
import { companyDataSchema,type CompanyDataValues } from "../onboarding.schema";
import { BackToLoginLink } from "./back-to-login-link";

const STEPS = ["Datos de la empresa", "Confirmación"];

const SUMMARY_ROWS: [keyof CompanyDataValues, string][] = [
  ["cuit", "CUIT de la empresa"],
  ["registrationDate", "Fecha de inscripción"],
  ["companyType", "Tipo de identificación"],
  ["legalName", "Nombre legal"],
  ["tradeName", "Nombre de fantasía"],
];

export function CompanyDataPage() {
  const navigate = useNavigate();
  const { companyData, setCompanyData } = useOnboardingDraft();
  const profile = useOnboardingProfile();
  const [step, setStep] = useState(0);
  const form = useZodForm(companyDataSchema, {
    defaultValues: {
      cuit: companyData.cuit ?? "",
      registrationDate: companyData.registrationDate ?? "",
      companyType: companyData.companyType ?? "",
      legalName: companyData.legalName ?? "",
      tradeName: companyData.tradeName ?? "",
    },
  });
  const { errors } = form.formState;
  const cuitDigits = onlyDigits(form.watch("cuit")).length;

  // Precarga lo guardado sin pisar lo ya escrito (el CUIT provisorio 99… no se precarga).
  useEffect(() => {
    const saved = profile.data?.company;
    if (!saved) return;
    const current = form.getValues();
    form.reset({
      cuit: current.cuit || (isProvisionalCuit(saved.cuit) ? "" : (saved.cuit ?? "")),
      registrationDate: current.registrationDate || saved.registrationDate || "",
      companyType: current.companyType || saved.companyType || "",
      legalName: current.legalName || saved.legalName || "",
      tradeName: current.tradeName || saved.tradeName || "",
    });
  }, [profile.data, form]);

  const confirm = form.handleSubmit((values) => {
    setCompanyData(values);
    navigate({ to: "/onboarding/kyc" });
  });

  return (
    <AuthShell
      leftEyebrow="Paso 4 · Empresa"
      leftTitle="Cargá los datos societarios."
      leftBody="Reconstituimos tu legajo con la información que consta en el Registro Público de Comercio."
      step={`Paso ${step + 1} de 2`}
    >
      <FormTitle eyebrow="KYB · Empresa" title="Validación de datos de la empresa" />
      <Stepper steps={STEPS} current={step} />

      {step === 0 && (
        <div className="space-y-4">
          <Field
            label="CUIT de la empresa"
            placeholder="30-12345678-9"
            className="font-mono"
            error={
              errors.cuit?.message ?? (cuitDigits > 11 ? "Máximo 11 dígitos permitidos" : undefined)
            }
            hint={cuitDigits > 0 ? `${cuitDigits}/11 dígitos` : undefined}
            {...form.register("cuit")}
          />
          <Field
            label="Fecha de inscripción"
            type="date"
            error={errors.registrationDate?.message}
            {...form.register("registrationDate")}
          />
          <Controller
            control={form.control}
            name="companyType"
            render={({ field, fieldState }) => (
              <SelectField
                label="Tipo de identificación"
                value={field.value}
                onChange={field.onChange}
                options={COMPANY_TYPES}
                error={fieldState.error?.message}
              />
            )}
          />
          <Field
            label="Nombre legal"
            error={errors.legalName?.message}
            {...form.register("legalName")}
          />
          <Field
            label="Nombre de fantasía"
            error={errors.tradeName?.message}
            {...form.register("tradeName")}
          />
          <WizardNav
            onNext={() => void form.trigger().then((ok) => ok && setStep(1))}
            nextLabel="Siguiente"
          />
        </div>
      )}

      {step === 1 && (
        <div>
          <p className="mb-2 text-[0.7rem] uppercase tracking-[0.2em] text-red-500">Resumen</p>
          <h2 className="mb-6 text-[1.35rem] font-semibold text-black-800">
            Confirmá los datos ingresados
          </h2>
          <dl className="divide-y border-b border-t border-black-100">
            {SUMMARY_ROWS.map(([key, label]) => (
              <div
                key={key}
                className="grid grid-cols-1 gap-1 py-3 text-sm sm:grid-cols-[minmax(0,140px)_1fr] sm:gap-4"
              >
                <dt className="text-black-400">{label}</dt>
                <dd className="font-semibold text-black-800">{form.getValues(key) || "—"}</dd>
              </div>
            ))}
          </dl>
          <WizardNav
            onBack={() => setStep(0)}
            onNext={() => void confirm()}
            nextLabel="Registrar empresa"
          />
        </div>
      )}
      <BackToLoginLink />
    </AuthShell>
  );
}
