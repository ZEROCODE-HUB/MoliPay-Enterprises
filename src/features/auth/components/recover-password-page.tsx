import { useState } from "react";
import { getRouteApi,Link,useNavigate } from "@tanstack/react-router";
import { AuthShell,Field,FormTitle,PrimaryButton,SuccessCard } from "@/shared/ui/auth-kit";
import { applyServerErrors } from "@/shared/forms/apply-server-errors";
import { useZodForm } from "@/shared/forms/use-zod-form";
import { useAuthActions } from "../auth.hooks";
import { recoverPasswordSchema } from "../auth.schema";

const route = getRouteApi("/recuperar");

export function RecoverPasswordPage() {
  const { email: initialEmail } = route.useSearch();
  const navigate = useNavigate();
  const { requestPasswordReset } = useAuthActions();
  const [sentTo, setSentTo] = useState<string | null>(null);
  const form = useZodForm(recoverPasswordSchema, { defaultValues: { email: initialEmail } });
  const { errors, isSubmitting } = form.formState;

  const submit = form.handleSubmit(async ({ email }) => {
    try {
      await requestPasswordReset(email);
      setSentTo(email);
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
      {sentTo ? (
        <SuccessCard
          title="Revisá tu correo"
          body={
            <p>
              Enviamos un enlace de recuperación a{" "}
              <span className="font-semibold text-black-700">{sentTo}</span>. Hacé clic en él para
              crear una nueva contraseña. Si no lo encontrás, revisá la carpeta de spam.
            </p>
          }
        >
          <PrimaryButton
            onClick={() => navigate({ to: "/login", search: { register: undefined } })}
          >
            Volver al inicio de sesión
          </PrimaryButton>
        </SuccessCard>
      ) : (
        <>
          <FormTitle
            eyebrow="Recuperar contraseña"
            title="¿Olvidaste tu contraseña?"
            subtitle="Ingresá el correo asociado a tu cuenta y te enviaremos un enlace para crear una nueva."
          />
          <form className="space-y-4" noValidate onSubmit={submit}>
            <Field
              label="Correo electrónico"
              type="email"
              autoComplete="email"
              placeholder="hola@empresa.com"
              error={errors.email?.message}
              {...form.register("email")}
            />
            {errors.root?.server && (
              <p className="text-sm text-red-600">{errors.root.server.message}</p>
            )}
            <div className="pt-1">
              <PrimaryButton type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Enviando…" : "Enviar enlace de recuperación"}
              </PrimaryButton>
            </div>
            <div className="pt-2 text-center text-xs text-black-400">
              <Link
                to="/login"
                search={{ register: undefined }}
                className="text-red-500 underline underline-offset-2 hover:opacity-80"
              >
                Volver al inicio de sesión
              </Link>
            </div>
          </form>
        </>
      )}
    </AuthShell>
  );
}
