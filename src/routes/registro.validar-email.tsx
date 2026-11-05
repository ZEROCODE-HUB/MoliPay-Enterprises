import { createFileRoute } from "@tanstack/react-router";
import { EmailValidationDemoPage } from "@/features/onboarding/components/email-validation-demo-page";

export const Route = createFileRoute("/registro/validar-email")({
  head: () => ({
    meta: [{ title: "Validar correo — MoliPay" }, { name: "robots", content: "noindex" }],
  }),
  component: EmailValidationDemoPage,
});
