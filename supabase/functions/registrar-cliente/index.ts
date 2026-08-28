// Edge Function: registro inicial del portal empresas.
// 1) Crea el usuario en Supabase Auth SIN confirmar (admin_via_edge=true para que
//    el trigger on_auth_admin_user_created NO cree fila en admin_users).
// 2) Genera un token de verificación de correo y lo persiste.
// 3) Envía el email de verificación por Resend con el link /verificar-correo.
// Rollback: si falla el envío, borra el usuario para poder reintentar.

import { createClient } from "jsr:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  const url = Deno.env.get("SUPABASE_URL");
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !service) return json({ error: "Falta configuración del servidor" }, 500);

  let body: any;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Body inválido" }, 400);
  }

  const { email, password, nombre, apellido, fechaNac, tipoCuenta } = body ?? {};
  if (!email || !password || !nombre || !apellido || !tipoCuenta) {
    return json({ error: "Faltan datos del registro" }, 400);
  }

  const sb = createClient(url, service, { auth: { autoRefreshToken: false } });

  const { data: authData, error: authErr } = await sb.auth.admin.createUser({
    email,
    password,
    email_confirm: false,
    user_metadata: { admin_via_edge: true, nombre, apellido, tipoCuenta },
  });
  if (authErr || !authData.user) {
    return json({ error: authErr?.message ?? "No se pudo crear el usuario" }, 400);
  }
  const authId = authData.user.id;

  try {
    const token = crypto.randomUUID();
    const expires = new Date(Date.now() + 24 * 3600 * 1000).toISOString();
    const { error: tErr } = await sb.from("verificaciones_correo").insert({
      token,
      user_id: authId,
      correo: email,
      expires_at: expires,
    });
    if (tErr) throw tErr;

    await sendVerificationEmail(email, `${nombre} ${apellido}`.trim(), token);
    return json({ ok: true, email });
  } catch (e: any) {
    await sb.auth.admin.deleteUser(authId);
    return json({ error: e?.message ?? "No se pudo enviar el correo de verificación" }, 400);
  }
});

async function sendVerificationEmail(email: string, nombre: string, token: string) {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  const appUrl = Deno.env.get("APP_URL") || "http://localhost:5173";
  const from = Deno.env.get("RESEND_FROM") || "Molipay <altas@molipay.com.ar>";
  if (!apiKey) throw new Error("Falta RESEND_API_KEY");

  const link = `${appUrl}/verificar-correo?token=${token}`;
  const html = `
  <!doctype html>
  <html lang="es">
    <body style="margin:0;padding:0;background:#f4f4f5;font-family:'Inter',Arial,Helvetica,sans-serif;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 0;">
        <tr>
          <td align="center">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
              <tr>
                <td style="background:#0a0a0a;padding:22px 32px;">
                  <span style="color:#ffffff;font-weight:700;font-size:20px;letter-spacing:-0.02em;">Moli<span style="color:#e11d48;">pay</span></span>
                </td>
              </tr>
              <tr>
                <td style="padding:32px 32px 4px;">
                  <h1 style="margin:0;font-size:22px;color:#111827;font-weight:700;">Hola ${nombre},</h1>
                </td>
              </tr>
              <tr>
                <td style="padding:12px 32px 24px;">
                  <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#374151;">
                    Muchas gracias por registrarte en <a href="https://molipay.com.ar" style="color:#e11d48;font-weight:600;text-decoration:none;">Molipay</a>.
                  </p>
                  <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#374151;">
                    Para poder ingresar a la plataforma primero debes validar tu correo electrónico. Para realizarlo haz click en el botón debajo.
                  </p>
                  <table role="presentation" cellpadding="0" cellspacing="0">
                    <tr>
                      <td align="center" style="border-radius:8px;background:#e11d48;">
                        <a href="${link}" target="_blank" style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;">Validar mi correo</a>
                      </td>
                    </tr>
                  </table>
                  <p style="margin:28px 0 0;font-size:14px;line-height:1.6;color:#6b7280;">
                    Si tienes una duda o inconveniente puedes contactarnos en <a href="mailto:soporte@molipay.com.ar" style="color:#e11d48;text-decoration:none;">soporte@molipay.com.ar</a>
                  </p>
                  <p style="margin:8px 0 0;font-size:14px;line-height:1.6;color:#6b7280;">¡Muchas gracias!</p>
                </td>
              </tr>
              <tr>
                <td style="padding:20px 32px;background:#fafafa;border-top:1px solid #f0f0f0;">
                  <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center;">© MoliPay. Todos los derechos reservados.</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
  </html>`;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from,
      to: [email],
      subject: "Verifica tu correo electrónico · Molipay",
      html,
      text: `Hola ${nombre}, muchas gracias por registrarte en Molipay. Valida tu correo para ingresar a la plataforma: ${link}`,
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error("No se pudo enviar el correo: " + t);
  }
}

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...CORS, "content-type": "application/json" },
  });
}
