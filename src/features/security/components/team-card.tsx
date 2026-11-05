import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { useCurrentCustomer, useSessionUser } from "@/features/session/session.hooks";
import { userMessage } from "@/shared/lib/errors";
import { Badge } from "@/shared/ui/badge";
import { BtnOutline } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { useConfirm } from "@/shared/ui/confirm-provider";
import { securityKeys, securityQueries } from "../security.queries";
import { TEAM_ROLES, teamRoleLabel } from "../security.rules";
import { resendTeamInvite, revokeTeamMember, updateTeamMemberRole } from "../security.supabase";
import type { TeamMember } from "../security.types";
import { InviteMemberDialog } from "./invite-member-dialog";

export function TeamCard() {
  const userId = useSessionUser().user?.id ?? "";
  const customer = useCurrentCustomer().data;
  const qc = useQueryClient();
  const askConfirm = useConfirm();
  const [inviteOpen, setInviteOpen] = useState(false);
  const query = useQuery({ ...securityQueries.team(userId), enabled: !!userId });
  const members = query.data ?? [];
  const canManage = customer?.teamRole === "owner" || customer?.teamRole === "admin";

  const action = useMutation({
    mutationFn: (run: () => Promise<unknown>) => run(),
    onSuccess: () => void qc.invalidateQueries({ queryKey: securityKeys.team(userId) }),
    onError: (e) => toast.error(userMessage(e)),
  });

  const revoke = async (m: TeamMember) => {
    const ok = await askConfirm({
      title: m.status === "invited" ? "Cancelar invitación" : "Quitar usuario",
      message:
        m.status === "invited"
          ? `El enlace enviado a ${m.email} dejará de funcionar.`
          : `${m.name} perderá el acceso a la cuenta de inmediato.`,
      confirmLabel: m.status === "invited" ? "Cancelar invitación" : "Quitar",
      variant: "danger",
    });
    if (ok && m.id) action.mutate(() => revokeTeamMember(m.id as string));
  };

  return (
    <Card>
      <div className="mb-1 flex items-center justify-between">
        <h3 className="font-semibold">Usuarios del equipo</h3>
        {canManage && (
          <BtnOutline className="h-9 px-3 text-xs" onClick={() => setInviteOpen(true)}>
            <Plus size={12} /> Invitar
          </BtnOutline>
        )}
      </div>
      <p className="mb-3 text-xs text-muted-foreground">
        Cada persona entra con su propio usuario. Solo el titular puede mover dinero.
      </p>

      {query.isError && <p className="py-3 text-sm text-red-700">{userMessage(query.error)}</p>}
      {query.isPending && <p className="py-3 text-sm text-muted-foreground">Cargando…</p>}

      <div className="divide-y">
        {members.map((m) => {
          const editable = canManage && !!m.id && !m.isSelf;
          return (
            <div
              key={m.id ?? "owner"}
              className="flex flex-wrap items-center justify-between gap-2 py-3"
            >
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold">
                  {m.name}
                  {m.isSelf && <span className="font-normal text-muted-foreground"> (vos)</span>}
                </div>
                <div className="truncate text-xs text-muted-foreground">{m.email}</div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {editable ? (
                  <select
                    aria-label={`Rol de ${m.name}`}
                    className="h-8 rounded-md border bg-background px-2 text-xs"
                    value={m.role}
                    disabled={action.isPending}
                    onChange={(e) =>
                      action.mutate(() => updateTeamMemberRole(m.id as string, e.target.value))
                    }
                  >
                    {TEAM_ROLES.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <Badge tone="neutral">{teamRoleLabel(m.role)}</Badge>
                )}
                <Badge tone={m.status === "active" ? "success" : "warn"}>
                  {m.status === "active" ? "Activa" : "Pendiente"}
                </Badge>
                {editable && m.status === "invited" && (
                  <button
                    type="button"
                    className="text-xs font-semibold text-primary hover:underline disabled:opacity-50"
                    disabled={action.isPending}
                    onClick={() =>
                      action.mutate(() =>
                        resendTeamInvite(m.id as string).then(() =>
                          toast.success(`Invitación reenviada a ${m.email}`),
                        ),
                      )
                    }
                  >
                    Reenviar
                  </button>
                )}
                {editable && (
                  <button
                    type="button"
                    className="text-xs font-semibold text-red-600 hover:underline disabled:opacity-50"
                    disabled={action.isPending}
                    onClick={() => void revoke(m)}
                  >
                    Quitar
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {canManage && (
        <InviteMemberDialog
          open={inviteOpen}
          onClose={() => setInviteOpen(false)}
          existingEmails={members.map((m) => m.email.toLowerCase())}
          onInvited={(email) => {
            toast.success(`Invitación enviada a ${email}`);
            setInviteOpen(false);
            void qc.invalidateQueries({ queryKey: securityKeys.team(userId) });
          }}
        />
      )}
    </Card>
  );
}
