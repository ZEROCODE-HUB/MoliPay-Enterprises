import { createFileRoute } from "@tanstack/react-router";
import { RecoverPasswordPage } from "@/features/auth/components/recover-password-page";

export const Route = createFileRoute("/recuperar")({
  validateSearch: (search: Record<string, string | undefined>) => ({
    email: (search.email as string) ?? "",
  }),
  head: () => ({
    meta: [{ title: "Recuperar contraseña — MoliPay" }, { name: "robots", content: "noindex" }],
  }),
  component: RecoverPasswordPage,
});
