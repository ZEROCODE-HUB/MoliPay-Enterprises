import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { userMessage } from "@/shared/lib/errors";
import { AuthShell, PrimaryButton, SecondaryButton, SuccessCard } from "@/shared/ui/auth-kit";
import { useOnboardingActions, useOnboardingDraft } from "../onboarding.hooks";

export function RegistrationSuccessPage() {
  const navigate = useNavigate();
  const email = useOnboardingDraft((s) => s.registration.email);
  const { resendVerification } = useOnboardingActions();
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);

  const resend = async () => {
    if (!email) return;
    setSending(true);
    setResult(null);
    try {
      await resendVerification(email);
      setResult({ ok: true, text: "Reenviamos el correo. Revisá tu bandeja." });
    } catch (e) {
      setResult({ ok: false, text: userMessage(e, "No se pudo reenviar el correo.") });
    } finally {
      setSending(false);
    }
  };

  return (
    <AuthShell
      leftEyebrow="Paso 2 · Verificación"
      leftTitle="Confirmá tu correo para continuar."
      step="Correo enviado"
    >
      <SuccessCard
        title="Registro exitoso"
        body={
          <>
            <p>
              Enviamos un correo a{" "}
              <span className="font-semibold text-black-800">{email ?? "tu email"}</span>. Revisá tu
              bandeja y hacé clic en el link para validar la cuenta.
            </p>
            <p className="mt-3 text-xs text-black-400">
              Si no lo recibís, revisá spam o{" "}
              <button
                type="button"
                onClick={() => void resend()}
                disabled={sending || !email}
                className="underline underline-offset-2 hover:text-red-500 disabled:opacity-50"
              >
                {sending ? "reenviando..." : "reenviá el correo"}
              </button>
              . ¿Tenés un problema?{" "}
              <Link to="/" className="underline underline-offset-2 hover:text-red-500">
                Contactanos
              </Link>
              .
            </p>
            {result && (
              <p className={`mt-3 text-xs ${result.ok ? "text-green-600" : "text-red-600"}`}>
                {result.text}
              </p>
            )}
          </>
        }
      >
        <PrimaryButton onClick={() => navigate({ to: "/login", search: { register: undefined } })}>
          Ir a inicio de sesión
        </PrimaryButton>
        <div className="flex justify-center">
          <SecondaryButton onClick={() => navigate({ to: "/onboarding/datos-personales" })}>
            Continuar con el alta
          </SecondaryButton>
        </div>
      </SuccessCard>
    </AuthShell>
  );
}
