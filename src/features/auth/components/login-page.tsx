import { useState } from "react";
import { getRouteApi,useNavigate } from "@tanstack/react-router";
import { AuthShell } from "@/shared/ui/auth-kit";
import { useDemoMode } from "@/app/demo-mode";
import { useOnboardingActions,useOnboardingDraft } from "@/features/onboarding/onboarding.hooks";
import type { AccountType } from "@/features/onboarding/onboarding.types";
import { userMessage } from "@/shared/lib/errors";
import { useAuthActions } from "../auth.hooks";
import type { RegisterValues } from "../auth.schema";
import { LoginForm } from "./login-form";
import { RegisterForm } from "./register-form";

const route = getRouteApi("/login");

const tabClass = (active: boolean) =>
  `pb-3 text-sm font-semibold transition-colors ${active ? "border-b-2 border-red-500 text-black-800" : "text-black-400"}`;

const accountTypeClass = (active: boolean) =>
  `flex-1 h-11 text-xs font-semibold tracking-wide transition-all rounded-sm ${
    active ? "bg-black text-white" : "bg-white text-black-400 border border-black-100"
  }`;

export function LoginPage() {
  const { register } = route.useSearch();
  const [tab, setTab] = useState<"login" | "register">(register ? "register" : "login");
  const [accountType, setAccountType] = useState<AccountType>(
    register === "pj" ? "company" : "individual",
  );
  const [registerError, setRegisterError] = useState<string | null>(null);
  const { setRole } = useDemoMode();
  const draft = useOnboardingDraft();
  const { register: registerCustomer } = useOnboardingActions();
  const navigate = useNavigate();
  const { destinationAfterLogin } = useAuthActions();

  const handleRegister = async (v: RegisterValues) => {
    const registration = {
      firstName: v.firstName,
      lastName: v.lastName,
      birthDate: v.birthDate,
      email: v.email,
    };
    draft.reset();
    draft.setAccountType(accountType);
    draft.setRegistration(registration);
    setRegisterError(null);
    try {
      await registerCustomer({ ...registration, password: v.password }, accountType);
      navigate({ to: "/registro/exito" });
    } catch (e) {
      setRegisterError(userMessage(e, "No se pudo registrar la cuenta."));
    }
  };

  const handleLogin = async (email: string) => {
    // El borrador del alta persiste en el navegador y lo comparte todo el browser: si es
    // de otro email se reinicia para no heredar datos (incluido el CUIT) de otra sesion.
    if (draft.registration.email && draft.registration.email !== email) draft.reset();
    setRole("empresa");
    navigate({ to: await destinationAfterLogin(email) });
  };

  return (
    <AuthShell
      leftEyebrow="MoliPay · Acceso"
      leftTitle="Tu plataforma de pagos, sin intermediarios."
      leftBody="MoliPay opera bajo normativa BCRA. Tus datos viajan cifrados y se almacenan bajo los estándares del sistema financiero argentino."
    >
      <div className="mb-8 grid grid-cols-2 border-b border-black-100">
        <button onClick={() => setTab("login")} className={tabClass(tab === "login")}>
          Iniciar sesión
        </button>
        <button onClick={() => setTab("register")} className={tabClass(tab === "register")}>
          Crear cuenta
        </button>
      </div>

      {tab === "register" && (
        <div className="mb-6 flex gap-3">
          <button
            type="button"
            onClick={() => setAccountType("individual")}
            className={accountTypeClass(accountType === "individual")}
          >
            Persona Física
          </button>
          <button
            type="button"
            onClick={() => setAccountType("company")}
            className={accountTypeClass(accountType === "company")}
          >
            Persona Jurídica
          </button>
        </div>
      )}

      <div className="relative overflow-hidden">
        <div className="transition-all duration-300 ease-in-out">
          {tab === "login" ? (
            <LoginForm onSuccess={handleLogin} />
          ) : (
            <RegisterForm
              accountType={accountType}
              onSubmit={handleRegister}
              onSwitchToLogin={() => setTab("login")}
              error={registerError}
            />
          )}
        </div>
      </div>
    </AuthShell>
  );
}
