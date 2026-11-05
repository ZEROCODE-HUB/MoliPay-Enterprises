import { requireSupabase } from "@/infrastructure/supabase/client";
import { toAppError } from "@/infrastructure/supabase/errors";
import type { CustomerAccess } from "./auth.rules";

/* Sin contrato: lo usa solo auth.hooks.ts. */

const context = { feature: "auth", operation: "customer_access" };

/** Estado del cliente del email que acaba de iniciar sesion. */
export async function getCustomerAccess(email: string): Promise<CustomerAccess> {
  const sb = requireSupabase();
  const { data: legajo, error: legajoError } = await sb.rpc("legajo_de_sesion");
  if (legajoError) throw toAppError(legajoError, context);
  if (!legajo) return { status: null, onboardingComplete: null, hasOnboardingEvidence: false };
  const { data: customer, error } = await sb
    .from("clientes")
    .select("legajo, estado, onboarding_completo")
    .eq("legajo", legajo)
    .maybeSingle();
  if (error) throw toAppError(error, context);
  if (!customer) return { status: null, onboardingComplete: null, hasOnboardingEvidence: false };

  const status = (customer.estado as string | null) ?? "";
  const onboardingComplete = (customer.onboarding_completo as boolean | null) ?? null;
  // Solo hace falta saber si envio algo cuando esta registrado sin terminar el alta.
  let hasOnboardingEvidence = false;
  if (status === "registrado" && !onboardingComplete) {
    const [validation, document] = await Promise.all([
      sb
        .from("validaciones")
        .select("id")
        .eq("cliente_legajo", customer.legajo)
        .limit(1)
        .maybeSingle(),
      sb
        .from("documentos")
        .select("id")
        .eq("cliente_legajo", customer.legajo)
        .limit(1)
        .maybeSingle(),
    ]);
    if (validation.error) throw toAppError(validation.error, context);
    if (document.error) throw toAppError(document.error, context);
    hasOnboardingEvidence = !!validation.data || !!document.data;
  }
  return { status, onboardingComplete, hasOnboardingEvidence };
}
