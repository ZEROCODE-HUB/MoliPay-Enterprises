import { createFileRoute } from "@tanstack/react-router";
import { ApiSetupPage } from "@/features/developers/components/api-setup-page";

export const Route = createFileRoute("/app/api-config")({
  head: () => ({
    meta: [
      { title: "Configuración de APIs Externas — MoliPay" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ApiSetupPage,
});
