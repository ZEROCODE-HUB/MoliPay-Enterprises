import { createFileRoute } from "@tanstack/react-router";
import { EcommercePage } from "@/features/payment-links/components/ecommerce-page";

export const Route = createFileRoute("/app/ecommerce")({ component: EcommercePage });
