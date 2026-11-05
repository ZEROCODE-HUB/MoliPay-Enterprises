import { requireSupabase } from "@/infrastructure/supabase/client";
import { toAppError } from "@/infrastructure/supabase/errors";
import { sumMoney,moneyFromCents,moneyFromDecimal,toDecimalString } from "@/shared/lib/money";

const context = (operation: string) => ({ feature: "payment-links", operation });

function check<T>(result: { data: T; error: unknown }, operation: string): T {
  if (result.error) throw toAppError(result.error, context(operation));
  return result.data;
}

/** Codigo publico del link: aleatorio de verdad, no adivinable. */
export function generateLinkCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(10));
  return "LP-" + Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

/** Total de los productos en centavos; devuelve pesos para la columna numeric. */
export function linkAmount(products: Array<{ price: number; qty: number }>): number {
  const total = sumMoney(
    products.map((p) => moneyFromCents(Math.round(moneyFromDecimal(p.price).cents * p.qty))),
  );
  return Number(toDecimalString(total));
}

// --- Productos ------------------------------------------------------------------------

export async function listProductRows<T>(legajo: string): Promise<T[]> {
  const r = await requireSupabase()
    .from("productos")
    .select("*")
    .eq("cliente_legajo", legajo)
    .order("created_at", { ascending: false });
  return (check(r, "products") ?? []) as T[];
}

export async function saveProductRow(
  id: string | null,
  payload: Record<string, unknown>,
): Promise<void> {
  const table = requireSupabase().from("productos");
  check(await (id ? table.update(payload).eq("id", id) : table.insert(payload)), "save_product");
}

export async function deleteProductRow(id: string): Promise<void> {
  check(await requireSupabase().from("productos").delete().eq("id", id), "delete_product");
}

// --- Links ---------------------------------------------------------------------------

export async function listLinkRows<TLink extends { id: string }, TDetail>(legajo: string) {
  const sb = requireSupabase();
  const links = (check(
    await sb
      .from("cliente_links_pago")
      .select("*")
      .eq("cliente_legajo", legajo)
      .order("created_at", { ascending: false }),
    "links",
  ) ?? []) as TLink[];
  const ids = links.map((l) => l.id);
  const details = ids.length
    ? ((check(
        await sb.from("cliente_links_pago_detalle").select("*").in("link_id", ids),
        "link_details",
      ) ?? []) as TDetail[])
    : [];
  return { links, details };
}

export async function createLinkRow(
  link: Record<string, unknown>,
  details: (linkId: string) => Record<string, unknown>[],
) {
  const sb = requireSupabase();
  const inserted = check(
    await sb.from("cliente_links_pago").insert(link).select().single(),
    "create_link",
  ) as { id: string };
  try {
    check(
      await sb.from("cliente_links_pago_detalle").insert(details(inserted.id)),
      "create_link_details",
    );
  } catch (e) {
    // Sin detalle el link no sirve: no se deja a medias.
    await sb.from("cliente_links_pago").delete().eq("id", inserted.id);
    throw e;
  }
  return inserted;
}

export async function updateLinkRow(id: string, patch: Record<string, unknown>): Promise<void> {
  check(
    await requireSupabase().from("cliente_links_pago").update(patch).eq("id", id),
    "update_link",
  );
}

export async function deleteLinkRow(id: string): Promise<void> {
  check(await requireSupabase().from("cliente_links_pago").delete().eq("id", id), "delete_link");
}

export async function listUserMerchants(legajo: string, email: string) {
  const r = await requireSupabase()
    .from("comercios")
    .select("id, nombre_comercio")
    .or(`legajo.eq.${legajo},usuario.eq.${email}`);
  return (check(r, "merchants") ?? []) as { id: string; nombre_comercio: string }[];
}

export async function listActiveBrands(merchantId: string) {
  const r = await requireSupabase()
    .from("comercio_banderas")
    .select("id, bandera, estado, metodo_key")
    .eq("comercio_id", merchantId)
    .eq("estado", "Activo");
  return (check(r, "brands") ?? []) as {
    id: string;
    bandera: string;
    estado: string;
    metodo_key: string | null;
  }[];
}

// --- Checkout publico ----------------------------------------------------------------

export async function getPublicLink<
  T extends { id: string; comercio_id?: string | null; comercio_nombre?: string | null },
>(code: string): Promise<T | null> {
  const sb = requireSupabase();
  const link = check(
    await sb.rpc("obtener_link_pago", { p_codigo: code }),
    "public_link",
  ) as T | null;
  if (!link) return null;
  const { data: owner } = await sb
    .from("cliente_links_pago")
    .select("comercio_id, comercio_nombre")
    .eq("id", link.id)
    .maybeSingle();
  return owner
    ? { ...link, comercio_id: owner.comercio_id, comercio_nombre: owner.comercio_nombre }
    : link;
}

export async function countLinkView(linkId: string): Promise<void> {
  await requireSupabase().rpc("incrementar_vistas_link", { p_link_id: linkId });
}

// --- Dashboard ---------------------------------------------------------------------------

export async function loadLinksDashboard(legajo: string, days: number) {
  const sb = requireSupabase();
  const now = new Date();
  const start = new Date(now);
  start.setDate(now.getDate() - (days === 0 ? 0 : days - 1));
  start.setHours(0, 0, 0, 0);
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);

  const movements = (check(
    await sb
      .from("transactions")
      .select("monto_operacion, fecha, estado_id, id_txn")
      .eq("legajo", legajo)
      .eq("tipo", "tarjeta")
      .gte("fecha", start.toISOString())
      .lte("fecha", end.toISOString()),
    "dashboard_movements",
  ) ?? []) as {
    monto_operacion: number | null;
    fecha: string;
    estado_id: string | null;
    id_txn: string | null;
  }[];

  const ids = Array.from(new Set(movements.map((m) => m.estado_id).filter(Boolean))) as string[];
  const names = ids.length
    ? ((check(
        await sb.from("estados_movimiento").select("codigo, nombre").in("codigo", ids),
        "dashboard_statuses",
      ) ?? []) as { codigo: string; nombre: string }[])
    : [];
  const statusName = new Map(names.map((e) => [e.codigo, e.nombre]));
  const links = check(
    await sb
      .from("cliente_links_pago")
      .select("id, monto, estado, url")
      .eq("cliente_legajo", legajo),
    "dashboard_links",
  );
  return {
    movs: movements.map((m) => ({
      monto: Math.abs(moneyFromDecimal(m.monto_operacion).cents) / 100,
      fecha: m.fecha,
      estado: (m.estado_id && statusName.get(m.estado_id)) || "Aprobado",
      id: m.id_txn ?? m.fecha,
    })),
    links: links ?? [],
  };
}

// --- Integraciones e-commerce -----------------------------------------------------------

export async function listEcommerceIntegrations(legajo: string) {
  const r = await requireSupabase()
    .from("cliente_integraciones_ecommerce")
    .select("*")
    .eq("cliente_legajo", legajo);
  return (check(r, "ecommerce") ?? []) as Record<string, any>[]; // eslint-disable-line @typescript-eslint/no-explicit-any
}

export async function upsertEcommerceIntegration(
  legajo: string,
  platform: string,
  patch: Record<string, unknown>,
) {
  check(
    await requireSupabase()
      .from("cliente_integraciones_ecommerce")
      .upsert(
        { cliente_legajo: legajo, plataforma: platform, ...patch },
        { onConflict: "cliente_legajo,plataforma" },
      ),
    "ecommerce_save",
  );
}

export async function getEcommerceKeys(legajo: string, platform: string) {
  const { data, error } = await requireSupabase()
    .from("cliente_integraciones_ecommerce")
    .select("api_key, webhook_url")
    .eq("cliente_legajo", legajo)
    .eq("plataforma", platform)
    .maybeSingle();
  if (error) throw toAppError(error, context("ecommerce_keys"));
  return data as { api_key: string | null; webhook_url: string | null } | null;
}
