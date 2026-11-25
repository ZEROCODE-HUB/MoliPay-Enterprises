import { useNavigate } from "@tanstack/react-router";
import { AuthShell, PrimaryButton } from "@/shared/ui/auth-kit";
import { MollyLogo } from "@/shared/ui/molly-logo";
import { useOnboardingDraft } from "../onboarding.hooks";

/** Simulacion del mail de validacion (no llama al servidor; ver PENDIENTES). */
export function EmailValidationDemoPage() {
  const navigate = useNavigate();
  const { registration, markEmailVerified } = useOnboardingDraft();
  const name = registration.firstName ?? "";

  const validate = () => {
    markEmailVerified();
    navigate({ to: "/registro/validacion-exitosa" });
  };

  return (
    <AuthShell
      leftEyebrow="Simulación · Correo"
      leftTitle="Este es el email que recibirías en tu bandeja."
      step="Email de validación"
    >
      <div className="bg-card overflow-hidden rounded-md border border-border">
        <div className="px-6 py-4 flex items-center justify-between bg-black">
          <MollyLogo />
          <span className="text-white/60 font-sans text-xs font-medium">altas@molipay.com.ar</span>
        </div>
        <div className="p-6 sm:p-8">
          <p className="text-xs text-muted-foreground">Asunto</p>
          <p className="mt-1 mb-6 text-sm font-medium text-foreground">Validá tu cuenta MoliPay</p>

          <div className="text-sm text-muted-foreground space-y-4 leading-relaxed">
            <p>Hola {name || "usuario"},</p>
            <p>
              Muchas gracias por registrarte en MoliPay. Para poder ingresar a la plataforma primero
              debés validar el email. Para realizarlo hacé clic acá.
            </p>
          </div>

          <div className="mt-8">
            <PrimaryButton onClick={validate}>Validar desde acá</PrimaryButton>
          </div>

          <p className="mt-6 text-xs text-muted-foreground leading-relaxed">
            Si tenés una duda o inconveniente podés contactarnos en{" "}
            <a
              href="mailto:soporte@molipay.com.ar"
              className="underline underline-offset-2 hover:text-red-500"
            >
              soporte@molipay.com.ar
            </a>
            .
          </p>

          <p className="mt-4 text-sm font-medium text-foreground">¡Muchas gracias!</p>

          <div className="mt-8 pt-4 border-t border-border text-[11px] text-muted-foreground leading-relaxed space-y-1">
            <p>Enviado por MoliPay — Argentina</p>
            <div className="flex gap-3">
              <a href="/" className="underline underline-offset-2 hover:text-red-500">
                MoliPay
              </a>
              <a
                href="/legales/terminos"
                className="underline underline-offset-2 hover:text-red-500"
              >
                Términos y condiciones
              </a>
            </div>
          </div>
        </div>
      </div>
    </AuthShell>
  );
}
