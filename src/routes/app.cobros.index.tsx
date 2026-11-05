import { createFileRoute } from "@tanstack/react-router";
import { CollectionsPage } from "@/features/collections/components/collections-page";

export const Route = createFileRoute("/app/cobros/")({ component: CollectionsPage });
