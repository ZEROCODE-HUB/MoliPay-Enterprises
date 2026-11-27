import { createFileRoute } from "@tanstack/react-router";
import { PaymentLinksDashboardPage } from "@/features/payment-links/components/payment-links-dashboard-page";

export const Route = createFileRoute("/app/ecommerce/dashboard")({
  component: () => <PaymentLinksDashboardPage channel="ecommerce" />,
});
