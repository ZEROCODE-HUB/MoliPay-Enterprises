import { createFileRoute } from "@tanstack/react-router";
import { PrivacyPage } from "@/features/legal/components/privacy-page";

export const Route = createFileRoute("/legales/privacidad")({
  head: () => ({
    meta: [
      { title: "Politica de Privacidad — Molly Money Life" },
      { name: "description", content: "Politica de privacidad y tratamiento de datos personales." },
    ],
  }),
  component: PrivacyPage,
});
