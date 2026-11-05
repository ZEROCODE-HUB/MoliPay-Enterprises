import { useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/shared/ui/badge";
import { BtnOutline } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { InviteMemberDialog,type InvitedMember } from "./invite-member-dialog";

/* Equipo: datos de ejemplo, la lista vive solo en memoria (no hay tabla de miembros; ver PENDIENTES). */

type Member = { name: string; email: string; role: string; status: "Activa" | "Pendiente" };

const SAMPLE_TEAM: Member[] = [
  { name: "Carla Rivas", email: "carla@empresademo.com", role: "Owner", status: "Activa" },
  { name: "Diego Mendez", email: "diego@empresademo.com", role: "Operador", status: "Activa" },
  {
    name: "Sofia Lopez",
    email: "sofia@empresademo.com",
    role: "Solo lectura",
    status: "Pendiente",
  },
];

export function TeamCard() {
  const [team, setTeam] = useState(SAMPLE_TEAM);
  const [inviteOpen, setInviteOpen] = useState(false);

  const onInvited = (member: InvitedMember) => {
    setTeam((prev) => [...prev, { ...member, status: "Pendiente" }]);
    toast.success(`Invitación enviada a ${member.email}`);
    setInviteOpen(false);
  };

  return (
    <Card>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-semibold">Usuarios del equipo</h3>
        <BtnOutline className="h-9 px-3 text-xs" onClick={() => setInviteOpen(true)}>
          <Plus size={12} /> Invitar
        </BtnOutline>
      </div>
      <div className="divide-y">
        {team.map((m) => (
          <div key={m.email} className="flex items-center justify-between py-3">
            <div>
              <div className="text-sm font-semibold">{m.name}</div>
              <div className="text-xs text-muted-foreground">{m.email}</div>
            </div>
            <div className="flex items-center gap-2">
              <Badge tone="neutral">{m.role}</Badge>
              <Badge tone={m.status === "Activa" ? "success" : "warn"}>{m.status}</Badge>
            </div>
          </div>
        ))}
      </div>
      <InviteMemberDialog
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        existingEmails={team.map((m) => m.email.toLowerCase())}
        onInvited={onInvited}
      />
    </Card>
  );
}
