import { Controller } from "react-hook-form";
import { Link } from "@tanstack/react-router";
import { Field,PasswordField,PrimaryButton } from "@/shared/ui/auth-kit";
import type { AccountType } from "@/features/onboarding/onboarding.types";
import { FieldError } from "@/shared/forms/field-error";
import { useZodForm } from "@/shared/forms/use-zod-form";
import { registerSchema,type RegisterValues } from "../auth.schema";

export function RegisterForm({
  accountType,
  onSubmit,
  onSwitchToLogin,
  error,
}: {
  accountType: AccountType;
  /** El alta la hace la pagina (Edge Function); acá solo se valida. */
  onSubmit: (values: RegisterValues) => Promise<void>;
  onSwitchToLogin: () => void;
  error: string | null;
}) {
  const form = useZodForm(registerSchema, {
    defaultValues: {
      firstName: "",
      lastName: "",
      birthDate: "",
      email: "",
      password: "",
      confirm: "",
      terms: false,
    },
  });
  const { errors, isSubmitting } = form.formState;

  return (
    <form className="space-y-4" noValidate onSubmit={form.handleSubmit(onSubmit)}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Nombre" error={errors.firstName?.message} {...form.register("firstName")} />
        <Field label="Apellido" error={errors.lastName?.message} {...form.register("lastName")} />
      </div>
      <Field
        label="Fecha de nacimiento"
        type="date"
        error={errors.birthDate?.message}
        {...form.register("birthDate")}
      />
      <Field
        label="Correo electrónico"
        type="email"
        autoComplete="email"
        placeholder="nombre@dominio.com"
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

      <div className="pt-1">
        <label className="flex items-start gap-2.5 text-xs text-black-500">
          <input type="checkbox" className="mt-0.5 accent-red-500" {...form.register("terms")} />
          <span>
            He leído y acepto los{" "}
            <a href="/legales/terminos" className="underline underline-offset-2 hover:text-red-500">
              Términos y Condiciones
            </a>
            .
          </span>
        </label>
        <FieldError message={errors.terms?.message} />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="pt-1">
        <PrimaryButton type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Registrando..." : "Registrarse"}
        </PrimaryButton>
      </div>

      <div className="space-y-2 pt-2 text-center text-xs text-black-400">
        <p>
          ¿Ya tenés una cuenta?{" "}
          <button
            type="button"
            onClick={onSwitchToLogin}
            className="text-red-500 underline underline-offset-2 hover:opacity-80"
          >
            Iniciá sesión
          </button>
        </p>
        <p>
          {accountType === "company" ? (
            <Link
              to="/login"
              search={{ register: "pf" }}
              className="text-black-400 underline underline-offset-2 transition-colors hover:text-red-500"
            >
              ¿Sos persona física? Registrate como persona física
            </Link>
          ) : (
            <Link
              to="/login"
              search={{ register: "pj" }}
              className="text-black-400 underline underline-offset-2 transition-colors hover:text-red-500"
            >
              ¿Querés registrar tu empresa? Registrar empresa
            </Link>
          )}
        </p>
      </div>
    </form>
  );
}
