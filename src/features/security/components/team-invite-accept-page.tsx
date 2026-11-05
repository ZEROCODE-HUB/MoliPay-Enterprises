import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Controller } from "react-hook-form";
import { useAuthActions } from "@/features/auth/auth.hooks";
import { applyServerErrors } from "@/shared/forms/apply-server-errors";
import { useZodForm } from "@/shared/forms/use-zod-form";
import { userMessage } from "@/shared/lib/errors";
import {
  AuthShell,
  FormTitle,
  PasswordField,
  PrimaryButton,
  SecondaryButton,
  SuccessCard,
} from "@/shared/ui/auth-kit";
import { acceptTeamInvite, previewTeamInvite } from "../security.supabase";
import { acceptInviteSchema } from "../security.schema";

export function TeamInviteAcceptPage({ token }: { token: string }) {
  const navigate = useNavigate();
  const { signIn } = useAuthActions();
  const invite = useQuery({
    queryKey: ["team-invite", token],
    queryFn: () => previewTeamInvite(token),
    enabled: !!token,
    retry: false,
  });
  const form = useZodForm(acceptInviteSchema, { defaultValues: { password: "", confirm: "" } });
  const { errors, isSubmitting } = form.formState;
  const toLogin = () => navigate({ to: "/login", search: { register: undefined } });

  const accept = form.handleSubmit(async ({ password }) => {
    const email = invite.data?.email ?? "";
    try {
      await acceptTeamInvite(token, password);
      await signIn(email, password);
    } catch (e) {
      applyServerErrors(form, e);
      return;
    }
    await navigate({ to: "/app" });
  });

  const shell = (children: React.ReactNode) => (
    <AuthShell
      leftEyebrow="MoliPay · Equipo"
      leftTitle="Sumate a tu equipo."
      leftBody="Vas a entrar a la cuenta de la empresa con tu propio usuario."
      step="Invitación"
    >
      {children}
    </AuthShell>
  );

  if (!token || invite.isError) {
    return shell(
      <SuccessCard
        variant="error"
        title="No pudimos abrir la invitación"
        body={
          <p>
            {invite.isError
              ? userMessage(invite.error)
              : "El enlace está incompleto. Abrilo otra vez desde el correo."}
          </p>
        }
      >
        <SecondaryButton onClick={() => void toLogin()}>Ir a iniciar sesión</SecondaryButton>
      </SuccessCard>,
    );
  }

  if (invite.isPending) {
    return shell(<SuccessCard variant="loading" title="Cargando…" body={<p>Un momento.</p>} />);
  }

  return shell(
    <form className="space-y-4" noValidate onSubmit={accept}>
      <FormTitle
        eyebrow={invite.data.company}
        title={`Hola, ${invite.data.name}`}
        subtitle={`Creá tu contraseña para entrar como ${invite.data.email}.`}
      />
      <Controller
        control={form.control}
        name="password"
        render={({ field, fieldState }) => (
          <PasswordField
            label="Contraseña"
            showRules
            value={field.value}
            onChange={field.onChange}
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
      {errors.root?.server?.message && (
        <p className="text-xs text-red-500">{errors.root.server.message}</p>
      )}
      <PrimaryButton type="submit" disabled={isSubmitting}>
        Aceptar invitación
      </PrimaryButton>
    </form>,
  );
}
