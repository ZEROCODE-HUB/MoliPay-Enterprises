import { createFileRoute } from "@tanstack/react-router";
import { RecipientsPage } from "@/features/transfers/components/recipients-page";

export const Route = createFileRoute("/app/destinatarios")({ component: RecipientsPage });
