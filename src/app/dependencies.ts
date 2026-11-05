/**
 * Raiz de composicion: el UNICO lugar que elige que implementacion usa cada
 * contrato. Cambiar de proveedor se hace aca.
 * Un export con nombre por dependencia: cada modulo importa solo lo suyo.
 */
import { createSupabaseAuthClient } from "@/infrastructure/auth/auth-client.supabase";
import { createSupabaseAccountsRepository } from "@/features/accounts/accounts.supabase";

export const authClient = createSupabaseAuthClient();

// --- Repositorios por dominio ----------------------------------------------------
export const accountsRepository = createSupabaseAccountsRepository();
