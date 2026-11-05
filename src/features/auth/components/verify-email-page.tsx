import { getRouteApi,useNavigate } from "@tanstack/react-router";
import { useEffect,useRef,useState } from "react";
import { AuthShell,PrimaryButton,SuccessCard } from "@/shared/ui/auth-kit";
import { useOnboardingActions,useOnboardingDraft } from "@/features/onboarding/onboarding.hooks";
import { userMessage } from "@/shared/lib/errors";

type Status = "loading" | "ok" | "error";

const route = getRouteApi("/verificar-correo");

export function VerifyEmailPage() {
  const { token } = route.useSearch();
  const navigate = useNavigate();
  const markEmailVerified = useOnboardingDraft((s) => s.markEmailVerified);
  const { verifyEmail } = useOnboardingActions();
  const started = useRef(false);
  const [status, setStatus] = useState<Status>("loading");
  const [message, setMessage] = useState("");

  // El token del mail se canjea una sola vez (en StrictMode el efecto corre dos veces).
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    if (!token) {
      setStatus("error");
      setMessage("Falta el token de verificación en el enlace.");
      return;
    }
    verifyEmail(token)
      .then(() => {
        markEmailVerified();
        setStatus("ok");
      })
      .catch((e) => {
        setStatus("error");
        setMessage(userMessage(e, "No se pudo verificar el correo."));
      });
  }, [token, verifyEmail, markEmailVerified]);

  return (
    <AuthShell
      leftEyebrow="Verificación de correo"
      leftTitle="Confirmamos que sos vos."
      leftBody="Tu correo quedó verificado y ya podés continuar con el alta de tu cuenta en MoliPay."
      step="Correo verificado"
    >
      {status === "loading" && (
        <SuccessCard
          variant="loading"
          title="Verificando tu correo…"
          body={<p>Estamos confirmando el enlace que nos enviaste. Esto solo toma un instante.</p>}
        />
      )}

      {status === "ok" && (
        <SuccessCard
          title="¡Correo verificado!"
          body={
            <p>
              Tu dirección de correo fue confirmada correctamente. Ahora podés iniciar sesión y
              continuar con el onboarding.
            </p>
          }
        >
          <PrimaryButton
            onClick={() => navigate({ to: "/login", search: { register: undefined } })}
          >
            Volver al inicio de sesión
          </PrimaryButton>
        </SuccessCard>
      )}

      {status === "error" && (
        <SuccessCard variant="error" title="No pudimos verificar el correo" body={<p>{message}</p>}>
          <PrimaryButton
            onClick={() => navigate({ to: "/login", search: { register: undefined } })}
          >
            Volver al inicio de sesión
          </PrimaryButton>
        </SuccessCard>
      )}
    </AuthShell>
  );
}
