import { createFileRoute } from "@tanstack/react-router";
import { WithdrawalPage } from "@/features/legal/components/withdrawal-page";

export const Route = createFileRoute("/legales/arrepentimiento")({
  head: () => ({
    meta: [
      { title: "Boton de Arrepentimiento — Molly Money Life" },
      {
        name: "description",
        content: "Ejerce tu derecho de arrepentimiento conforme al articulo 34 de la Ley 24.240.",
      },
    ],
  }),
  component: WithdrawalPage,
});
