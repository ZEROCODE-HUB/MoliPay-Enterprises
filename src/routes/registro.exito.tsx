import { createFileRoute } from "@tanstack/react-router";
import { RegistrationSuccessPage } from "@/features/onboarding/components/registration-success-page";

export const Route = createFileRoute("/registro/exito")({
  head: () => ({
    meta: [{ title: "Registro exitoso — Molipay" }, { name: "robots", content: "noindex" }],
  }),
  component: RegistrationSuccessPage,
});
