import { createFileRoute } from "@tanstack/react-router";
import { NewCollectionPage } from "@/features/collections/components/new-collection-page";

export const Route = createFileRoute("/app/cobros/nuevo")({ component: NewCollectionPage });
