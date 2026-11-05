import { createFileRoute } from "@tanstack/react-router";
import { EmailValidatedPage } from "@/features/onboarding/components/email-validated-page";

export const Route = createFileRoute("/registro/validacion-exitosa")({
  head: () => ({
    meta: [{ title: "Correo validado — MoliPay" }, { name: "robots", content: "noindex" }],
  }),
  component: EmailValidatedPage,
});
