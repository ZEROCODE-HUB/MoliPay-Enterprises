import { createClient } from "jsr:@supabase/supabase-js@2";

Deno.serve(async () => {
  const url = Deno.env.get("SUPABASE_URL")!;
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(url, service, { auth: { autoRefreshToken: false, persistSession: false } });
  const deleted: string[] = [];
  let page = 1;
  while (true) {
    const { data } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    const users = data.users ?? [];
    if (users.length === 0) break;
    for (const u of users) {
      if ((u.email ?? "").startsWith("tempadmin")) {
        await admin.auth.admin.deleteUser(u.id);
        deleted.push(u.email!);
      }
    }
    if (users.length < 200) break;
    page++;
  }
  return new Response(JSON.stringify({ deleted }), { headers: { "content-type": "application/json" } });
});
