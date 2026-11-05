import { createFileRoute,Outlet } from "@tanstack/react-router";
import { PageHeader } from "@/shared/ui/page-header";

export const Route = createFileRoute("/app/cobros")({
  component: Layout,
});

function Layout() {
  return (
    <>
      <PageHeader
        title="Cobros Masivos"
        description="Automatiza la generacion de cobros recurrentes: links de pago, codigos QR y CBU para cada deudor."
      />
      <Outlet />
    </>
  );
}
