import { createFileRoute } from "@tanstack/react-router";
import { KycPage } from "@/features/onboarding/components/kyc-page";

export const Route = createFileRoute("/onboarding/kyc")({
  head: () => ({
    meta: [{ title: "Validacion KYC — Molipay" }, { name: "robots", content: "noindex" }],
  }),
  component: KycPage,
});
