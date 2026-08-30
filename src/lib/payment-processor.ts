import { requireSupabase } from "@/lib/supabase";

export interface PaymentRequest {
  linkId: string;
  clienteLegajo: string;
  metodo: string;
  monto: number;
  pagadorNombre: string;
  pagadorEmail: string;
  referencia?: string;
}

export interface PaymentResult {
  id: string;
  estado: string;
}

export interface PaymentProcessor {
  process(req: PaymentRequest): Promise<PaymentResult>;
}

/**
 * Procesador simulado: registra el pago a traves de la funcion SECURITY DEFINER
 * registrar_pago_link. Deja la puerta abierta para enchufar un PSP real
 * (ej. registrar_pago_link pasaria a llamar a la pasarela y confirmar via webhook)
 * sin modificar la interfaz de checkout.
 */
export class SimulatedProcessor implements PaymentProcessor {
  async process(req: PaymentRequest): Promise<PaymentResult> {
    const s = requireSupabase();
    const { data, error } = await s.rpc("registrar_pago_link", {
      p_link_id: req.linkId,
      p_cliente_legajo: req.clienteLegajo,
      p_metodo: req.metodo,
      p_monto: req.monto,
      p_pagador_nombre: req.pagadorNombre,
      p_pagador_email: req.pagadorEmail,
      p_referencia: req.referencia ?? null,
    });
    if (error) throw new Error(error.message || "No se pudo registrar el pago");
    return { id: (data as any)?.id, estado: (data as any)?.estado ?? "Aprobado" };
  }
}

export const paymentProcessor: PaymentProcessor = new SimulatedProcessor();
