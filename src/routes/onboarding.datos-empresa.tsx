import { createFileRoute } from "@tanstack/react-router";
import { CompanyDataPage } from "@/features/onboarding/components/company-data-page";

export const Route = createFileRoute("/onboarding/datos-empresa")({
  head: () => ({
    meta: [{ title: "Datos de la empresa — Molipay" }, { name: "robots", content: "noindex" }],
  }),
  component: CompanyDataPage,
});
