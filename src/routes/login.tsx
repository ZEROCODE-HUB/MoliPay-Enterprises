import { createFileRoute } from "@tanstack/react-router";
import { LoginPage } from "@/features/auth/components/login-page";

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, string | undefined>) => ({
    register: search.register as "pf" | "pj" | undefined,
  }),
  head: () => ({
    meta: [
      { title: "Ingresar — MoliPay" },
      {
        name: "description",
        content: "Accede al portal de MoliPay. Plataforma de pagos digitales bajo normativa BCRA.",
      },
    ],
  }),
  component: LoginPage,
});
