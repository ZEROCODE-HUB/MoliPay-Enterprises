import { z } from "zod";
import { passwordSchema } from "@/shared/validation/password";
import { emailSchema, requiredText } from "@/shared/validation/primitives";

/** Cambio voluntario de clave: la politica del portal y, ademas, 12 caracteres como minimo. */
export const changePasswordSchema = z
  .object({
    current: z.string().min(1, "Ingresá tu contraseña actual."),
    next: passwordSchema.pipe(z.string().min(12, "Mínimo 12 caracteres.")),
    confirm: z.string(),
  })
  .refine((v) => v.next === v.confirm, {
    path: ["confirm"],
    message: "Las contraseñas no coinciden.",
  });

/** `existingEmails`: emails que ya estan en el equipo (no se pueden invitar de nuevo). */
export const createInviteMemberSchema = (existingEmails: string[]) =>
  z.object({
    name: requiredText("Ingresá el nombre del miembro."),
    email: emailSchema.refine(
      (email) => !existingEmails.includes(email),
      "Ese email ya es miembro del equipo.",
    ),
    role: z.enum(["admin", "operator", "viewer"]),
  });

export const acceptInviteSchema = z
  .object({
    password: passwordSchema.pipe(z.string().min(12, "Mínimo 12 caracteres.")),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, {
    path: ["confirm"],
    message: "Las contraseñas no coinciden.",
  });

export const totpCodeSchema = z.object({
  code: z
    .string()
    .transform((v) => v.replace(/\s/g, ""))
    .pipe(z.string().regex(/^\d{6}$/, "Ingresá los 6 dígitos del código.")),
});
