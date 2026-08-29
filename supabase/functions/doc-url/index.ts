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
  const path = body?.path;
  if (!path || typeof path !== "string") {
    return new Response(JSON.stringify({ error: "missing path" }), { status: 400, headers });
  }

  const admin = createClient(url, service, { auth: { autoRefreshToken: false, persistSession: false } });
  const isAdmin = email.endsWith("@mollypay.com");

  const { data: doc } = await admin.from("documentos").select("cliente_legajo").eq("url", path).maybeSingle();
  if (doc) {
    const { data: cli } = await admin.from("clientes").select("correo").eq("legajo", doc.cliente_legajo).maybeSingle();
    if (cli && cli.correo !== email && !isAdmin) {
      return new Response(JSON.stringify({ error: "forbidden" }), { status: 403, headers });
    }
  } else if (!isAdmin) {
    return new Response(JSON.stringify({ error: "forbidden" }), { status: 403, headers });
  }

  const { data: s, error } = await admin.storage.from("kyc").createSignedUrl(path, 3600);
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400, headers });

  return new Response(JSON.stringify({ signedUrl: s.signedUrl }), { headers });
});
