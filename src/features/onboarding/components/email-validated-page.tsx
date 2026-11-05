import { useNavigate } from "@tanstack/react-router";
import { AuthShell,PrimaryButton,SuccessCard } from "@/shared/ui/auth-kit";

export function EmailValidatedPage() {
  const navigate = useNavigate();
  return (
    <AuthShell
      leftEyebrow="Paso 2 · Verificación"
      leftTitle="Tu correo quedó verificado."
      step="Cuenta habilitada"
    >
      <SuccessCard
        title="Validación exitosa"
        body={<p>Tu correo electrónico ha sido validado con éxito.</p>}
      >
        <PrimaryButton onClick={() => navigate({ to: "/login", search: { register: undefined } })}>
          Ir a inicio de sesión
        </PrimaryButton>
      </SuccessCard>
    </AuthShell>
  );
}
