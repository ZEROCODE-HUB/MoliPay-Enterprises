import { createFileRoute } from "@tanstack/react-router";
import { ServicesPage } from "@/features/services/components/services-page";

export const Route = createFileRoute("/app/servicios")({ component: ServicesPage });
