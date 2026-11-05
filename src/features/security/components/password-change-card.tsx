import { CheckCircle2,Key } from "lucide-react";
import { toast } from "sonner";
import { useAuthActions } from "@/features/auth/auth.hooks";
import { applyServerErrors } from "@/shared/forms/apply-server-errors";
import { FieldError } from "@/shared/forms/field-error";
import { useZodForm } from "@/shared/forms/use-zod-form";
import { BtnPrimary } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { Input,Label } from "@/shared/ui/form-controls";
import { changePasswordSchema } from "../security.schema";

export function PasswordChangeCard() {
  const { changePassword } = useAuthActions();
  const form = useZodForm(changePasswordSchema, {
    defaultValues: { current: "", next: "", confirm: "" },
  });
  const { errors, isSubmitting } = form.formState;

  const submit = form.handleSubmit(async ({ current, next }) => {
    try {
      await changePassword(current, next);
    } catch (e) {
      applyServerErrors(form, e);
      return;
    }
    toast.success("Contraseña actualizada correctamente");
    form.reset();
  });

  return (
    <Card>
      <h3 className="mb-4 flex items-center gap-2 font-semibold">
        <Key size={16} /> Cambiar contraseña
      </h3>
      <form className="space-y-3" noValidate onSubmit={submit}>
        <div>
          <Label htmlFor="pw-current">Contraseña actual</Label>
          <Input
            id="pw-current"
            type="password"
            autoComplete="current-password"
            {...form.register("current")}
          />
          <FieldError message={errors.current?.message} />
        </div>
        <div>
          <Label htmlFor="pw-next">Nueva contraseña</Label>
          <Input
            id="pw-next"
            type="password"
            autoComplete="new-password"
            {...form.register("next")}
          />
          <FieldError message={errors.next?.message} />
        </div>
        <div>
          <Label htmlFor="pw-confirm">Repetir contraseña</Label>
          <Input
            id="pw-confirm"
            type="password"
            autoComplete="new-password"
            {...form.register("confirm")}
          />
          <FieldError message={errors.confirm?.message} />
        </div>
        <div className="space-y-1 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 size={11} className="text-emerald-600" /> Mínimo 12 caracteres
          </div>
          <div className="flex items-center gap-1.5">
            <CheckCircle2 size={11} className="text-emerald-600" /> Mayúsculas, números y símbolos
          </div>
          <div className="flex items-center gap-1.5">
            <CheckCircle2 size={11} className="text-muted-foreground" /> Distinta a las últimas 5
            usadas
          </div>
        </div>
        {errors.root?.server && (
          <p className="text-sm text-red-600">{errors.root.server.message}</p>
        )}
        <BtnPrimary type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Actualizando..." : "Actualizar contraseña"}
        </BtnPrimary>
      </form>
    </Card>
  );
}
