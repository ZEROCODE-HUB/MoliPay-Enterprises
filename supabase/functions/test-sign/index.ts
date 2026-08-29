import { createClient } from "jsr:@supabase/supabase-js@2";

Deno.serve(async (req) => {
  const url = Deno.env.get("SUPABASE_URL")!;
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(url, service, { auth: { autoRefreshToken: false, persistSession: false } });
  const r = await admin.storage.from("kyc").createSignedUrl("LPF-98622456312/id_frente.jfif", 600);
  return new Response(JSON.stringify({ signedUrl: r.data?.signedUrl ?? null, err: r.error?.message ?? null }), {
    headers: { "content-type": "application/json" },
  });
});
