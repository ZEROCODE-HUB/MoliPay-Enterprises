import { createFileRoute } from "@tanstack/react-router";
import { CollectionBatchPage } from "@/features/collections/components/collection-batch-page";

export const Route = createFileRoute("/app/cobros/lote/$id")({
  component: CollectionBatchPage,
});
