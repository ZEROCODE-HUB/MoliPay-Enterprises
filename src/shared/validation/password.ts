import { z } from "zod";

/**
 * Politica de contraseñas del portal (registro, restablecer y cambiar clave).
 * Supabase Auth valida del lado del servidor; esto es para avisar antes de enviar.
 */
export const PASSWORD_RULES: Array<{ id: string; label: string; test: (s: string) => boolean }> = [
  { id: "len", label: "Mínimo 8 caracteres", test: (s) => s.length >= 8 },
  { id: "upper", label: "Una letra mayúscula", test: (s) => /[A-Z]/.test(s) },
  { id: "num", label: "Un número", test: (s) => /\d/.test(s) },
  { id: "special", label: "Un carácter especial (!/+-.)", test: (s) => /[!/+\-.]/.test(s) },
];

export const isValidPassword = (pw: string) => PASSWORD_RULES.every((r) => r.test(pw));

export const passwordSchema = z
  .string()
  .refine(isValidPassword, "La contraseña no cumple los requisitos.");
