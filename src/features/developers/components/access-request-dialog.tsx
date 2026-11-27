import { toast } from "sonner";
import { z } from "zod";
import { applyServerErrors } from "@/shared/forms/apply-server-errors";
import { FieldError } from "@/shared/forms/field-error";
import { useZodForm } from "@/shared/forms/use-zod-form";
import { FormDialog } from "@/shared/ui/form-dialog";
import { Label } from "@/shared/ui/form-controls";
import { useDeveloperActions } from "../developers.hooks";

const schema = z.object({ notes: z.string().trim().max(1000, "Máximo 1000 caracteres.") });

/** Paso 1 del flujo: la empresa pide el acceso y Compliance lo revisa. */
export function AccessRequestDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { requestAccess } = useDeveloperActions();
  const form = useZodForm(schema, { defaultValues: { notes: "" } });
  const { errors, isSubmitting } = form.formState;

  const close = () => {
    form.reset();
    onClose();
  };

  const submit = form.handleSubmit(async ({ notes }) => {
    try {
      await requestAccess(notes);
    } catch (e) {
      applyServerErrors(form, e);
      return;
    }
    toast.success("Solicitud enviada. Te avisamos cuando MoliPay la apruebe.");
    close();
  });

  return (
    <FormDialog
      open={open}
      onClose={close}
      title="Solicitar habilitación de APIs"
      description="MoliPay revisa el perfil de tu cuenta y aprueba el acceso. Con la aprobación vas a poder generar tus llaves de Sandbox y consultar la documentación técnica."
      submitLabel="Enviar solicitud"
      onSubmit={submit}
      isSubmitting={isSubmitting}
    >
      <div>
        <Label htmlFor="access-notes">¿Qué sistema vas a integrar? (opcional)</Label>
        <textarea
          id="access-notes"
          className="min-h-[90px] w-full rounded-md border bg-background px-3 py-2 text-sm"
          placeholder="Ej.: nuestro ERP para generar cobros, dispersar fondos y consultar saldos"
          {...form.register("notes")}
        />
        <FieldError message={errors.notes?.message ?? errors.root?.server?.message} />
      </div>
    </FormDialog>
  );
}
