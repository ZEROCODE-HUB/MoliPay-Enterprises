import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AuthShell, PrimaryButton, SuccessCard } from "@/components/onboarding";
import { verifyEmail } from "@/lib/api/onboarding";

export const Route = createFileRoute("/verificar-correo")({
  validateSearch: (search: Record<string, string | undefined>) => ({
    token: (search.token as string) ?? "",
  }),
  head: () => ({
    meta: [
      { title: "Verificar correo — MoliPay" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: VerificarCorreo,
});

type Estado = "loading" | "ok" | "error";

function VerificarCorreo() {
  const { token } = Route.useSearch();
  const nav = useNavigate();
  const [estado, setEstado] = useState<Estado>("loading");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (!token) {
      setEstado("error");
      setMsg("Falta el token de verificación en el enlace.");
      return;
    }
    verifyEmail(token)
      .then(() => setEstado("ok"))
      .catch((e) => {
        setEstado("error");
        setMsg(e instanceof Error ? e.message : "No se pudo verificar el correo.");
      });
  }, [token]);

  return (
    <AuthShell
      leftEyebrow="Verificación de correo"
      leftTitle="Confirmamos que sos vos."
      leftBody="Tu correo quedó verificado y ya podés continuar con el alta de tu cuenta en MoliPay."
      step="Correo verificado"
    >
      {estado === "loading" && (
        <SuccessCard variant="info" title="Verificando tu correo..." body={<p>Un momento por favor.</p>} />
      )}

      {estado === "ok" && (
        <SuccessCard
          title="¡Correo verificado!"
          body={<p>Tu dirección de correo fue confirmada correctamente. Ahora podés iniciar sesión y continuar con el onboarding.</p>}
        >
          <PrimaryButton onClick={() => nav({ to: "/login", search: { register: undefined } })}>
            Volver al inicio de sesión
          </PrimaryButton>
        </SuccessCard>
      )}

      {estado === "error" && (
        <SuccessCard variant="error" title="No pudimos verificar el correo" body={<p>{msg}</p>}>
          <PrimaryButton onClick={() => nav({ to: "/login", search: { register: undefined } })}>
            Volver al inicio de sesión
          </PrimaryButton>
        </SuccessCard>
      )}
    </AuthShell>
  );
}
