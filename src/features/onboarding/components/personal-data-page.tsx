import { useEffect,useState } from "react";
import { Controller } from "react-hook-form";
import { useNavigate } from "@tanstack/react-router";
import { useZodForm } from "@/shared/forms/use-zod-form";
import { onlyDigits } from "@/shared/lib/text";
import {
AuthShell,
Field,
FormTitle,
PrimaryButton,
SecondaryButton,
SelectField,
Stepper,
WizardNav,
} from "@/shared/ui/auth-kit";
import {
useDiscardForeignDraft,
useOnboardingDraft,
useOnboardingProfile,
} from "../onboarding.hooks";
import { FUNDS_ORIGINS,GENDERS,OCCUPATIONS } from "../onboarding.rules";
import { PERSONAL_DATA_STEP_FIELDS,personalDataSchema } from "../onboarding.schema";
import { BackToLoginLink } from "./back-to-login-link";

const STEPS = ["Datos personales", "Información financiera", "Validación final"];

export function PersonalDataPage() {
  const navigate = useNavigate();
  const { accountType, personalData, setPersonalData } = useOnboardingDraft();
  const profile = useOnboardingProfile();
  const [step, setStep] = useState(0);
  const form = useZodForm(personalDataSchema, {
    defaultValues: {
      gender: personalData.gender ?? "",
      cuit: personalData.cuit ?? "",
      occupation: personalData.occupation ?? "",
      fundsOrigin: personalData.fundsOrigin ?? "",
      isPep: personalData.isPep ?? false,
    },
  });
  const { errors } = form.formState;
  useDiscardForeignDraft(() =>
    form.reset({ gender: "", cuit: "", occupation: "", fundsOrigin: "", isPep: false }),
  );
  const cuitDigits = onlyDigits(form.watch("cuit")).length;

  // Precarga lo que ya esta guardado, sin pisar lo que el usuario ya escribio.
  useEffect(() => {
    const saved = profile.data?.personal;
    if (!saved) return;
    const current = form.getValues();
    form.reset({
      gender: current.gender || saved.gender || "",
      cuit: current.cuit || saved.cuit || "",
      occupation: current.occupation || saved.occupation || "",
      fundsOrigin: current.fundsOrigin || saved.fundsOrigin || "",
      isPep: current.isPep || !!saved.isPep,
    });
  }, [profile.data, form]);

  const next = async () => {
    if (!(await form.trigger(PERSONAL_DATA_STEP_FIELDS[step]))) return;
    if (step < STEPS.length - 1) {
      setStep(step + 1);
      return;
    }
    await form.handleSubmit((values) => {
      setPersonalData(values);
      navigate({ to: accountType === "company" ? "/onboarding/datos-empresa" : "/onboarding/kyc" });
    })();
  };

  return (
    <AuthShell
      leftEyebrow="Paso 3 · Datos personales"
      leftTitle={
        accountType === "company"
          ? "Datos del representante legal."
          : "Completá tu perfil regulatorio."
      }
      leftBody="Estos datos son requeridos por normativa antilavado (UIF) y solo se comparten con las autoridades competentes."
      step={`Paso ${step + 1} de 3`}
    >
      <FormTitle eyebrow="KYC · Datos personales" title="Validación de datos personales" />
      <Stepper steps={STEPS} current={step} />

      {step === 0 && (
        <div className="space-y-4">
          <Controller
            control={form.control}
            name="gender"
            render={({ field, fieldState }) => (
              <SelectField
                label="Género"
                value={field.value}
                onChange={field.onChange}
                options={GENDERS}
                error={fieldState.error?.message}
              />
            )}
          />
          <Field
            label="CUIT / CUIL"
            placeholder="20-12345678-9"
            className="font-mono"
            error={
              errors.cuit?.message ?? (cuitDigits > 11 ? "Máximo 11 dígitos permitidos" : undefined)
            }
            hint={cuitDigits > 0 ? `${cuitDigits}/11 dígitos` : undefined}
            {...form.register("cuit")}
          />
          <Controller
            control={form.control}
            name="occupation"
            render={({ field, fieldState }) => (
              <SelectField
                label="Ocupación"
                value={field.value}
                onChange={field.onChange}
                options={OCCUPATIONS}
                error={fieldState.error?.message}
              />
            )}
          />
          <WizardNav onNext={() => void next()} nextLabel="Siguiente" />
        </div>
      )}

      {step === 1 && (
        <div className="space-y-4">
          <Controller
            control={form.control}
            name="fundsOrigin"
            render={({ field, fieldState }) => (
              <SelectField
                label="Origen de fondos"
                value={field.value}
                onChange={field.onChange}
                options={FUNDS_ORIGINS}
                error={fieldState.error?.message}
              />
            )}
          />
          <WizardNav onBack={() => setStep(0)} onNext={() => void next()} nextLabel="Siguiente" />
        </div>
      )}

      {step === 2 && (
        <div className="space-y-5">
          <div className="rounded-sm border border-black-100 bg-black-50 p-5 text-xs leading-relaxed text-black-500">
            Se consideran <strong>PEPs</strong> a los Funcionarios Públicos Nacionales, Provinciales
            y Municipales (tanto Nacionales como Extranjeros) de los Poderes Ejecutivo, Legislativo
            y Judicial, que ocupan o que ocuparon altos cargos jerárquicos, así como también a sus
            familiares hasta el segundo grado de consanguinidad. Los funcionarios calificados como
            PEPs continúan siéndolo hasta dos años después de haber cesado en sus funciones.
          </div>
          <Controller
            control={form.control}
            name="isPep"
            render={({ field }) => (
              <div className="flex items-center justify-between gap-4 py-2">
                <span className="text-sm font-semibold text-black-800">
                  ¿Es persona políticamente expuesta?
                </span>
                <button
                  type="button"
                  onClick={() => field.onChange(!field.value)}
                  role="switch"
                  aria-checked={field.value}
                  aria-label="Persona políticamente expuesta"
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-300 ${
                    field.value ? "bg-red-500" : "bg-black-300"
                  }`}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform duration-200 ${
                      field.value ? "translate-x-[22px]" : "translate-x-0.5"
                    }`}
                  />
                </button>
              </div>
            )}
          />
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <SecondaryButton onClick={() => setStep(1)}>Atrás</SecondaryButton>
            <div className="flex-1">
              <PrimaryButton onClick={() => void next()}>Siguiente paso</PrimaryButton>
            </div>
          </div>
        </div>
      )}
      <BackToLoginLink />
    </AuthShell>
  );
}
