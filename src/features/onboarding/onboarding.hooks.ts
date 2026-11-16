import { useEffect, useMemo, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useSessionUser } from "@/features/session/session.hooks";
import { migrateDraftV0, type PersistedDraft } from "./onboarding.draft-migration";
import { onboardingKeys, onboardingQueries } from "./onboarding.queries";
import * as api from "./onboarding.supabase";
import type {
  AccountType,
  Address,
  CompanyData,
  CompanyPersonData,
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
  representative: Partial<CompanyPersonData>;
  address: Partial<Address>;
  emailVerified: boolean;
  setAccountType: (t: AccountType) => void;
  setRegistration: (r: Partial<Registration>) => void;
  setPersonalData: (d: Partial<PersonalData>) => void;
  setCompanyData: (d: Partial<CompanyData>) => void;
  setRepresentative: (d: Partial<CompanyPersonData>) => void;
  setAddress: (a: Partial<Address>) => void;
  markEmailVerified: () => void;
  reset: () => void;
};

const EMPTY_DRAFT = {
  accountType: null as AccountType | null,
  registration: {},
  personalData: {},
  companyData: {},
  representative: {},
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
      setRepresentative: (d) => set((s) => ({ representative: { ...s.representative, ...d } })),
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
        representative: s.representative,
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

export function useOnboardingApplication() {
  const { userId } = useSessionIdentity();
  return useQuery({ ...onboardingQueries.application(userId), enabled: !!userId });
}

export function useOnboardingStatus() {
  const { userId, email } = useSessionIdentity();
  return useQuery({ ...onboardingQueries.status(userId, email), enabled: !!userId && !!email });
}

/** Actividades CLAE para elegir la de la empresa. */
export function useEconomicActivities() {
  return useQuery(onboardingQueries.economicActivities());
}

/** Localidades de una provincia (codigo ISO). */
export function useLocalities(provinceCode: string | undefined) {
  return useQuery({ ...onboardingQueries.localities(provinceCode ?? ""), enabled: !!provinceCode });
}

/** Busca localidades por codigo postal (para completar localidad y provincia). */
export function useFindLocalitiesByPostalCode() {
  const queryClient = useQueryClient();
  return (postalCode: string) =>
    queryClient.fetchQuery(onboardingQueries.localitiesByPostalCode(postalCode));
}

export const CUIT_TAKEN_MESSAGE = "Ya existe una cuenta con ese CUIT.";

/**
 * Consulta si un CUIT ya es de otra cuenta, para avisarlo en el campo y no al
 * final del alta. Recuerda las respuestas de la sesion. Si la consulta falla
 * devuelve null: no se bloquea al usuario (la base lo controla al registrar).
 */
export function useCuitAvailability() {
  const cache = useRef(new Map<string, boolean>());
  return useMemo(
    () => ({
      check: async (cuit: string): Promise<boolean | null> => {
        const digits = cuit.replace(/\D/g, "");
        if (digits.length !== 11) return null;
        const known = cache.current.get(digits);
        if (known !== undefined) return known;
        try {
          const available = await api.isCuitAvailable(digits);
          cache.current.set(digits, available);
          return available;
        } catch {
          return null;
        }
      },
    }),
    [],
  );
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
