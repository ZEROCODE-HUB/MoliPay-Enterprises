import { createFileRoute,Outlet,useNavigate } from "@tanstack/react-router";
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
} from "lucide-react";
import { PortalShell,type NavItem } from "@/app/portal-shell";
import { SupportBot } from "@/app/support-bot";
import { useDemoMode } from "@/app/demo-mode";
import { RouteSkeleton } from "@/shared/ui/route-skeleton";
import { useCurrentCustomer,useSessionUser } from "@/features/session/session.hooks";

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
      { to: "/app/link-pago/productos", label: "Productos", icon: Package },
      { to: "/app/link-pago/e-commerce", label: "E-commerce", icon: ShoppingCart },
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

  useEffect(() => {
    if (role !== "empresa") setRole("empresa");
  }, [role, setRole]);

  // Guard: sin sesion no se entra al portal (la base igual protege los datos con RLS).
  useEffect(() => {
    if (session.status === "anonymous") navigate({ to: "/login", search: { register: undefined } });
  }, [session.status, navigate]);

  if (session.status !== "authenticated") return <RouteSkeleton />;

  return (
    <PortalShell
      nav={nav}
      title="Portal Empresa"
      userName={customer.data?.displayName}
      userEmail={session.user?.email ?? undefined}
    >
      <Outlet />
      <SupportBot />
    </PortalShell>
  );
}
