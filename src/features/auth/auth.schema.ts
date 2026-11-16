import { z } from "zod";
import { passwordSchema } from "@/shared/validation/password";
import { emailSchema, requiredText } from "@/shared/validation/primitives";

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Ingresá tu contraseña."),
});
export type LoginValues = z.output<typeof loginSchema>;

export const registerSchema = z
  .object({
    firstName: requiredText("Requerido"),
    lastName: requiredText("Requerido"),
    birthDate: requiredText("Requerido"),
    email: emailSchema,
    password: passwordSchema,
    confirm: z.string(),
    terms: z.boolean().refine((v) => v, "Tenés que aceptar los Términos y Condiciones."),
  })
  .refine((v) => v.password === v.confirm, {
    path: ["confirm"],
    message: "Las contraseñas no coinciden",
  });
export type RegisterValues = z.output<typeof registerSchema>;

export const recoverPasswordSchema = z.object({ email: emailSchema });

export const resetPasswordSchema = z
  .object({ password: passwordSchema, confirm: z.string() })
  .refine((v) => v.password === v.confirm, {
    path: ["confirm"],
    message: "Las contraseñas no coinciden.",
  });

/** Codigo de la app de autenticacion (TOTP): 6 digitos, con o sin espacio. */
export const mfaCodeSchema = z.object({
  code: z
    .string()
    .transform((v) => v.replace(/\s/g, ""))
    .pipe(z.string().regex(/^\d{6}$/, "Ingresá los 6 dígitos del código.")),
});
