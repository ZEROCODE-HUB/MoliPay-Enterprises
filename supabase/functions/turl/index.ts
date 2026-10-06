import { createClient } from "jsr:@supabase/supabase-js@2";

Deno.serve(async () => {
  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(url, service, { auth: { autoRefreshToken: false, persistSession: false } });

    const email = "tempadmin_" + Date.now() + "@mollypay.com";
    const pw = "Test1234!";
    const { data: c, error: ce } = await admin.auth.admin.createUser({ email, password: pw, email_confirm: true });
    if (ce) return new Response(JSON.stringify({ step: "createUser", err: ce.message }), { headers: { "content-type": "application/json" } });
    const uid = c.user?.id;

    const sb = createClient(url, anon, { auth: { autoRefreshToken: false, persistSession: false } });
    const { data: si, error: se } = await sb.auth.signInWithPassword({ email, password: pw });
    if (se) return new Response(JSON.stringify({ step: "signIn", err: se.message, data: si }), { headers: { "content-type": "application/json" } });
    if (!si.session) return new Response(JSON.stringify({ step: "noSession", hasSession: !!si.session }), { headers: { "content-type": "application/json" } });
    const token = si.session.access_token;

    const r = await fetch(`${url}/functions/v1/doc-url`, {
      method: "POST",
      headers: { "content-type": "application/json", apikey: anon, Authorization: `Bearer ${token}` },
      body: JSON.stringify({ paths: ["LPF-98622456312/id_frente.jfif", "LPF-98622456312/selfie.png"] }),
    });
    const out = await r.json();
    out.status = r.status;

    if (uid) await admin.auth.admin.deleteUser(uid);
    return new Response(JSON.stringify(out), { headers: { "content-type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ step: "throw", err: String(e) }), { headers: { "content-type": "application/json" } });
  }
});
