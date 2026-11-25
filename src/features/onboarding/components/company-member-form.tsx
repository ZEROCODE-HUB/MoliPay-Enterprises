import { useState } from "react";
import { onlyDigits } from "@/shared/lib/text";
import { useZodForm } from "@/shared/forms/use-zod-form";
import { PrimaryButton, SecondaryButton, SelectField } from "@/shared/ui/auth-kit";
import { companyMemberSchema, type CompanyMemberValues } from "../onboarding.schema";
import type { CompanyMember } from "../onboarding.types";
import { EMPTY_COMPANY_MEMBER, MEMBER_ROLE_OPTIONS } from "../company-onboarding.rules";
import {
  PersonAddressFields,
  PersonIdentityFields,
  PersonPepFields,
  PersonRoleFields,
} from "./company-person-fields";

/**
 * Alta de otro representante legal, apoderado o firmante, con todos los datos
 * del F.0186. Avisa en el campo si esa persona ya esta cargada con ese caracter.
 */
export function CompanyMemberForm({
  companyType,
  members,
  disabled,
  onCancel,
  onSubmit,
}: {
  companyType?: string;
  members: CompanyMember[];
  disabled?: boolean;
  onCancel: () => void;
  onSubmit: (values: CompanyMemberValues, role: string) => Promise<boolean>;
}) {
  const [roleLabel, setRoleLabel] = useState("");
  const [roleError, setRoleError] = useState<string>();
  const form = useZodForm(companyMemberSchema, { defaultValues: EMPTY_COMPANY_MEMBER });
  const role = MEMBER_ROLE_OPTIONS[roleLabel];

  const isDuplicate = (taxId: string) =>
    !!role && members.some((m) => m.role === role && m.taxId === onlyDigits(taxId));

  const warnDuplicate = (taxId: string) => {
    if (isDuplicate(taxId))
      form.setError("taxId", { message: `Ya está cargada como ${roleLabel.toLowerCase()}` });
  };

  const submit = form.handleSubmit(async (values) => {
    if (!role) {
      setRoleError("Elegí el carácter en la empresa");
      return;
    }
    if (isDuplicate(values.taxId)) {
      warnDuplicate(values.taxId);
      return;
    }
    if (await onSubmit(values, role)) {
      form.reset(EMPTY_COMPANY_MEMBER);
      setRoleLabel("");
    }
  });

  return (
    <div className="space-y-6 rounded-md border border-border p-4">
      <h3 className="text-sm font-medium text-foreground">Nuevo representante o apoderado</h3>
      <SelectField
        label="Carácter en la empresa"
        value={roleLabel}
        onChange={(v) => {
          setRoleLabel(v);
          setRoleError(undefined);
        }}
        options={Object.keys(MEMBER_ROLE_OPTIONS)}
        error={roleError}
      />
      <PersonIdentityFields form={form} onTaxIdBlur={warnDuplicate} />
      <PersonAddressFields form={form} />
      <PersonRoleFields form={form} companyType={companyType} />
      <PersonPepFields form={form} />
      <div className="flex flex-col gap-3 sm:flex-row">
        <SecondaryButton onClick={onCancel}>Cancelar</SecondaryButton>
        <div className="flex-1">
          <PrimaryButton onClick={() => void submit()} disabled={disabled}>
            Agregar persona
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
}
