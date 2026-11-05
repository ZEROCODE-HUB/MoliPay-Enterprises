import { createFileRoute } from "@tanstack/react-router";
import { VerifyEmailPage } from "@/features/auth/components/verify-email-page";

export const Route = createFileRoute("/verificar-correo")({
  validateSearch: (search: Record<string, string | undefined>) => ({
    token: (search.token as string) ?? "",
  }),
  head: () => ({
    meta: [{ title: "Verificar correo — MoliPay" }, { name: "robots", content: "noindex" }],
  }),
  component: VerifyEmailPage,
});
