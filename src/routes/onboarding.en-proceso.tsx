import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AuthShell, PrimaryButton, SuccessCard } from "@/components/onboarding";
import { requireSupabase } from "@/lib/supabase";
import { ESTADO_LABEL, normalizarEstado, siguientePasoOnboarding } from "@/lib/cliente-estados";

export const Route = createFileRoute("/onboarding/en-proceso")({
  head: () => ({
    meta: [
      { title: "Solicitud enviada — Molipay" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: EnProceso,
});

function EnProceso() {
  const nav = useNavigate();
  const [estado, setEstado] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const s = requireSupabase();
        const { data: u } = await s.auth.getUser();
        const mail = u.user?.email;
        if (!mail) return;
        const { data: cli } = await s.from("clientes").select("estado").eq("correo", mail).maybeSingle();
        if (cli?.estado) setEstado(cli.estado as string);
      } catch {
        // noop
      }
    })();
  }, []);

  const norm = estado ? normalizarEstado(estado) : null;
  const label = norm ? ESTADO_LABEL[norm] : "En proceso";
  const paso = norm ? siguientePasoOnboarding(norm) : "Tu alta fue registrada y esta siendo validada por nuestro equipo de compliance.";

  return (
    <AuthShell
      leftEyebrow="Paso 6 · Revision"
      leftTitle="Tu solicitud fue enviada."
      leftBody={paso}
      step={label}
    >
      <SuccessCard
        variant={norm === "deshabilitado" || norm === "eliminado" ? "error" : norm === "activado" ? "success" : "info"}
        title={norm ? label : "Solicitud enviada"}
        body={
          <>
            <p>
              {norm === "pendiente_verificacion" && "Verifica tu correo para pasar a Registrado."}
              {norm === "registrado" && "Tu documentacion esta en revision. Permaneceras en Registrado hasta que Admin apruebe."}
              {norm === "preactivado" && "Documentacion aprobada (Preactivado). Falta generar tu CBU y cargar tu comision para activar."}
              {norm === "activado" && "Tu cuenta ya esta Activada. Podes operar."}
              {norm === "suspendido" && "Tu cuenta esta Suspendida temporalmente. Contacta a soporte."}
              {norm === "deshabilitado" && "Tu cuenta fue Deshabilitada. CBU cancelado, historial conservado para auditoria BCRA."}
              {norm === "eliminado" && "Tu cuenta fue Eliminada."}
              {!norm && "Tu alta fue registrada y esta siendo validada por nuestro equipo de compliance. Este proceso puede demorar hasta 24 horas habiles. Te avisaremos por correo cuando quede habilitada."}
            </p>
            <p className="mt-3 text-xs text-black-400">
              Si tenés algún problema,{" "}
              <a href="mailto:soporte@molipay.com.ar" className="underline underline-offset-2 hover:text-red-500">
                contactanos
              </a>
              .
            </p>
          </>
        }
      >
        <PrimaryButton onClick={() => nav({ to: norm === "activado" ? "/app" : "/login", search: { register: undefined } })}>
          {norm === "activado" ? "Ir al dashboard" : "Ir a iniciar sesion"}
        </PrimaryButton>
      </SuccessCard>
    </AuthShell>
  );
}
