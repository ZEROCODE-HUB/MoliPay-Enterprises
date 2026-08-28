import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AuthShell, PrimaryButton, SuccessCard } from "@/components/onboarding";

export const Route = createFileRoute("/onboarding/en-proceso")({
  head: () => ({
    meta: [
      { title: "Solicitud enviada — Molipay" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: EnProceso,
});

function EnProceso() {
  const nav = useNavigate();
  return (
    <AuthShell
      leftEyebrow="Paso 6 · Revision"
      leftTitle="Tu solicitud fue enviada."
      leftBody="Nuestro equipo de compliance revisara tu informacion y te notificara al correo cuando la cuenta quede habilitada."
      step="En proceso"
    >
      <SuccessCard
        variant="info"
        title="Solicitud enviada"
        body={
          <>
            <p>
              Tu alta fue registrada y esta siendo validada por nuestro equipo de compliance. Este proceso puede
              demorar hasta <strong>24 horas habiles</strong>. Te avisaremos por correo cuando quede habilitada.
            </p>
            <p className="mt-3 text-xs text-black-400">
              Si tenés algún problema,{" "}
              <a href="mailto:soporte@molipay.com.ar" className="underline underline-offset-2 hover:text-red-500">
                contactanos
              </a>
              .
            </p>
          </>
        }
      >
        <PrimaryButton onClick={() => nav({ to: "/login", search: { register: undefined } })}>Ir a iniciar sesion</PrimaryButton>
      </SuccessCard>
    </AuthShell>
  );
}
