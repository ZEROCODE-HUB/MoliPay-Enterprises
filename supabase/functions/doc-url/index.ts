import { createClient } from "jsr:@supabase/supabase-js@2";

Deno.serve(async (req) => {
  const cors = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  const headers = { ...cors, "content-type": "application/json" };

  const auth = req.headers.get("Authorization")?.replace("Bearer ", "");
  if (!auth) return new Response(JSON.stringify({ error: "no auth" }), { status: 401, headers });

  const url = Deno.env.get("SUPABASE_URL")!;
  const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const userSb = createClient(url, anon, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data: u } = await userSb.auth.getUser(auth);
  const email = u.user?.email;
  if (!email) return new Response(JSON.stringify({ error: "invalid" }), { status: 401, headers });

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    /* ignore */
  }
  const paths: unknown = Array.isArray(body?.paths) ? body.paths : body?.path ? [body.path] : null;
  if (!Array.isArray(paths)) {
    return new Response(JSON.stringify({ error: "missing paths" }), { status: 400, headers });
  }

  const admin = createClient(url, service, { auth: { autoRefreshToken: false, persistSession: false } });
  const isAdmin = email.endsWith("@mollypay.com");

  const out: Record<string, string | null> = {};
  for (const p of paths as unknown[]) {
    if (typeof p !== "string") continue;
    const { data: doc } = await admin.from("documentos").select("cliente_legajo").eq("url", p).maybeSingle();
    if (doc) {
      const { data: cli } = await admin.from("clientes").select("correo").eq("legajo", doc.cliente_legajo).maybeSingle();
      if (cli && cli.correo !== email && !isAdmin) {
        out[p] = null;
        continue;
      }
    } else if (!isAdmin) {
      out[p] = null;
      continue;
    }
    const { data: s } = await admin.storage.from("kyc").createSignedUrl(p, 3600);
    out[p] = s?.signedUrl ?? null;
  }

  return new Response(JSON.stringify({ urls: out }), { headers });
});
