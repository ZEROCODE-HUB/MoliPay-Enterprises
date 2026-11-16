import { createFileRoute } from "@tanstack/react-router";
import { PersonalDataEntry } from "@/features/onboarding/components/personal-data-entry";

export const Route = createFileRoute("/onboarding/datos-personales")({
  head: () => ({
    meta: [
      { title: "Validacion de datos personales — Molipay" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PersonalDataEntry,
});
