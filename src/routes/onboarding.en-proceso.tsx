import { createFileRoute } from "@tanstack/react-router";
import { OnboardingStatusPage } from "@/features/onboarding/components/onboarding-status-page";

export const Route = createFileRoute("/onboarding/en-proceso")({
  head: () => ({
    meta: [{ title: "Solicitud enviada — Molipay" }, { name: "robots", content: "noindex" }],
  }),
  component: OnboardingStatusPage,
});
