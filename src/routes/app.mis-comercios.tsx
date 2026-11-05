import { createFileRoute } from "@tanstack/react-router";
import { MerchantsPage } from "@/features/merchants/components/merchants-page";

export const Route = createFileRoute("/app/mis-comercios")({ component: MerchantsPage });
