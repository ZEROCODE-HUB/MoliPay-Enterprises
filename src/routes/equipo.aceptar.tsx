import { createFileRoute } from "@tanstack/react-router";
import { TeamInviteAcceptPage } from "@/features/security/components/team-invite-accept-page";

export const Route = createFileRoute("/equipo/aceptar")({
  validateSearch: (search: Record<string, unknown>) => ({
    token: typeof search.token === "string" ? search.token : "",
  }),
  head: () => ({
    meta: [{ title: "Aceptar invitación — Molipay" }, { name: "robots", content: "noindex" }],
  }),
  component: Page,
});

function Page() {
  const { token } = Route.useSearch();
  return <TeamInviteAcceptPage token={token} />;
}
