import { useEffect,useMemo,useRef } from "react";
import { useQuery,useQueryClient } from "@tanstack/react-query";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useSessionUser } from "@/features/session/session.hooks";
import { migrateDraftV0,type PersistedDraft } from "./onboarding.draft-migration";
import { onboardingKeys,onboardingQueries } from "./onboarding.queries";
import * as api from "./onboarding.supabase";
import type {
AccountType,
Address,
CompanyData,
OnboardingSubmission,
PersonalData,
Registration,
} from "./onboarding.types";

// --- Borrador del alta ----------------------------------------------------------
/*
 * El alta se completa en varias pantallas (y puede cortarse para verificar el mail),
 * por eso el borrador se guarda en el navegador. Nunca se guarda la contraseña ni
 * archivos. Ver PENDIENTES: son datos personales, conviene acotarlos.
 */

type OnboardingDraft = {
  accountType: AccountType | null;
  registration: Partial<Registration>;
  personalData: Partial<PersonalData>;
  companyData: Partial<CompanyData>;
  address: Partial<Address>;
  emailVerified: boolean;
  setAccountType: (t: AccountType) => void;
  setRegistration: (r: Partial<Registration>) => void;
  setPersonalData: (d: Partial<PersonalData>) => void;
  setCompanyData: (d: Partial<CompanyData>) => void;
  setAddress: (a: Partial<Address>) => void;
  markEmailVerified: () => void;
  reset: () => void;
};

const EMPTY_DRAFT = {
  accountType: null as AccountType | null,
  registration: {},
  personalData: {},
  companyData: {},
  address: {},
  emailVerified: false,
};

export const useOnboardingDraft = create<OnboardingDraft>()(
  persist(
    (set) => ({
      ...EMPTY_DRAFT,
      setAccountType: (accountType) => set({ accountType }),
      setRegistration: (r) => set((s) => ({ registration: { ...s.registration, ...r } })),
      setPersonalData: (d) => set((s) => ({ personalData: { ...s.personalData, ...d } })),
      setCompanyData: (d) => set((s) => ({ companyData: { ...s.companyData, ...d } })),
      setAddress: (a) => set((s) => ({ address: { ...s.address, ...a } })),
      markEmailVerified: () => set({ emailVerified: true }),
      reset: () => set(EMPTY_DRAFT),
    }),
    {
      name: "molipay-onboarding",
      version: 1,
      migrate: (persisted, version) =>
        (version === 0
          ? migrateDraftV0(persisted as Parameters<typeof migrateDraftV0>[0])
          : persisted) as PersistedDraft,
      partialize: (s): PersistedDraft => ({
        accountType: s.accountType,
        registration: s.registration,
        personalData: s.personalData,
        companyData: s.companyData,
        address: s.address,
        emailVerified: s.emailVerified,
      }),
    },
  ),
);

/**
 * El borrador vive en el navegador y lo comparte todo el browser: si es de otro email,
 * se descarta para no heredar datos (incluido el CUIT) de otra cuenta.
 */
export function useDiscardForeignDraft(onDiscarded?: () => void) {
  const email = useSessionUser().user?.email ?? null;
  const onDiscardedRef = useRef(onDiscarded);
  onDiscardedRef.current = onDiscarded;
  useEffect(() => {
    if (!email) return;
    const draft = useOnboardingDraft.getState();
    if (draft.registration.email && draft.registration.email !== email) {
      draft.reset();
      onDiscardedRef.current?.();
    }
  }, [email]);
}

// --- Datos del servidor ---------------------------------------------------------

function useSessionIdentity() {
  const user = useSessionUser().user;
  return { userId: user?.id ?? "", email: user?.email ?? "" };
}

/** Lo ya guardado del cliente (null = todavia sin fila en clientes). */
export function useOnboardingProfile() {
  const { userId, email } = useSessionIdentity();
  return useQuery({ ...onboardingQueries.profile(userId, email), enabled: !!userId && !!email });
}

export function useKycDocuments(legajo: string | undefined) {
  const { userId } = useSessionIdentity();
  return useQuery({
    ...onboardingQueries.documents(userId, legajo ?? ""),
    enabled: !!userId && !!legajo,
  });
}

export function useOnboardingStatus() {
  const { userId, email } = useSessionIdentity();
  return useQuery({ ...onboardingQueries.status(userId, email), enabled: !!userId && !!email });
}

/** Acciones del alta (Edge Functions). Errores como AppError con mensaje en español. */
export function useOnboardingActions() {
  const { userId } = useSessionIdentity();
  const queryClient = useQueryClient();
  return useMemo(
    () => ({
      register: api.registerCustomer,
      verifyEmail: api.verifyEmail,
      resendVerification: api.resendVerification,
      submit: async (submission: OnboardingSubmission) => {
        await api.submitOnboarding(submission);
        await queryClient.invalidateQueries({ queryKey: onboardingKeys.all(userId) });
      },
    }),
    [queryClient, userId],
  );
}
