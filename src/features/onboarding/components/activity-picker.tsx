import type { UseFormReturn } from "react-hook-form";
import { SelectField } from "@/shared/ui/auth-kit";
import { useEconomicActivities } from "../onboarding.hooks";
import type { CompanyDataValues } from "../onboarding.schema";
import type { EconomicActivity } from "../onboarding.types";

const optionLabel = (a: EconomicActivity) => `${a.description} (${a.code})`;

/** Actividad principal: select del catalogo CLAE (la descripcion sale de ahi). */
export function ActivityPicker({ form }: { form: UseFormReturn<CompanyDataValues> }) {
  const activities = useEconomicActivities();
  const { errors } = form.formState;
  const catalog = activities.data ?? [];
  const code = form.watch("activityCode");
  const selected = catalog.find((a) => a.code === code);

  return (
    <SelectField
      label="Actividad principal"
      placeholder={activities.isLoading ? "Cargando actividades…" : "Seleccioná…"}
      value={selected ? optionLabel(selected) : ""}
      options={catalog.map(optionLabel)}
      onChange={(label) => {
        const activity = catalog.find((a) => optionLabel(a) === label);
        form.setValue("activityCode", activity?.code ?? "", { shouldValidate: true });
        form.setValue("activityDescription", activity?.description ?? "", {
          shouldValidate: true,
        });
      }}
      error={
        activities.isError
          ? "No pudimos cargar las actividades. Recargá la página."
          : (errors.activityCode?.message ?? errors.activityDescription?.message)
      }
    />
  );
}
