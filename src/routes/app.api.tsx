import { createFileRoute } from "@tanstack/react-router";
import { DevelopersPage } from "@/features/developers/components/developers-page";

export const Route = createFileRoute("/app/api")({ component: DevelopersPage });
