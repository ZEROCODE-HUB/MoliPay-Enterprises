import { useEffect,useRef,useState } from "react";
import { Controller } from "react-hook-form";
import { useNavigate } from "@tanstack/react-router";
import {
AuthShell,
FormTitle,
PasswordField,
PrimaryButton,
SuccessCard,
} from "@/shared/ui/auth-kit";
import { applyServerErrors } from "@/shared/forms/apply-server-errors";
import { useZodForm } from "@/shared/forms/use-zod-form";
import { userMessage } from "@/shared/lib/errors";
import { useAuthActions } from "../auth.hooks";
import { resetPasswordSchema } from "../auth.schema";

type Step =
  | { kind: "validating" }
  | { kind: "invalid"; message: string }
  | { kind: "form" }
  | { kind: "done" };

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const { openRecoverySession, updatePassword } = useAuthActions();
  const [step, setStep] = useState<Step>({ kind: "validating" });
  const form = useZodForm(resetPasswordSchema, { defaultValues: { password: "", confirm: "" } });
  const { errors, isSubmitting } = form.formState;

  // El enlace del mail trae un codigo de UN uso: se canjea una sola vez (en StrictMode
  // el efecto corre dos veces y el segundo canje fallaria mostrando "enlace no valido").
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    openRecoverySession()
      .then(() => setStep({ kind: "form" }))
      .catch((e) => setStep({ kind: "invalid", message: userMessage(e) }));
  }, [openRecoverySession]);

  const submit = form.handleSubmit(async ({ password }) => {
    try {
      await updatePassword(password);
      setStep({ kind: "done" });
    } catch (e) {
      applyServerErrors(form, e);
    }
  });

  return (
    <AuthShell
      leftEyebrow="MoliPay · Acceso"
      leftTitle="Tu plataforma de pagos, sin intermediarios."
      leftBody="MoliPay opera bajo normativa BCRA. Tus datos viajan cifrados y se almacenan bajo los estándares del sistema financiero argentino."
    >
      {step.kind === "validating" && (
        <SuccessCard
          variant="loading"
          title="Validando tu enlace…"
          body={<p>Un momento por favor.</p>}
        />
      )}

      {step.kind === "invalid" && (
        <SuccessCard
          variant="error"
          title="Enlace no válido"
          body={<p>{step.message} Solicitá uno nuevo para continuar.</p>}
        >
          <PrimaryButton onClick={() => navigate({ to: "/recuperar", search: { email: "" } })}>
            Solicitar nuevo enlace
          </PrimaryButton>
        </SuccessCard>
      )}

      {step.kind === "done" && (
        <SuccessCard
          title="Contraseña actualizada"
          body={<p>Tu contraseña se cambió correctamente. Ya podés iniciar sesión con la nueva.</p>}
        >
          <PrimaryButton
            onClick={() => navigate({ to: "/login", search: { register: undefined } })}
          >
            Iniciar sesión
          </PrimaryButton>
        </SuccessCard>
      )}

      {step.kind === "form" && (
        <>
          <FormTitle
            eyebrow="Nueva contraseña"
            title="Creá tu nueva contraseña"
            subtitle="Elegí una contraseña segura que no hayas utilizado antes."
          />
          <form className="space-y-4" noValidate onSubmit={submit}>
            <Controller
              control={form.control}
              name="password"
              render={({ field, fieldState }) => (
                <PasswordField
                  label="Nueva contraseña"
                  value={field.value}
                  onChange={field.onChange}
                  showRules
                  error={fieldState.error?.message}
                />
              )}
            />
            <Controller
              control={form.control}
              name="confirm"
              render={({ field, fieldState }) => (
                <PasswordField
                  label="Confirmar contraseña"
                  value={field.value}
                  onChange={field.onChange}
                  error={fieldState.error?.message}
                />
              )}
            />
            {errors.root?.server && (
              <p className="text-sm text-red-600">{errors.root.server.message}</p>
            )}
            <div className="pt-1">
              <PrimaryButton type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Guardando…" : "Cambiar contraseña"}
              </PrimaryButton>
            </div>
          </form>
        </>
      )}
    </AuthShell>
  );
}
