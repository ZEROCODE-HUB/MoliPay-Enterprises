import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { FieldValues, Path, PathValue, UseFormReturn } from "react-hook-form";
import { Field } from "@/shared/ui/auth-kit";
import { COUNTRIES } from "../onboarding.rules";
import {
  CABA,
  CABA_LOCALITY,
  PROVINCE_NAMES,
  isCabaPostal,
  postalDigits,
  provinceCode,
  provinceName,
} from "../company-onboarding.rules";
import { useFindLocalitiesByPostalCode, useLocalities } from "../onboarding.hooks";
import { onboardingQueries } from "../onboarding.queries";
import type { Locality } from "../onboarding.types";
import { SelectInput } from "./form-parts";

const COUNTRY_NAMES = Object.keys(COUNTRIES);

/** Nombre a mostrar: con el departamento si el nombre se repite en la lista. */
function withLabels(list: Locality[]): { label: string; locality: Locality }[] {
  const count = new Map<string, number>();
  for (const l of list) count.set(l.name, (count.get(l.name) ?? 0) + 1);
  return list.map((l) => ({
    label: (count.get(l.name) ?? 0) > 1 && l.department ? `${l.name} (${l.department})` : l.name,
    locality: l,
  }));
}

type Names<T extends FieldValues> = {
  country: Path<T>;
  province: Path<T>;
  locality: Path<T>;
  postalCode: Path<T>;
};

/**
 * Pais, provincia, localidad y codigo postal. En Argentina el codigo postal
 * completa la provincia y la localidad, y la localidad completa el codigo
 * postal (catalogo ar_localities). CABA es una sola localidad. Si la provincia
 * todavia no tiene localidades cargadas, la localidad se escribe.
 */
export function LocationFields<T extends FieldValues>({
  form,
  names,
}: {
  form: UseFormReturn<T>;
  names: Names<T>;
}) {
  const { errors } = form.formState;
  const findByPostalCode = useFindLocalitiesByPostalCode();
  const queryClient = useQueryClient();
  const country = form.watch(names.country) as string;
  const province = form.watch(names.province) as string;
  const inArgentina = country === "Argentina";
  const code = inArgentina ? provinceCode(province) : undefined;
  const caba = code === CABA;
  const localities = useLocalities(code && !caba ? code : undefined);
  const options = localities.data ?? [];
  /** Localidades de un codigo postal compartido; valen mientras no cambie la provincia. */
  const [matches, setMatches] = useState<{ province: string; list: Locality[] } | null>(null);

  const set = (name: Path<T>, value: string) =>
    form.setValue(name, value as PathValue<T, Path<T>>, { shouldValidate: true });
  const errorOf = (name: Path<T>) =>
    (errors as Record<string, { message?: string } | undefined>)[name]?.message;

  // CABA es una sola localidad.
  useEffect(() => {
    if (caba && form.getValues(names.locality) !== CABA_LOCALITY)
      set(names.locality, CABA_LOCALITY);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caba]);

  /** Codigo postal -> provincia y localidad. */
  const fromPostalCode = async (value: string) => {
    if (!inArgentina) return;
    const digits = postalDigits(value);
    if (!digits) return;
    if (isCabaPostal(digits)) {
      set(names.province, provinceName(CABA));
      set(names.locality, CABA_LOCALITY);
      setMatches(null);
      return;
    }
    const found = await findByPostalCode(digits).catch(() => []);
    if (found.length === 0) return;
    const provinces = new Set(found.map((l) => l.provinceCode));
    if (provinces.size === 1) set(names.province, provinceName(found[0].provinceCode));
    if (found.length === 1) {
      // El valor es el nombre que muestra la lista de la provincia (con departamento si se repite).
      const siblings = await queryClient
        .fetchQuery(onboardingQueries.localities(found[0].provinceCode))
        .catch(() => found);
      const label = withLabels(siblings).find(
        (o) => o.locality.name === found[0].name && o.locality.department === found[0].department,
      )?.label;
      set(names.locality, label ?? found[0].name);
      setMatches(null);
    } else if (provinces.size === 1) {
      // Varias localidades con el mismo codigo: se elige entre esas.
      setMatches({ province: found[0].provinceCode, list: found });
    }
  };

  const localityOptions = withLabels(matches && matches.province === code ? matches.list : options);

  /** Localidad -> codigo postal (si todavia no se escribio). */
  const fromLocality = (label: string) => {
    set(names.locality, label);
    const locality = localityOptions.find((o) => o.label === label)?.locality;
    if (locality?.postalCode && !form.getValues(names.postalCode))
      set(names.postalCode, locality.postalCode);
  };
  const postalField = form.register(names.postalCode);

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <SelectInput
        control={form.control}
        name={names.country}
        label="País"
        options={COUNTRY_NAMES}
      />
      <Field
        label="Código postal"
        placeholder="1427 o C1427ABC"
        hint={inArgentina ? "Completa la provincia y la localidad." : undefined}
        error={errorOf(names.postalCode)}
        {...postalField}
        onBlur={(e) => {
          void postalField.onBlur(e);
          void fromPostalCode(e.target.value);
        }}
      />
      {inArgentina ? (
        <SelectInput
          control={form.control}
          name={names.province}
          label="Provincia"
          options={PROVINCE_NAMES}
        />
      ) : (
        <Field
          label="Provincia o estado"
          error={errorOf(names.province)}
          {...form.register(names.province)}
        />
      )}
      {caba ? (
        <Field label="Localidad" value={CABA_LOCALITY} readOnly disabled />
      ) : inArgentina && localityOptions.length > 0 ? (
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-foreground">Localidad</span>
          <select
            value={(form.watch(names.locality) as string) ?? ""}
            onChange={(e) => fromLocality(e.target.value)}
            className={`h-11 w-full rounded-md border bg-card px-3 text-sm outline-none focus:border-navy-500 focus:ring-2 focus:ring-navy-100 ${
              errorOf(names.locality) ? "border-red-500" : "border-border"
            }`}
          >
            <option value="">Seleccioná…</option>
            {localityOptions.map(({ label }) => (
              <option key={label} value={label}>
                {label}
              </option>
            ))}
          </select>
          {errorOf(names.locality) && (
            <span className="mt-1 block text-xs text-red-500">{errorOf(names.locality)}</span>
          )}
        </label>
      ) : (
        <Field
          label="Localidad"
          error={errorOf(names.locality)}
          {...form.register(names.locality)}
        />
      )}
    </div>
  );
}
