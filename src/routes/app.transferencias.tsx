import { createFileRoute } from "@tanstack/react-router";
import { TransfersPage } from "@/features/transfers/components/transfers-page";

export const Route = createFileRoute("/app/transferencias")({ component: TransfersPage });
