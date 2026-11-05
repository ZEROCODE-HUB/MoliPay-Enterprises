import { createFileRoute } from "@tanstack/react-router";
import { PersonalDataPage } from "@/features/onboarding/components/personal-data-page";

export const Route = createFileRoute("/onboarding/datos-personales")({
  head: () => ({
    meta: [
      { title: "Validacion de datos personales — Molipay" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PersonalDataPage,
});
