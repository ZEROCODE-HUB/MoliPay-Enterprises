import { Controller } from "react-hook-form";
import { useZodForm } from "@/shared/forms/use-zod-form";
import { Field, PrimaryButton, SecondaryButton, SelectField } from "@/shared/ui/auth-kit";
import { COUNTRIES, DOCUMENT_TYPES, OptionLabel } from "../onboarding.rules";
import { companyPersonSchema, type CompanyPersonValues } from "../onboarding.schema";

const EMPTY: CompanyPersonValues = {
  firstName: "",
  lastName: "",
  taxId: "",
  nationality: "",
  documentType: "",
  documentNumber: "",
  birthDate: "",
  isPep: "",
};

/** Datos de una persona de la empresa. El campo de rol o de control lo pone quien lo usa. */
export function CompanyPersonForm({
  title,
  submitLabel,
  onCancel,
  disabled,
  extra,
  canSubmit = true,
  onSubmit,
}: {
  title: string;
  submitLabel: string;
  onCancel: () => void;
  disabled?: boolean;
  extra: React.ReactNode;
  canSubmit?: boolean;
  onSubmit: (values: CompanyPersonValues) => Promise<boolean>;
}) {
  const form = useZodForm(companyPersonSchema, { defaultValues: EMPTY });
  const { errors } = form.formState;

  const select = (name: keyof CompanyPersonValues, label: string, options: string[]) => (
    <Controller
      control={form.control}
      name={name}
      render={({ field, fieldState }) => (
        <SelectField
          label={label}
          value={field.value}
          onChange={field.onChange}
          options={options}
          error={fieldState.error?.message}
        />
      )}
    />
  );

  const submit = form.handleSubmit(async (values) => {
    if (await onSubmit(values)) form.reset(EMPTY);
  });

  return (
    <div className="space-y-4 rounded-sm border border-black-100 p-4">
      <h3 className="text-sm font-semibold text-black-800">{title}</h3>
      {extra}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nombre" error={errors.firstName?.message} {...form.register("firstName")} />
        <Field label="Apellido" error={errors.lastName?.message} {...form.register("lastName")} />
        <Field
          label="CUIT / CUIL"
          className="font-mono"
          error={errors.taxId?.message}
          {...form.register("taxId")}
        />
        <Field
          label="Fecha de nacimiento"
          type="date"
          error={errors.birthDate?.message}
          {...form.register("birthDate")}
        />
        {select("nationality", "Nacionalidad", Object.keys(COUNTRIES))}
        {select("documentType", "Tipo de documento", DOCUMENT_TYPES)}
        <Field
          label="Número de documento"
          error={errors.documentNumber?.message}
          {...form.register("documentNumber")}
        />
        {select("isPep", "¿Es persona expuesta políticamente?", [OptionLabel.yes, OptionLabel.no])}
      </div>
      <div className="flex flex-col gap-3 sm:flex-row">
        <SecondaryButton onClick={onCancel}>Cancelar</SecondaryButton>
        <div className="flex-1">
          <PrimaryButton onClick={() => void submit()} disabled={disabled || !canSubmit}>
            {submitLabel}
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
}
