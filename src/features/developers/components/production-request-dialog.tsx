import { toast } from "sonner";
import { z } from "zod";
import { applyServerErrors } from "@/shared/forms/apply-server-errors";
import { FieldError } from "@/shared/forms/field-error";
import { useZodForm } from "@/shared/forms/use-zod-form";
import { FormDialog } from "@/shared/ui/form-dialog";
import { Label } from "@/shared/ui/form-controls";
import { useDeveloperActions } from "../developers.hooks";

const schema = z.object({ notes: z.string().trim().max(1000, "Máximo 1000 caracteres.") });

export function ProductionRequestDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { requestProduction } = useDeveloperActions();
  const form = useZodForm(schema, { defaultValues: { notes: "" } });
  const { errors, isSubmitting } = form.formState;

  const close = () => {
    form.reset();
    onClose();
  };

  const submit = form.handleSubmit(async ({ notes }) => {
    try {
      await requestProduction(notes);
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
      title="Solicitar pase a producción"
      description="MoliPay revisa tu integración y habilita las llaves mp_live_ para operar con dinero real. Necesitás al menos una petición exitosa en Sandbox."
      submitLabel="Enviar solicitud"
      onSubmit={submit}
      isSubmitting={isSubmitting}
    >
      <div>
        <Label htmlFor="production-notes">Contanos qué vas a integrar (opcional)</Label>
        <textarea
          id="production-notes"
          className="min-h-[90px] w-full rounded-md border bg-background px-3 py-2 text-sm"
          placeholder="Ej.: cobro de cuotas desde nuestro ERP con links de pago y consulta de saldos"
          {...form.register("notes")}
        />
        <FieldError message={errors.notes?.message ?? errors.root?.server?.message} />
      </div>
    </FormDialog>
  );
}
