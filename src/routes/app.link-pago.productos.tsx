import { createFileRoute, redirect } from "@tanstack/react-router";

// Productos paso a E-commerce (son el catalogo de la tienda online).
export const Route = createFileRoute("/app/link-pago/productos")({
  beforeLoad: () => {
    throw redirect({ to: "/app/ecommerce/productos" });
  },
});
