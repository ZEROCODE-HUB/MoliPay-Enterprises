import { useState } from "react";
import { Controller } from "react-hook-form";
import { Link } from "@tanstack/react-router";
import { Field,PasswordField,PrimaryButton,SuccessCard } from "@/shared/ui/auth-kit";
import { useOnboardingActions } from "@/features/onboarding/onboarding.hooks";
import { isEmailNotConfirmed } from "@/infrastructure/auth/auth-errors";
import { userMessage } from "@/shared/lib/errors";
import { applyServerErrors } from "@/shared/forms/apply-server-errors";
import { useZodForm } from "@/shared/forms/use-zod-form";
import { emailSchema } from "@/shared/validation/primitives";
import { useAuthActions } from "../auth.hooks";
import { loginSchema } from "../auth.schema";

const SUPPORT_EMAIL = "soporte@molipay.com.ar";

/** Mail sin verificar: recuadro con reenvio en lugar del error en rojo. */
function PendingVerificationCard({ email, onBack }: { email: string; onBack: () => void }) {
  const { resendVerification } = useOnboardingActions();
  const [message, setMessage] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const resend = async () => {
    if (!emailSchema.safeParse(email).success) {
      setMessage("Ingresá tu correo arriba para reenviar la verificación.");
      return;
    }
    setSending(true);
    try {
      await resendVerification(email);
      setMessage(
        `Te enviamos el mail de verificación a ${email}. Revisá tu bandeja y la carpeta de spam.`,
      );
    } catch (e) {
      setMessage(userMessage(e, "No se pudo reenviar el correo."));
    } finally {
      setSending(false);
    }
  };

  return (
    <SuccessCard
      variant="info"
      title="Pendiente de verificación de email"
      body={
        <>
          <p>
            Tu correo aún no está verificado. Revisá tu bandeja de entrada y hacé clic en el enlace
            para activar tu cuenta.
          </p>
          <p className="mt-3 text-xs text-black-400">
            Si no lo recibís, revisá spam o reenviá el correo. Si tenés algún problema,{" "}
            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              className="underline underline-offset-2 hover:text-red-500"
            >
              ¿Necesitas ayuda? Soporte
            </a>
            .
          </p>
          {message && <p className="mt-3 text-xs text-green-600">{message}</p>}
        </>
      }
    >
      <PrimaryButton onClick={resend} disabled={sending}>
        {sending ? "Reenviando…" : "Reenviar correo de verificación"}
      </PrimaryButton>
      <button
        type="button"
        onClick={onBack}
        className="mt-2 w-full text-xs text-black-400 underline underline-offset-2 hover:text-red-500"
      >
        Volver al inicio de sesión
      </button>
    </SuccessCard>
  );
}

export function LoginForm({ onSuccess }: { onSuccess: (email: string) => void | Promise<void> }) {
  const { signIn } = useAuthActions();
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const form = useZodForm(loginSchema, { defaultValues: { email: "", password: "" } });
  const { errors, isSubmitting } = form.formState;

  const submit = form.handleSubmit(async ({ email, password }) => {
    let user;
    try {
      user = await signIn(email, password);
    } catch (e) {
      if (isEmailNotConfirmed(e)) {
        setPendingEmail(email);
        return;
      }
      applyServerErrors(form, e);
      return;
    }
    await onSuccess(user.email ?? email);
  });

  if (pendingEmail)
    return <PendingVerificationCard email={pendingEmail} onBack={() => setPendingEmail(null)} />;

  return (
    <form className="space-y-4" noValidate onSubmit={submit}>
      <Field
        label="Correo electrónico"
        type="email"
        autoComplete="email"
        placeholder="hola@empresa.com"
        error={errors.email?.message}
        {...form.register("email")}
      />
      <Controller
        control={form.control}
        name="password"
        render={({ field, fieldState }) => (
          <PasswordField
            label="Contraseña"
            value={field.value}
            onChange={field.onChange}
            error={fieldState.error?.message}
          />
        )}
      />
      <div className="flex justify-end">
        <Link
          to="/recuperar"
          search={{ email: "" }}
          className="text-xs text-black-400 underline underline-offset-2 transition-colors hover:text-red-500"
        >
          ¿Olvidaste tu contraseña?
        </Link>
      </div>
      {errors.root?.server && <p className="text-sm text-red-600">{errors.root.server.message}</p>}
      <div className="pt-1">
        <PrimaryButton type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Ingresando..." : "Iniciar sesión"}
        </PrimaryButton>
      </div>
      <div className="space-y-2 pt-2 text-center text-xs text-black-400">
        <p>
          ¿No tienes una cuenta?{" "}
          <Link
            to="/login"
            search={{ register: "pf" }}
            className="text-red-500 underline underline-offset-2 hover:opacity-80"
          >
            Registrate
          </Link>
        </p>
        <p>
          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            className="text-black-400 underline underline-offset-2 transition-colors hover:text-red-500"
          >
            ¿Necesitas ayuda? Soporte
          </a>
        </p>
      </div>
    </form>
  );
}
