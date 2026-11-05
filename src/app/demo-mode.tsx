import { createContext,useContext,useEffect,useState,type ReactNode } from "react";
import { createKeyValueStore } from "@/infrastructure/browser-storage/key-value-store";

export type DemoRole = "empresa";

type DemoCtx = {
  role: DemoRole | null;
  setRole: (r: DemoRole | null) => void;
  bannerHidden: boolean;
  hideBanner: () => void;
  showBanner: () => void;
};

const DEMO_ROLES: readonly string[] = ["empresa"];
const demoRoleStore = createKeyValueStore<DemoRole>({
  key: "molly_role",
  validate: (v): v is DemoRole => typeof v === "string" && DEMO_ROLES.includes(v),
});

const Ctx = createContext<DemoCtx | null>(null);

export function DemoModeProvider({ children }: { children: ReactNode }) {
  const [role, setRoleState] = useState<DemoRole | null>(null);
  const [bannerHidden, setHidden] = useState(false);

  useEffect(() => {
    const r = demoRoleStore.get();
    if (r) setRoleState(r);
  }, []);

  const setRole = (r: DemoRole | null) => {
    setRoleState(r);
    if (r) demoRoleStore.set(r);
    else demoRoleStore.remove();
    setHidden(false);
  };

  return (
    <Ctx.Provider
      value={{
        role,
        setRole,
        bannerHidden,
        hideBanner: () => setHidden(true),
        showBanner: () => setHidden(false),
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useDemoMode() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useDemoMode must be used inside DemoModeProvider");
  return c;
}
