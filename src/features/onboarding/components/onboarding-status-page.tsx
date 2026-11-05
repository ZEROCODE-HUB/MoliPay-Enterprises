import { useNavigate } from "@tanstack/react-router";
import { AuthShell,PrimaryButton,SecondaryButton,SuccessCard } from "@/shared/ui/auth-kit";
import { useOnboardingStatus } from "../onboarding.hooks";
import { CUSTOMER_STATUS_LABEL,NEXT_ONBOARDING_STEP,STATUS_MESSAGE } from "../onboarding.rules";

const SUBMITTED_MESSAGE =
  "Tu alta fue registrada y está siendo validada por nuestro equipo de compliance. Este proceso puede demorar hasta 24 horas hábiles. Te avisaremos por correo cuando quede habilitada.";

export function OnboardingStatusPage() {
  const navigate = useNavigate();
  const query = useOnboardingStatus();
  const status = query.data?.status ?? null;
  const hasSubmittedDocuments = query.data?.hasSubmittedDocuments ?? false;
  const goToLogin = () => navigate({ to: "/login", search: { register: undefined } });

  if (query.isPending) {
    return (
      <AuthShell
        leftEyebrow="Paso 6 · Revisión"
        leftTitle="Cargando tu estado..."
        leftBody="Consultando el estado de tu solicitud."
        step="Cargando..."
      >
        <SuccessCard
          variant="loading"
          title="Cargando..."
          body={<p>Un momento, estamos verificando tu estado.</p>}
        />
      </AuthShell>
    );
  }

  const label = status ? CUSTOMER_STATUS_LABEL[status] : "En proceso";
  const variant =
    status === "deshabilitado" || status === "eliminado"
      ? "error"
      : status === "activado"
        ? "success"
        : "info";

  return (
    <AuthShell
      leftEyebrow="Paso 6 · Revisión"
      leftTitle="Tu solicitud fue enviada."
      leftBody={status ? NEXT_ONBOARDING_STEP[status] : SUBMITTED_MESSAGE}
      step={label}
    >
      <SuccessCard
        variant={variant}
        title={status ? label : "Solicitud enviada"}
        body={
          <>
            <p>{status ? STATUS_MESSAGE[status] : SUBMITTED_MESSAGE}</p>
            <p className="mt-3 text-xs text-black-400">
              Si tenés algún problema,{" "}
              <a
                href="mailto:soporte@molipay.com.ar"
                className="underline underline-offset-2 hover:text-red-500"
              >
                contactanos
              </a>
              .
            </p>
          </>
        }
      >
        <div className="flex flex-col gap-2">
          {status === "activado" ? (
            <PrimaryButton onClick={() => navigate({ to: "/app" })}>Ir al dashboard</PrimaryButton>
          ) : (
            <PrimaryButton onClick={goToLogin}>Ir a iniciar sesión</PrimaryButton>
          )}
          {status === "registrado" && hasSubmittedDocuments && (
            <SecondaryButton onClick={() => navigate({ to: "/onboarding/datos-personales" })}>
              Editar información y reenviar
            </SecondaryButton>
          )}
          {status === "pendiente_verificacion" && (
            <SecondaryButton onClick={goToLogin}>Reenviar verificación</SecondaryButton>
          )}
        </div>
      </SuccessCard>
    </AuthShell>
  );
}
