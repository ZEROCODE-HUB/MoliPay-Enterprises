import type { ReactNode } from "react";
import { Controller, type Control, type FieldPath, type FieldValues } from "react-hook-form";
import { SelectField } from "@/shared/ui/auth-kit";

/** Select de RHF con las etiquetas como valor. */
export function SelectInput<T extends FieldValues>({
  control,
  name,
  label,
  options,
}: {
  control: Control<T>;
  name: FieldPath<T>;
  label: string;
  options: string[];
}) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <SelectField
          label={label}
          value={(field.value as string) ?? ""}
          onChange={field.onChange}
          options={options}
          error={fieldState.error?.message}
        />
      )}
    />
  );
}

/** Titulo de un bloque del formulario. */
export function FieldGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="space-y-4">
      <legend className="mb-1 text-xs font-semibold uppercase tracking-[0.15em] text-black-500">
        {title}
      </legend>
      {children}
    </fieldset>
  );
}
