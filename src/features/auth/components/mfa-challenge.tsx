import { useQueryClient } from "@tanstack/react-query";
import { ShieldCheck } from "lucide-react";
import { applyServerErrors } from "@/shared/forms/apply-server-errors";
import { useZodForm } from "@/shared/forms/use-zod-form";
import { Field, FormTitle, PrimaryButton } from "@/shared/ui/auth-kit";
import { useSessionUser } from "@/features/session/session.hooks";
import { mfaKeys, useAuthActions, useMfaState } from "../auth.hooks";
import { mfaCodeSchema } from "../auth.schema";

/**
 * Segundo paso del inicio de sesion: el codigo de la app de autenticacion.
 * Al verificarlo la sesion pasa a aal2. Se usa en el login y en el portal si
 * alguien entra con una sesion que todavia no lo verifico.
 */
export function MfaChallenge({
  onVerified,
  onCancel,
}: {
  onVerified: () => void | Promise<void>;
  onCancel: () => void;
}) {
  const { verifyTotp } = useAuthActions();
  const mfa = useMfaState();
  const queryClient = useQueryClient();
  const userId = useSessionUser().user?.id ?? "";
  const form = useZodForm(mfaCodeSchema, { defaultValues: { code: "" } });
  const { errors, isSubmitting } = form.formState;
  const factor = mfa.data?.factors[0];

  const submit = form.handleSubmit(async ({ code }) => {
    if (!factor) {
      form.setError("root.server", { message: "No encontramos tu app de autenticación." });
      return;
    }
    try {
      await verifyTotp(factor.id, code);
    } catch (e) {
      applyServerErrors(form, e);
      form.setValue("code", "");
      return;
    }
    await queryClient.invalidateQueries({ queryKey: mfaKeys.state(userId) });
    await onVerified();
  });

  const codeField = form.register("code");

  return (
    <form className="space-y-4" noValidate onSubmit={submit}>
      <div className="flex justify-center">
        <span className="grid h-12 w-12 place-items-center rounded-full bg-red-50 text-red-500">
          <ShieldCheck size={24} aria-hidden />
        </span>
      </div>
      <FormTitle
        title="Verificación en dos pasos"
        subtitle="Abrí tu app de autenticación (Google Authenticator, Authy, 1Password) e ingresá el código de 6 dígitos de MoliPay."
      />
      <Field
        label="Código de verificación"
        inputMode="numeric"
        autoComplete="one-time-code"
        autoFocus
        maxLength={7}
        placeholder="123 456"
        className="text-center font-mono text-lg tracking-[0.3em]"
        error={errors.code?.message ?? errors.root?.server?.message}
        {...codeField}
        onChange={(e) => {
          void codeField.onChange(e);
          // Con los 6 digitos se envia solo.
          if (e.target.value.replace(/\D/g, "").length === 6 && !isSubmitting) void submit();
        }}
      />
      <PrimaryButton type="submit" disabled={isSubmitting || mfa.isLoading}>
        {isSubmitting ? "Verificando…" : "Verificar"}
      </PrimaryButton>
      <p className="text-center text-xs text-black-400">
        ¿Perdiste el acceso a tu app?{" "}
        <a
          href="mailto:soporte@molipay.com.ar"
          className="underline underline-offset-2 hover:text-red-500"
        >
          Escribinos a soporte
        </a>{" "}
        para validar tu identidad.
      </p>
      <button
        type="button"
        onClick={onCancel}
        className="w-full text-xs text-black-400 underline underline-offset-2 hover:text-red-500"
      >
        Cancelar y volver al inicio de sesión
      </button>
    </form>
  );
}
