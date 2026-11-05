import { createFileRoute } from "@tanstack/react-router";
import { ResetPasswordPage } from "@/features/auth/components/reset-password-page";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [{ title: "Restablecer contraseña — MoliPay" }, { name: "robots", content: "noindex" }],
  }),
  component: ResetPasswordPage,
});
