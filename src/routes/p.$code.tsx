import { createFileRoute } from "@tanstack/react-router";
import { CheckoutPage } from "@/features/payment-links/components/checkout-page";

export const Route = createFileRoute("/p/$code")({ component: CheckoutPage });
