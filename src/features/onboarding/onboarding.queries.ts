import { queryOptions } from "@tanstack/react-query";
import { STALE } from "@/app/query-client";
import { privateScope } from "@/shared/lib/query-scope";
import {
  getKycDocuments,
  getOnboardingApplication,
  getOnboardingProfile,
  getOnboardingStatus,
  listBeneficialOwners,
  listCompanyMembers,
  listOnboardingDocuments,
} from "./onboarding.supabase";

export const onboardingKeys = {
  all: (userId: string) => [...privateScope(userId), "onboarding"] as const,
  profile: (userId: string, email: string) =>
    [...onboardingKeys.all(userId), "profile", email] as const,
  documents: (userId: string, legajo: string) =>
    [...onboardingKeys.all(userId), "documents", legajo] as const,
  status: (userId: string, email: string) =>
    [...onboardingKeys.all(userId), "status", email] as const,
  members: (userId: string) => [...onboardingKeys.all(userId), "members"] as const,
  owners: (userId: string) => [...onboardingKeys.all(userId), "owners"] as const,
  onboardingDocuments: (userId: string) =>
    [...onboardingKeys.all(userId), "onboarding-documents"] as const,
  application: (userId: string) => [...onboardingKeys.all(userId), "application"] as const,
};

export const onboardingQueries = {
  profile: (userId: string, email: string) =>
    queryOptions({
      queryKey: onboardingKeys.profile(userId, email),
      queryFn: ({ signal }) => getOnboardingProfile(email, { signal }),
      staleTime: STALE.moderate,
    }),
  documents: (userId: string, legajo: string) =>
    queryOptions({
      queryKey: onboardingKeys.documents(userId, legajo),
      queryFn: () => getKycDocuments(legajo),
      // Las URLs firmadas vencen: no se reutilizan por mucho tiempo.
      staleTime: STALE.short,
    }),
  status: (userId: string, email: string) =>
    queryOptions({
      queryKey: onboardingKeys.status(userId, email),
      queryFn: ({ signal }) => getOnboardingStatus(email, { signal }),
      staleTime: STALE.short,
    }),
  members: (userId: string) =>
    queryOptions({
      queryKey: onboardingKeys.members(userId),
      queryFn: listCompanyMembers,
      staleTime: STALE.short,
    }),
  owners: (userId: string) =>
    queryOptions({
      queryKey: onboardingKeys.owners(userId),
      queryFn: listBeneficialOwners,
      staleTime: STALE.short,
    }),
  onboardingDocuments: (userId: string) =>
    queryOptions({
      queryKey: onboardingKeys.onboardingDocuments(userId),
      queryFn: listOnboardingDocuments,
      staleTime: STALE.short,
    }),
  application: (userId: string) =>
    queryOptions({
      queryKey: onboardingKeys.application(userId),
      queryFn: getOnboardingApplication,
      staleTime: STALE.short,
    }),
};
