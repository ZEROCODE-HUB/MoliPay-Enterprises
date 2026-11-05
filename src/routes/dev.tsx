import { createFileRoute, notFound } from "@tanstack/react-router";
import { DevHubPage } from "@/features/dev-hub/components/dev-hub-page";

// Solo en desarrollo: en produccion responde 404.
export const Route = createFileRoute("/dev")({
  beforeLoad: () => {
    if (!import.meta.env.DEV) throw notFound();
  },
  head: () => ({
    meta: [{ title: "Desarrollo — MoliPay" }, { name: "robots", content: "noindex, nofollow" }],
  }),
  component: DevHubPage,
});
