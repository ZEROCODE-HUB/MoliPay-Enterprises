import { Field } from "@/shared/ui/auth-kit";
import { onlyDigits } from "@/shared/lib/text";
import { COMPANY_TYPES } from "../onboarding.rules";
import {
  INCOME_TAX_CONDITIONS,
  PROVINCE_NAMES,
  REGISTRY_BODIES,
  REGISTRY_PLACE,
  VAT_CONDITIONS,
} from "../company-onboarding.rules";
import type { CompanyDataValues } from "../onboarding.schema";
import { ActivityPicker } from "./activity-picker";
import { FieldGroup, SelectInput } from "./form-parts";
import { LocationFields } from "./location-fields";
import type { CompanyDataPageVm } from "./use-company-data-page";

/*
 * Datos de la empresa: los del F.0186 (Datos Generales) y los que ya pedia el
 * sistema, en tres pasos y un resumen.
 */

type Props = Pick<CompanyDataPageVm, "form">;
const IDENTIFICATION_TYPES = ["CUIT", "CDI"];

/** Identificacion de la empresa y actividad. */
export function CompanyIdentitySection({
  form,
  checkCuit,
  checkingCuit,
}: Props & Pick<CompanyDataPageVm, "checkCuit" | "checkingCuit">) {
  const { errors } = form.formState;
  const cuitDigits = onlyDigits(form.watch("cuit")).length;
  const cuitField = form.register("cuit");

  return (
    <FieldGroup title="Datos de la empresa">
      <Field
        label="Razón social"
        error={errors.legalName?.message}
        {...form.register("legalName")}
      />
      <Field label="Nombre de fantasía (opcional)" {...form.register("tradeName")} />
      <div className="grid gap-4 sm:grid-cols-[10rem_1fr]">
        <SelectInput
          control={form.control}
          name="identificationType"
          label="Tipo de identificación"
          options={IDENTIFICATION_TYPES}
        />
        <Field
          label={`Número de ${form.watch("identificationType") || "CUIT"}`}
          placeholder="30-12345678-9"
          className="font-mono"
          error={errors.cuit?.message}
          hint={
            checkingCuit ? "Verificando…" : cuitDigits > 0 ? `${cuitDigits}/11 dígitos` : undefined
          }
          {...cuitField}
          onBlur={(e) => {
            void cuitField.onBlur(e);
            void form.trigger("cuit").then((ok) => ok && checkCuit(e.target.value));
          }}
        />
      </div>
      <SelectInput
        control={form.control}
        name="companyType"
        label="Tipo societario"
        options={COMPANY_TYPES}
      />
      <ActivityPicker form={form} />
    </FieldGroup>
  );
}

/** Domicilio legal y contacto. El codigo postal completa provincia y localidad. */
export function CompanyAddressSection({ form }: Props) {
  const { errors } = form.formState;

  return (
    <FieldGroup title="Domicilio legal y contacto">
      <Field
        label="Domicilio legal (calle y número)"
        hint="El que figura en el estatuto o en la última reforma."
        error={errors.legalStreet?.message}
        {...form.register("legalStreet")}
      />
      <LocationFields
        form={form}
        names={{
          country: "legalCountry",
          province: "legalProvince",
          locality: "legalLocality",
          postalCode: "legalPostalCode",
        }}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Teléfono"
          type="tel"
          inputMode="tel"
          placeholder="11 5555 5555"
          error={errors.phone?.message}
          {...form.register("phone")}
        />
        <Field
          label="Correo electrónico"
          type="email"
          hint="Por defecto, el de tu cuenta."
          error={errors.email?.message}
          {...form.register("email")}
        />
      </div>
    </FieldGroup>
  );
}

/** Inscripcion en el registro publico y datos impositivos. */
export function CompanyRegistrySection({ form }: Props) {
  const { errors } = form.formState;
  const fixedPlace = REGISTRY_PLACE[REGISTRY_BODIES[form.watch("registryBody")] ?? ""];

  return (
    <>
      <FieldGroup title="Inscripción">
        <p className="-mt-2 text-xs text-muted-foreground">
          Completamos el organismo y el lugar según el domicilio legal: cambialos si la sociedad se
          inscribió en otro registro.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectInput
            control={form.control}
            name="registryBody"
            label="Organismo de inscripción"
            options={Object.keys(REGISTRY_BODIES)}
          />
          {fixedPlace ? (
            <Field label="Lugar de inscripción" value={fixedPlace} readOnly disabled />
          ) : (
            <SelectInput
              control={form.control}
              name="registryProvince"
              label="Lugar de inscripción"
              options={PROVINCE_NAMES}
            />
          )}
          <Field
            label="Fecha de constitución"
            type="date"
            error={errors.constitutionDate?.message}
            {...form.register("constitutionDate")}
          />
          <Field
            label="Fecha de inscripción (opcional)"
            type="date"
            error={errors.registrationDate?.message}
            {...form.register("registrationDate")}
          />
        </div>
        <Field
          label="Número de inscripción (opcional)"
          hint="Como figura en el estatuto inscripto (en IGJ, el número de expediente electrónico)."
          className="font-mono"
          error={errors.registryNumber?.message}
          {...form.register("registryNumber")}
        />
        <div className="grid grid-cols-3 gap-3">
          <Field label="Libro (opcional)" {...form.register("registryBook")} />
          <Field label="Tomo (opcional)" {...form.register("registryVolume")} />
          <Field label="Folio (opcional)" {...form.register("registryFolio")} />
        </div>
      </FieldGroup>
      <FieldGroup title="Datos impositivos">
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectInput
            control={form.control}
            name="vatCondition"
            label="Condición frente al IVA"
            options={Object.keys(VAT_CONDITIONS)}
          />
          <SelectInput
            control={form.control}
            name="incomeTaxCondition"
            label="Condición frente a Ganancias"
            options={Object.keys(INCOME_TAX_CONDITIONS)}
          />
          <Field
            label="Número de Ingresos Brutos"
            hint="Por defecto, el CUIT de la empresa."
            className="font-mono"
            error={errors.iibbNumber?.message}
            {...form.register("iibbNumber")}
          />
        </div>
      </FieldGroup>
    </>
  );
}

const SUMMARY: { title: string; step: number; rows: [keyof CompanyDataValues, string][] }[] = [
  {
    title: "Datos de la empresa",
    step: 0,
    rows: [
      ["legalName", "Razón social"],
      ["tradeName", "Nombre de fantasía"],
      ["identificationType", "Tipo de identificación"],
      ["cuit", "Número"],
      ["companyType", "Tipo societario"],
      ["activityDescription", "Actividad principal"],
    ],
  },
  {
    title: "Domicilio legal y contacto",
    step: 1,
    rows: [
      ["legalStreet", "Domicilio legal"],
      ["legalProvince", "Provincia"],
      ["legalLocality", "Localidad"],
      ["legalCountry", "País"],
      ["legalPostalCode", "Código postal"],
      ["phone", "Teléfono"],
      ["email", "Correo electrónico"],
    ],
  },
  {
    title: "Inscripción y datos impositivos",
    step: 2,
    rows: [
      ["registryBody", "Organismo de inscripción"],
      ["registryProvince", "Lugar de inscripción"],
      ["constitutionDate", "Fecha de constitución"],
      ["registrationDate", "Fecha de inscripción"],
      ["registryNumber", "Número de inscripción"],
      ["registryBook", "Libro"],
      ["registryVolume", "Tomo"],
      ["registryFolio", "Folio"],
      ["vatCondition", "Condición frente al IVA"],
      ["incomeTaxCondition", "Condición frente a Ganancias"],
      ["iibbNumber", "Número de Ingresos Brutos"],
    ],
  },
];

/** Resumen por bloque, con acceso directo a corregir cada uno. */
export function CompanySummarySection({ form, goTo }: Props & Pick<CompanyDataPageVm, "goTo">) {
  const v = form.getValues();
  const value = (key: keyof CompanyDataValues) =>
    key === "registryProvince"
      ? (REGISTRY_PLACE[REGISTRY_BODIES[v.registryBody] ?? ""] ?? v.registryProvince)
      : key === "activityDescription"
        ? [v.activityDescription, v.activityCode && `(${v.activityCode})`].filter(Boolean).join(" ")
        : v[key];

  return (
    <div className="space-y-5">
      {SUMMARY.map((block) => (
        <section key={block.title} className="rounded-md border border-border">
          <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
            <h3 className="text-sm font-medium text-foreground">{block.title}</h3>
            <button
              type="button"
              onClick={() => goTo(block.step)}
              className="text-xs font-medium text-red-500 hover:underline"
            >
              Editar
            </button>
          </div>
          <dl className="divide-y divide-black-100 px-4">
            {block.rows.map(([key, label]) => (
              <div
                key={key}
                className="grid grid-cols-1 gap-1 py-2.5 text-sm sm:grid-cols-[minmax(0,180px)_1fr] sm:gap-4"
              >
                <dt className="text-muted-foreground">{label}</dt>
                <dd className="break-words font-medium text-foreground">{value(key) || "—"}</dd>
              </div>
            ))}
          </dl>
        </section>
      ))}
    </div>
  );
}
