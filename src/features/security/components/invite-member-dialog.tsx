import { useMemo } from "react";
import { applyServerErrors } from "@/shared/forms/apply-server-errors";
import { FieldError } from "@/shared/forms/field-error";
import { useZodForm } from "@/shared/forms/use-zod-form";
import { FormDialog } from "@/shared/ui/form-dialog";
import { Input, Label, Select } from "@/shared/ui/form-controls";
import { TEAM_ROLES } from "../security.rules";
import { createInviteMemberSchema } from "../security.schema";
import { inviteTeamMember } from "../security.supabase";

export function InviteMemberDialog({
  open,
  onClose,
  existingEmails,
  onInvited,
}: {
  open: boolean;
  onClose: () => void;
  existingEmails: string[];
  onInvited: (email: string) => void;
}) {
  const schema = useMemo(() => createInviteMemberSchema(existingEmails), [existingEmails]);
  const form = useZodForm(schema, { defaultValues: { name: "", email: "", role: "operator" } });
  const { errors, isSubmitting } = form.formState;
  const selected = TEAM_ROLES.find((r) => r.value === form.watch("role"));

  const close = () => {
    form.reset();
    onClose();
  };

  const submit = form.handleSubmit(async (member) => {
    try {
      await inviteTeamMember(member);
    } catch (e) {
      applyServerErrors(form, e);
      return;
    }
    form.reset();
    onInvited(member.email);
  });

  return (
    <FormDialog
      open={open}
      onClose={close}
      title="Invitar usuario"
      description="Le enviamos un correo para que cree su contraseña y entre a la cuenta de la empresa."
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
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </Select>
        <p className="mt-1 text-[11px] text-muted-foreground">{selected?.description}</p>
      </div>
      <FieldError message={errors.root?.server?.message} />
    </FormDialog>
  );
}
