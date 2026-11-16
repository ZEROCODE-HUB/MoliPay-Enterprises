import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useSessionUser } from "@/features/session/session.hooks";
import { useZodForm } from "@/shared/forms/use-zod-form";
import { AuthShell, FormTitle, Stepper, WizardNav } from "@/shared/ui/auth-kit";
import { useDiscardForeignDraft, useOnboardingDraft } from "../onboarding.hooks";
import { COMPANY_MEMBER_STEP_FIELDS, companyMemberSchema } from "../onboarding.schema";
import { BackToLoginLink } from "./back-to-login-link";
import { EMPTY_COMPANY_MEMBER } from "../company-onboarding.rules";
import {
  PersonAddressFields,
  PersonIdentityFields,
  PersonPepFields,
  PersonRoleFields,
} from "./company-person-fields";

const STEPS = ["Identidad", "Domicilio y contacto", "Cargo y estado civil", "Declaración PEP"];

/**
 * Persona juridica: datos de quien hace el alta como representante legal
 * (F.0186, Representante Legal / Apoderado 1°). Va despues de los datos de la
 * empresa porque el cargo depende del tipo societario.
 */
export function RepresentativeDataPage() {
  const navigate = useNavigate();
  const { companyData, representative, registration, setRepresentative } = useOnboardingDraft();
  // El correo del representante es el de la cuenta que hace el alta.
  const accountEmail = useSessionUser().user?.email ?? registration.email ?? "";
  const [step, setStep] = useState(0);
  const form = useZodForm(companyMemberSchema, {
    defaultValues: {
      ...EMPTY_COMPANY_MEMBER,
      firstName: registration.firstName ?? "",
      lastName: registration.lastName ?? "",
      birthDate: registration.birthDate ?? "",
      ...representative,
      email: accountEmail,
    },
  });
  useDiscardForeignDraft(() => form.reset(EMPTY_COMPANY_MEMBER));

  // Sin la empresa cargada no se conoce el tipo societario (ni el cargo posible).
  const hasCompany = !!companyData.legalName;
  useEffect(() => {
    if (!hasCompany) void navigate({ to: "/onboarding/datos-empresa", replace: true });
  }, [hasCompany, navigate]);

  const next = async () => {
    if (!(await form.trigger(COMPANY_MEMBER_STEP_FIELDS[step]))) return;
    // Se guarda en cada paso: si se corta, retoma donde quedo.
    setRepresentative(form.getValues());
    if (step < STEPS.length - 1) {
      setStep(step + 1);
      return;
    }
    await form.handleSubmit((values) => {
      setRepresentative(values);
      void navigate({ to: "/onboarding/kyc" });
    })();
  };

  return (
    <AuthShell
      leftEyebrow="Paso 4 · Representante legal"
      leftTitle="Datos del representante legal."
      leftBody="Son tus datos personales como representante de la empresa. Los pide la normativa antilavado (UIF) y forman parte de la ficha de conocimiento del cliente."
      step={`Paso ${step + 1} de ${STEPS.length}`}
    >
      <FormTitle
        eyebrow={`KYB · ${companyData.legalName ?? "Empresa"}`}
        title="Tus datos como representante legal"
        subtitle="Revisá que coincidan con tu DNI: los validamos contra la documentación."
      />
      <Stepper steps={STEPS} current={step} />

      <div className="space-y-6">
        {step === 0 && <PersonIdentityFields form={form} />}
        {step === 1 && <PersonAddressFields form={form} lockedEmail={accountEmail} />}
        {step === 2 && <PersonRoleFields form={form} companyType={companyData.companyType} />}
        {step === 3 && <PersonPepFields form={form} />}
        <WizardNav
          onBack={
            step > 0
              ? () => setStep(step - 1)
              : () => void navigate({ to: "/onboarding/datos-empresa" })
          }
          onNext={() => void next()}
          nextLabel={step === STEPS.length - 1 ? "Continuar con la identidad" : "Siguiente"}
        />
      </div>
      <BackToLoginLink />
    </AuthShell>
  );
}
