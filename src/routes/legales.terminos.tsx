import { createFileRoute } from "@tanstack/react-router";
import { TermsPage } from "@/features/legal/components/terms-page";

export const Route = createFileRoute("/legales/terminos")({
  head: () => ({
    meta: [
      { title: "Terminos y Condiciones — Molly Money Life" },
      {
        name: "description",
        content: "Terminos y condiciones de uso de la plataforma Molly Money Life.",
      },
    ],
  }),
  component: TermsPage,
});
