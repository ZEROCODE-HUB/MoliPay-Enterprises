import { createFileRoute } from "@tanstack/react-router";
import { OwnerOnly } from "@/features/session/components/owner-only";
import { TransfersPage } from "@/features/transfers/components/transfers-page";

export const Route = createFileRoute("/app/transferencias")({
  component: () => (
    <OwnerOnly title="Transferencias">
      <TransfersPage />
    </OwnerOnly>
  ),
});
