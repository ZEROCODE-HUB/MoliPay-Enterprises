import { useCurrentCustomer } from "@/features/session/session.hooks";
import { PageHeader } from "@/shared/ui/page-header";
import { PasswordChangeCard } from "./password-change-card";
import { SecurityActivityCard } from "./security-activity-card";
import { SessionsCard } from "./sessions-card";
import { TeamCard } from "./team-card";
import { TwoFactorCard } from "./two-factor-card";

export function SecurityPage() {
  const isCompany = useCurrentCustomer().data?.personType === "company";
  return (
    <>
      <PageHeader
        title="Seguridad"
        description={
          isCompany
            ? "Contraseña, 2FA, sesiones activas, equipo y auditoría."
            : "Contraseña, 2FA, sesiones activas y auditoría."
        }
      />
      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <PasswordChangeCard />
        <div className="space-y-6">
          <TwoFactorCard />
        </div>
      </div>
      <div className="mb-6 grid gap-6 lg:grid-cols-[1fr_1fr]">
        <SessionsCard />
        {isCompany && <TeamCard />}
      </div>
      <SecurityActivityCard />
    </>
  );
}
