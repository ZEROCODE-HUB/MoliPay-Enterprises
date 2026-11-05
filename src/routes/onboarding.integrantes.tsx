import { createFileRoute } from "@tanstack/react-router";
import { CompanyMembersPage } from "@/features/onboarding/components/company-members-page";

export const Route = createFileRoute("/onboarding/integrantes")({
  head: () => ({
    meta: [
      { title: "Integrantes de la empresa — Molipay" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CompanyMembersPage,
});
