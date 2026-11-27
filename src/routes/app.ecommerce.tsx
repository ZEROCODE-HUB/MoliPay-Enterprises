import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/app/ecommerce")({
  beforeLoad: ({ location }) => {
    if (location.pathname === "/app/ecommerce" || location.pathname === "/app/ecommerce/") {
      throw redirect({ to: "/app/ecommerce/dashboard" });
    }
  },
  component: Layout,
});

function Layout() {
  return <Outlet />;
}
