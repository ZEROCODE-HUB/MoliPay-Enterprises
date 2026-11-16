import { useEffect } from "react";
import type { UseFormReturn } from "react-hook-form";
import { Field } from "@/shared/ui/auth-kit";
import { COUNTRIES, DOCUMENT_TYPES, isValidCuit } from "../onboarding.rules";
import {
  BIRTH_PLACES,
  MARITAL_STATUSES,
  PEP_CURRENT,
  PEP_JURISDICTIONS,
  PEP_NO,
  PEP_POSITIONS,
  PEP_YEARS,
  PEP_YES,
  SEX_OPTIONS,
  documentFromCuit,
  needsSpouse,
  sexFromCuit,
  positionsFor,
} from "../company-onboarding.rules";
import type { CompanyMemberValues } from "../onboarding.schema";
import { FieldGroup, SelectInput } from "./form-parts";
import { LocationFields } from "./location-fields";

/*
 * Representante legal o apoderado: los datos del F.0186 y los que ya pedia el
 * sistema. Los usa el representante (como pasos) y el alta de apoderados.
 */

const COUNTRY_NAMES = Object.keys(COUNTRIES);
const SEX_LABELS = Object.keys(SEX_OPTIONS);

type FormProps = { form: UseFormReturn<CompanyMemberValues> };

/**
 * Identidad. Se pide el CUIT/CUIL una sola vez: con DNI, el numero de
 * documento sale del CUIT/CUIL (no se escribe dos veces).
 */
export function PersonIdentityFields({
  form,
  onTaxIdBlur,
}: FormProps & { onTaxIdBlur?: (taxId: string) => void }) {
  const { errors } = form.formState;
  const isDni = form.watch("documentType") === "DNI";
  const taxId = form.watch("taxId");
  const taxIdField = form.register("taxId");

  // El prefijo del CUIT/CUIL sugiere el sexo si todavia no se eligio.
  useEffect(() => {
    const sex = isValidCuit(taxId) ? sexFromCuit(taxId) : "";
    if (sex && !form.getValues("gender")) form.setValue("gender", sex, { shouldValidate: true });
  }, [taxId, form]);

  useEffect(() => {
    if (!isDni) return;
    const dni = isValidCuit(taxId) ? documentFromCuit(taxId) : "";
    if (form.getValues("documentNumber") !== dni)
      form.setValue("documentNumber", dni, { shouldValidate: !!dni });
  }, [isDni, taxId, form]);

  return (
    <FieldGroup title="Datos personales">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nombre" error={errors.firstName?.message} {...form.register("firstName")} />
        <Field label="Apellido" error={errors.lastName?.message} {...form.register("lastName")} />
        <SelectInput
          control={form.control}
          name="gender"
          label="Sexo (como figura en el DNI)"
          options={SEX_LABELS}
        />
        <SelectInput
          control={form.control}
          name="nationality"
          label="Nacionalidad"
          options={COUNTRY_NAMES}
        />
        <Field
          label="CUIT / CUIL"
          placeholder="20-12345678-9"
          className="font-mono"
          error={errors.taxId?.message}
          {...taxIdField}
          onBlur={(e) => {
            void taxIdField.onBlur(e);
            onTaxIdBlur?.(e.target.value);
          }}
        />
        <SelectInput
          control={form.control}
          name="documentType"
          label="Tipo de documento"
          options={DOCUMENT_TYPES}
        />
        {isDni ? (
          <Field
            label="Número de DNI"
            value={form.watch("documentNumber")}
            readOnly
            hint="Sale de tu CUIT / CUIL."
            error={errors.documentNumber?.message}
          />
        ) : (
          <Field
            label="Número de documento"
            error={errors.documentNumber?.message}
            {...form.register("documentNumber")}
          />
        )}
        <Field
          label="Fecha de nacimiento"
          type="date"
          error={errors.birthDate?.message}
          {...form.register("birthDate")}
        />
        <SelectInput
          control={form.control}
          name="birthPlace"
          label="Lugar de nacimiento"
          options={BIRTH_PLACES}
        />
      </div>
    </FieldGroup>
  );
}

/**
 * Domicilio y contacto. `lockedEmail`: el correo es el de la cuenta (quien hace
 * el alta) y no se edita.
 */
export function PersonAddressFields({ form, lockedEmail }: FormProps & { lockedEmail?: string }) {
  const { errors } = form.formState;

  useEffect(() => {
    if (lockedEmail && form.getValues("email") !== lockedEmail)
      form.setValue("email", lockedEmail, { shouldValidate: true });
  }, [lockedEmail, form]);

  return (
    <FieldGroup title="Domicilio y contacto">
      <Field
        label="Domicilio legal (calle y número)"
        error={errors.address?.message}
        {...form.register("address")}
      />
      <LocationFields
        form={form}
        names={{
          country: "residenceCountry",
          province: "province",
          locality: "city",
          postalCode: "postalCode",
        }}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        {lockedEmail ? (
          <Field
            label="Correo electrónico"
            value={lockedEmail}
            readOnly
            hint="Es el correo de tu cuenta."
          />
        ) : (
          <Field
            label="Correo electrónico"
            type="email"
            autoComplete="email"
            error={errors.email?.message}
            {...form.register("email")}
          />
        )}
        <Field
          label="Teléfono"
          type="tel"
          inputMode="tel"
          placeholder="11 5555 5555"
          error={errors.phone?.message}
          {...form.register("phone")}
        />
      </div>
    </FieldGroup>
  );
}

/** Cargo en la empresa y estado civil (con los datos del cónyuge solo si corresponde). */
export function PersonRoleFields({ form, companyType }: FormProps & { companyType?: string }) {
  const { errors } = form.formState;
  const withSpouse = needsSpouse(form.watch("maritalStatus"));

  return (
    <FieldGroup title="Cargo y estado civil">
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectInput
          control={form.control}
          name="position"
          label="Cargo en la empresa"
          options={positionsFor(companyType)}
        />
        <SelectInput
          control={form.control}
          name="maritalStatus"
          label="Estado civil"
          options={Object.keys(MARITAL_STATUSES)}
        />
      </div>
      {withSpouse && (
        <div className="grid gap-4 rounded-sm border border-black-100 p-4 sm:grid-cols-2">
          <Field
            label="Apellido y nombre del cónyuge o conviviente"
            error={errors.spouseName?.message}
            {...form.register("spouseName")}
          />
          <Field
            label="CUIT / CUIL del cónyuge"
            className="font-mono"
            error={errors.spouseTaxId?.message}
            {...form.register("spouseTaxId")}
          />
          <SelectInput
            control={form.control}
            name="spouseNationality"
            label="Nacionalidad del cónyuge"
            options={COUNTRY_NAMES}
          />
          <SelectInput
            control={form.control}
            name="spouseGender"
            label="Sexo del cónyuge"
            options={SEX_LABELS}
          />
        </div>
      )}
    </FieldGroup>
  );
}

/** Declaracion jurada PEP (Res. UIF 35/2023): hay que elegir, no hay valor por defecto. */
export function PersonPepFields({ form }: FormProps) {
  const pep = form.watch("isPep") === PEP_YES;

  return (
    <FieldGroup title="Declaración jurada de persona expuesta políticamente (PEP)">
      <p className="rounded-sm border border-black-100 bg-black-50 p-4 text-xs leading-relaxed text-black-500">
        Son PEP quienes ocupan u ocuparon cargos públicos jerárquicos (nacionales, provinciales,
        municipales o extranjeros), y sus familiares y allegados, según la{" "}
        <a
          href="https://www.argentina.gob.ar/normativa/nacional/resoluci%C3%B3n-35-2023-380196/texto"
          target="_blank"
          rel="noreferrer"
          className="underline"
        >
          Resolución UIF 35/2023
        </a>
        . Esta información es una declaración jurada: si la condición cambia, hay que informarlo.
      </p>
      <SelectInput
        control={form.control}
        name="isPep"
        label="¿Es persona expuesta políticamente?"
        options={[PEP_NO, PEP_YES]}
      />
      {pep && (
        <div className="space-y-4">
          <SelectInput
            control={form.control}
            name="pepPosition"
            label="Cargo, función o afinidad"
            options={PEP_POSITIONS}
          />
          <SelectInput
            control={form.control}
            name="pepJurisdiction"
            label="Jurisdicción del cargo"
            options={PEP_JURISDICTIONS}
          />
          <div className="grid grid-cols-2 gap-4">
            <SelectInput
              control={form.control}
              name="pepFrom"
              label="En el cargo desde (año)"
              options={PEP_YEARS}
            />
            <SelectInput
              control={form.control}
              name="pepTo"
              label="Hasta"
              options={[PEP_CURRENT, ...PEP_YEARS]}
            />
          </div>
        </div>
      )}
    </FieldGroup>
  );
}
