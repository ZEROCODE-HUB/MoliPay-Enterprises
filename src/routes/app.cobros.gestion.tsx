import { createFileRoute } from "@tanstack/react-router";
import { CollectionsManagementPage } from "@/features/collections/components/collections-management-page";

export const Route = createFileRoute("/app/cobros/gestion")({
  component: CollectionsManagementPage,
});
