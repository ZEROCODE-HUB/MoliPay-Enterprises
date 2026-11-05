import { createFileRoute } from "@tanstack/react-router";
import { EcommerceLinksPage } from "@/features/payment-links/components/ecommerce-links-page";

export const Route = createFileRoute("/app/link-pago/e-commerce")({
  component: EcommerceLinksPage,
});
