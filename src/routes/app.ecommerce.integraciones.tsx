import { createFileRoute } from "@tanstack/react-router";
import { EcommerceLinksPage } from "@/features/payment-links/components/ecommerce-links-page";

export const Route = createFileRoute("/app/ecommerce/integraciones")({
  component: EcommerceLinksPage,
});
