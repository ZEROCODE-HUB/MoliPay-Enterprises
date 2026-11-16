import { useOnboardingDraft, useOnboardingProfile } from "../onboarding.hooks";
import { PersonalDataPage } from "./personal-data-page";
import { RepresentativeDataPage } from "./representative-data-page";

/**
 * /onboarding/datos-personales: persona humana carga sus datos; en una empresa,
 * quien hace el alta carga sus datos como representante legal (F.0186).
 */
export function PersonalDataEntry() {
  const draftType = useOnboardingDraft((s) => s.accountType);
  const profile = useOnboardingProfile();
  const accountType = draftType ?? profile.data?.accountType ?? null;
  return accountType === "company" ? <RepresentativeDataPage /> : <PersonalDataPage />;
}
