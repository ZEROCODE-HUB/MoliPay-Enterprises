import type { ReactNode } from "react";
import { PageHeader } from "@/shared/ui/page-header";
import { useCurrentCustomer } from "../session.hooks";

/** Pantallas que mueven dinero: el servidor tampoco se lo permite a un usuario del equipo. */
export function OwnerOnly({ title, children }: { title: string; children: ReactNode }) {
  const role = useCurrentCustomer().data?.teamRole;
  if (role && role !== "owner") {
    return (
      <>
        <PageHeader title={title} />
        <p className="rounded-lg border bg-card p-5 text-sm text-muted-foreground">
          Solo el titular de la cuenta puede hacer estas operaciones.
        </p>
      </>
    );
  }
  return <>{children}</>;
}
