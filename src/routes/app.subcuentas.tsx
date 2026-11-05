import { createFileRoute } from "@tanstack/react-router";
import { SubaccountsPage } from "@/features/accounts/components/subaccounts-page";

export const Route = createFileRoute("/app/subcuentas")({ component: SubaccountsPage });
