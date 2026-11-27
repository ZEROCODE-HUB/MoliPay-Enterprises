import { createFileRoute, redirect } from "@tanstack/react-router";

// E-commerce es un producto propio: tiene su menu en /app/ecommerce.
export const Route = createFileRoute("/app/link-pago/e-commerce")({
  beforeLoad: () => {
    throw redirect({ to: "/app/ecommerce/integraciones" });
  },
});
