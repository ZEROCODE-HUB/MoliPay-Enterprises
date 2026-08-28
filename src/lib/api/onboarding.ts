import { requireSupabase } from "@/lib/supabase";

export type OnboardingPayload = {
  email: string;
  tipoCuenta: "fisica" | "juridica";
  nombre: string;
  cuit: string;
  perfil: Record<string, unknown>;
  kyc: Record<string, { name: string; type: string; data: string } | null>;
};

export type OnboardingResult = { ok: boolean; legajo: string; email: string };

export type RegisterPayload = {
  email: string;
  password: string;
  nombre: string;
  apellido: string;
  fechaNac: string;
  tipoCuenta: "fisica" | "juridica";
};

export async function registerClient(payload: RegisterPayload): Promise<{ ok: boolean; email: string }> {
  const supabase = requireSupabase();
  const { data, error } = await supabase.functions.invoke("registrar-cliente", { body: payload });
  if (error) throw new Error(error.message || "No se pudo registrar la cuenta");
  return data as { ok: boolean; email: string };
}

export async function verifyEmail(token: string): Promise<{ ok: boolean }> {
  const supabase = requireSupabase();
  const { data, error } = await supabase.functions.invoke("verificar-correo", { body: { token } });
  if (error) throw new Error(error.message || "No se pudo verificar el correo");
  return data as { ok: boolean };
}

export async function resendVerification(email: string): Promise<{ ok: boolean; email: string }> {
  const supabase = requireSupabase();
  const { data, error } = await supabase.functions.invoke("reenviar-verificacion", { body: { email } });
  if (error) throw new Error(error.message || "No se pudo reenviar el correo");
  return data as { ok: boolean; email: string };
}

export async function submitOnboarding(
  payload: OnboardingPayload,
): Promise<OnboardingResult> {
  const supabase = requireSupabase();
  const { data, error } = await supabase.functions.invoke("crear-cliente", {
    body: payload,
  });
  if (error) throw new Error(error.message || "No se pudo enviar el onboarding");
  return data as OnboardingResult;
}

/** Convierte un File a { name, type, data(base64) } para enviarlo por JSON. */
export function fileToB64(file: File): Promise<{ name: string; type: string; data: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve({ name: file.name, type: file.type, data: result });
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
