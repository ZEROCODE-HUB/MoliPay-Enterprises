import { createFileRoute,redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/registro")({
  head: () => ({
    meta: [
      { title: "Crear una cuenta — MoliPay" },
      { name: "description", content: "Registrate en MoliPay." },
      { name: "robots", content: "noindex" },
    ],
  }),
  beforeLoad: ({ location }) => {
    if (location.pathname.replace(/\/+$/, "") === "/registro") {
      throw redirect({ to: "/login", search: { register: "pf" }, replace: true });
    }
  },
});
