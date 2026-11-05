import { createFileRoute } from "@tanstack/react-router";
import { SettlementsPage } from "@/features/settlements/components/settlements-page";

export const Route = createFileRoute("/app/liquidaciones")({ component: SettlementsPage });
