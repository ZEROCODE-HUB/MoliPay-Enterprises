import { createFileRoute } from "@tanstack/react-router";
import { ProductsPage } from "@/features/payment-links/components/products-page";

export const Route = createFileRoute("/app/link-pago/links")({
  component: () => <ProductsPage section="links" />,
});
