import { useMemo } from "react";
import { useAuthActions } from "@/features/auth/auth.hooks";
import { FieldError } from "@/shared/forms/field-error";
import { useZodForm } from "@/shared/forms/use-zod-form";
import { FormDialog } from "@/shared/ui/form-dialog";
import { Input,Label,Select } from "@/shared/ui/form-controls";
import { TEAM_ROLES,createInviteMemberSchema } from "../security.schema";

export type InvitedMember = { name: string; email: string; role: (typeof TEAM_ROLES)[number] };

export function InviteMemberDialog({
  open,
  onClose,
  existingEmails,
  onInvited,
}: {
  open: boolean;
  onClose: () => void;
  existingEmails: string[];
  onInvited: (member: InvitedMember) => void;
}) {
  const { sendSignInLink } = useAuthActions();
  const schema = useMemo(() => createInviteMemberSchema(existingEmails), [existingEmails]);
  const form = useZodForm(schema, { defaultValues: { name: "", email: "", role: "Operador" } });
  const { errors, isSubmitting } = form.formState;

  const close = () => {
    form.reset();
    onClose();
  };

  const submit = form.handleSubmit(async (member) => {
    // Comportamiento heredado: el enlace de acceso hace de invitacion y si falla se
    // registra igual en la lista (que hoy es local). Ver PENDIENTES antes de usarlo en serio.
    try {
      await sendSignInLink(member.email);
    } catch {
      /* fallback silencioso heredado */
    }
    onInvited(member);
    form.reset();
  });

  return (
    <FormDialog
      open={open}
      onClose={close}
      title="Invitar miembro del equipo"
      description="Enviá una invitación por email para que se una a tu empresa."
      submitLabel="Enviar invitación"
      onSubmit={submit}
      isSubmitting={isSubmitting}
    >
      <div>
        <Label htmlFor="invite-name">Nombre completo</Label>
        <Input id="invite-name" placeholder="Ej. Juan Pérez" autoFocus {...form.register("name")} />
        <FieldError message={errors.name?.message} />
      </div>
      <div>
        <Label htmlFor="invite-email">Email</Label>
        <Input
          id="invite-email"
          type="email"
          placeholder="juan@empresa.com"
          {...form.register("email")}
        />
        <FieldError message={errors.email?.message} />
      </div>
      <div>
        <Label htmlFor="invite-role">Rol</Label>
        <Select id="invite-role" {...form.register("role")}>
          {TEAM_ROLES.map((r) => (
            <option key={r}>{r}</option>
          ))}
        </Select>
        <p className="mt-1 text-[11px] text-muted-foreground">
          El invitado quedará en estado Pendiente hasta aceptar.
        </p>
      </div>
    </FormDialog>
  );
}
