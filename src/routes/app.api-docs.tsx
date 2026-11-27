import { createFileRoute } from "@tanstack/react-router";
import { ApiDocsPage } from "@/features/developers/components/api-docs-page";

export const Route = createFileRoute("/app/api-docs")({
  head: () => ({
    meta: [{ title: "Documentación de la API — MoliPay" }, { name: "robots", content: "noindex" }],
  }),
  component: ApiDocsPage,
});
