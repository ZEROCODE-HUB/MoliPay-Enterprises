import { createFileRoute,redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/registro/empresa")({
  beforeLoad: () => {
    throw redirect({ to: "/login", search: { register: "pj" }, replace: true });
  },
});
