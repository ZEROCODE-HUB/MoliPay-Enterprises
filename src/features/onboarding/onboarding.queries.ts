import { queryOptions } from "@tanstack/react-query";
import { STALE } from "@/app/query-client";
import { privateScope } from "@/shared/lib/query-scope";
import { getKycDocuments,getOnboardingProfile,getOnboardingStatus } from "./onboarding.supabase";

export const onboardingKeys = {
  all: (userId: string) => [...privateScope(userId), "onboarding"] as const,
  profile: (userId: string, email: string) =>
    [...onboardingKeys.all(userId), "profile", email] as const,
  documents: (userId: string, legajo: string) =>
    [...onboardingKeys.all(userId), "documents", legajo] as const,
  status: (userId: string, email: string) =>
    [...onboardingKeys.all(userId), "status", email] as const,
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
};
