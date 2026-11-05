import { createFileRoute } from "@tanstack/react-router";
import { SecurityPage } from "@/features/security/components/security-page";

export const Route = createFileRoute("/app/seguridad")({ component: SecurityPage });
