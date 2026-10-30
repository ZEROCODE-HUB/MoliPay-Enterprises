import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { ExternalLink, BookOpen, X } from "lucide-react";
import { Card, BtnPrimary, BtnOutline, Badge } from "@/components/portal-shell";
import { cargarEstadoApi, type EstadoIntegracion } from "@/lib/api-desarrolladores";

export const Route = createFileRoute("/app/api-config")({
  head: () => ({
    meta: [
      { title: "Configuracion de APIs Externas — Molipay" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Page,
});

const ESTADO_TEXTO: Record<EstadoIntegracion, string> = {
  Pendiente_Validacion: "Tu solicitud está pendiente de validación.",
  Homologacion: "Tu Sandbox está activo: podés probar la API sin mover dinero real.",
  Pendiente_Pase_Produccion: "Pediste el pase a producción y MoliPay lo está revisando.",
  Produccion: "La API está habilitada en Producción para tu cuenta.",
  Suspendido: "La API está suspendida para tu cuenta. Consultá a soporte.",
  Revocado: "Tu integración fue revocada. Podés empezar de nuevo con un Sandbox.",
};

function Page() {
  const navigate = useNavigate();
  const [modalOpen, setModalOpen] = useState(false);
  const q = useQuery({ queryKey: ["api-desarrolladores"], queryFn: cargarEstadoApi });
  const estado = q.data?.integracion?.estado;
  const habilitado = !!estado && estado !== "Revocado" && estado !== "Pendiente_Validacion";

  // Habilitar = generar las llaves de Sandbox en API e integraciones, donde
  // la Secret Key se muestra una sola vez. El pase a Producción se pide ahí.
  const habilitar = () => {
    setModalOpen(false);
    toast.info("Tocá «Generar llaves de Sandbox» para obtener tu API Key y tu Secret Key.");
    void navigate({ to: "/app/api" });
  };

  return (
    <>
      {/* Breadcrumb */}
      <nav className="text-xs text-muted-foreground mb-4 flex items-center gap-1.5">
        <Link to="/app" className="hover:text-foreground transition">Inicio</Link>
        <span>/</span>
        <span className="text-foreground font-semibold">Configuracion de APIs Externas</span>
      </nav>

      {/* Title */}
      <div className="mb-6">
        <h1 className="text-xl font-semibold">Configuracion de APIs Externas</h1>
        <p className="text-sm text-muted-foreground mt-2 max-w-2xl">
          Gestione el acceso a las APIs externas de la plataforma: credenciales de Sandbox y Producción, webhooks y permisos.
        </p>
      </div>

      {/* Action card */}
      <Card className="max-w-xl">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
          <div className="flex-1">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              Modulo de APIs Externas
              {estado && <Badge tone={estado === "Produccion" ? "success" : estado === "Suspendido" || estado === "Revocado" ? "danger" : "warn"}>{estado === "Homologacion" ? "Sandbox" : estado === "Produccion" ? "Producción" : estado.replace(/_/g, " ")}</Badge>}
            </h2>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              {q.isLoading
                ? "Cargando…"
                : estado
                  ? ESTADO_TEXTO[estado]
                  : "Este modulo le permite integrar sus sistemas (ERP, e-commerce, software contable) con las APIs de Molipay. Actualmente no esta habilitado para su cuenta."}
            </p>
          </div>
          <div className="flex flex-col gap-2 shrink-0">
            <Link
              to="/app/api"
              hash="como-firmar"
              className="inline-flex h-9 items-center gap-2 px-4 text-sm font-semibold rounded-md border bg-card hover:bg-muted transition whitespace-nowrap"
            >
              <BookOpen size={14} /> Ver documentacion
            </Link>
            {habilitado ? (
              <BtnPrimary onClick={() => void navigate({ to: "/app/api" })}>
                <ExternalLink size={14} /> Ir a API e integraciones
              </BtnPrimary>
            ) : (
              <BtnPrimary onClick={() => setModalOpen(true)} disabled={estado === "Pendiente_Validacion"}>
                <ExternalLink size={14} /> Solicitar habilitacion
              </BtnPrimary>
            )}
          </div>
        </div>
      </Card>

      {/* Modal de solicitud */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setModalOpen(false)} />
          <div
            className="relative bg-card rounded-lg max-w-md w-full p-6 shadow-xl text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setModalOpen(false)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
            >
              <X size={16} />
            </button>
            <div className="mb-4 mt-2">
              <div className="w-14 h-14 mx-auto rounded-full bg-muted flex items-center justify-center">
                <ExternalLink size={24} className="text-muted-foreground" />
              </div>
            </div>
            <h3 className="text-base font-semibold mb-2">
              El modulo de APIs externas no esta habilitado para su cuenta.
            </h3>
            <p className="text-sm text-muted-foreground mb-6">
              ¿Desea habilitar el Sandbox? Se activa en el momento y no mueve dinero real. Para operar en Producción, después
              solicitás el pase y MoliPay lo aprueba.
            </p>
            <div className="flex gap-3 justify-center">
              <BtnOutline onClick={() => setModalOpen(false)}>Cancelar</BtnOutline>
              <BtnPrimary onClick={habilitar}>
                Habilitar Sandbox
              </BtnPrimary>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
