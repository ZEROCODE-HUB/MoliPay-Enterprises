import { AuthShell, FormTitle, Stepper, WizardNav } from "@/shared/ui/auth-kit";
import { BackToLoginLink } from "./back-to-login-link";
import {
  CompanyAddressSection,
  CompanyIdentitySection,
  CompanyRegistrySection,
  CompanySummarySection,
} from "./company-data-sections";
import { COMPANY_STEPS, useCompanyDataPage } from "./use-company-data-page";

/** Persona juridica: Datos Generales del F.0186. */
export function CompanyDataPage() {
  const vm = useCompanyDataPage();
  const { form, step, next, back, goTo, checkCuit, checkingCuit } = vm;
  const last = step === COMPANY_STEPS.length - 1;

  return (
    <AuthShell
      leftEyebrow="Paso 3 · Empresa"
      leftTitle="Cargá los datos de la empresa."
      leftBody="Tené a mano el estatuto y la constancia de inscripción de ARCA: de ahí salen casi todos los datos."
      step={`Paso ${step + 1} de ${COMPANY_STEPS.length}`}
    >
      <FormTitle
        eyebrow="KYB · Empresa"
        title={last ? "Confirmá los datos de la empresa" : "Datos generales de la empresa"}
      />
      <Stepper steps={COMPANY_STEPS} current={step} />

      <div className="space-y-6">
        {step === 0 && (
          <CompanyIdentitySection form={form} checkCuit={checkCuit} checkingCuit={checkingCuit} />
        )}
        {step === 1 && <CompanyAddressSection form={form} />}
        {step === 2 && <CompanyRegistrySection form={form} />}
        {step === 3 && <CompanySummarySection form={form} goTo={goTo} />}
        <WizardNav
          onBack={step > 0 ? back : undefined}
          onNext={() => void next()}
          nextDisabled={checkingCuit}
          nextLabel={last ? "Continuar con el representante legal" : "Siguiente"}
        />
      </div>
      <BackToLoginLink />
    </AuthShell>
  );
}
