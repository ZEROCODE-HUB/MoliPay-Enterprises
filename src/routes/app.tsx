import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import {
  LayoutDashboard,
  ArrowLeftRight,
  Wallet,
  Link2,
  Receipt,
  Upload,
  History,
  UserCog,
  Shield,
  Package,
  Store,
  List,
  ShoppingCart,
  Code2,
  Landmark,
  Plug,
} from "lucide-react";
import { PortalShell, type NavItem } from "@/app/portal-shell";
import { SupportBot } from "@/app/support-bot";
import { useDemoMode } from "@/app/demo-mode";
import { RouteSkeleton } from "@/shared/ui/route-skeleton";
import { useCurrentCustomer, useSessionUser, useSignOut } from "@/features/session/session.hooks";
import { useMfaState } from "@/features/auth/auth.hooks";
import { MfaChallenge } from "@/features/auth/components/mfa-challenge";
import { NewSessionBanner } from "@/features/security/components/new-session-banner";
import { AuthShell, PrimaryButton, SuccessCard } from "@/shared/ui/auth-kit";

export const Route = createFileRoute("/app")({
  component: AppLayout,
  pendingComponent: RouteSkeleton,
});

const nav: NavItem[] = [
  { to: "/app", label: "Dashboard", icon: LayoutDashboard },
  { to: "/app/historial", label: "Historial", icon: History },
  { to: "/app/transferencias", label: "Transferir", icon: ArrowLeftRight },
  { to: "/app/subcuentas", label: "Subcuentas", icon: Wallet },
  { to: "/app/mis-comercios", label: "Mis comercios", icon: Store },
  {
    label: "Link de pago",
    icon: Link2,
    items: [
      { to: "/app/link-pago/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { to: "/app/link-pago/links", label: "Links", icon: Link2 },
    ],
  },
  {
    label: "E-commerce",
    icon: ShoppingCart,
    items: [
      { to: "/app/ecommerce/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { to: "/app/ecommerce/productos", label: "Productos", icon: Package },
      { to: "/app/ecommerce/integraciones", label: "Integraciones", icon: Plug },
    ],
  },
  { to: "/app/servicios", label: "Pago de servicios", icon: Receipt },
  {
    label: "Cobros masivos",
    icon: Upload,
    items: [
      { to: "/app/cobros", label: "Dashboard", icon: LayoutDashboard },
      { to: "/app/cobros/gestion", label: "Gestion de lotes", icon: List },
    ],
  },
  { to: "/app/liquidaciones", label: "Liquidaciones", icon: Landmark },
  { to: "/app/cuenta", label: "Mi cuenta", icon: UserCog },
  { to: "/app/seguridad", label: "Seguridad", icon: Shield },
  { to: "/app/api-config", label: "Config. APIs Externas", icon: Code2 },
];

function AppLayout() {
  const { role, setRole } = useDemoMode();
  const navigate = useNavigate();
  const session = useSessionUser();
  const customer = useCurrentCustomer();
  const mfa = useMfaState();
  const signOut = useSignOut();
  const leave = () =>
    void signOut().finally(() => navigate({ to: "/login", search: { register: undefined } }));

  useEffect(() => {
    if (role !== "empresa") setRole("empresa");
  }, [role, setRole]);

  // Guard: sin sesion no se entra al portal (la base igual protege los datos con RLS).
  useEffect(() => {
    if (session.status === "anonymous") navigate({ to: "/login", search: { register: undefined } });
  }, [session.status, navigate]);

  if (session.status !== "authenticated" || mfa.isPending) return <RouteSkeleton />;

  // Con 2FA activo no se entra con la clave sola: falla cerrado si no se puede verificar.
  if (mfa.isError)
    return (
      <AuthShell leftEyebrow="Seguridad" leftTitle="Verificamos tu sesión.">
        <SuccessCard
          variant="error"
          title="No pudimos verificar la seguridad de tu sesión"
          body="Revisá tu conexión e intentá de nuevo."
        >
          <PrimaryButton onClick={() => void mfa.refetch()}>Reintentar</PrimaryButton>
        </SuccessCard>
      </AuthShell>
    );
  if (mfa.data.challengeRequired)
    return (
      <AuthShell leftEyebrow="Seguridad" leftTitle="Tu cuenta tiene verificación en dos pasos.">
        <MfaChallenge onVerified={() => undefined} onCancel={leave} />
      </AuthShell>
    );

  return (
    <PortalShell
      nav={nav}
      title="Portal Empresa"
      userName={customer.data?.displayName}
      userEmail={session.user?.email ?? undefined}
    >
      <NewSessionBanner />
      <Outlet />
      <SupportBot />
    </PortalShell>
  );
}
