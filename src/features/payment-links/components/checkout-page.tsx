import { CheckoutSuccess } from "./checkout-success";
import { CheckoutForm } from "./checkout-form";
import { useCheckoutPage } from "./use-checkout-page";
import { MollyLogo } from "@/shared/ui/molly-logo";
import { AlertCircle,Loader2,Lock } from "lucide-react";
import { CenterCard } from "./checkout-parts";

export function CheckoutPage() {
  const vm = useCheckoutPage();
  const { status } = vm;

  return (
    <div className="min-h-screen bg-[radial-gradient(120%_120%_at_50%_0%,#fff_40%,#fdecee_100%)] flex flex-col">
      {/* Barra de marca */}
      <header className="flex items-center justify-between px-5 py-4 max-w-4xl mx-auto w-full">
        <MollyLogo size={30} />
        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
          <Lock size={13} /> Pago seguro
        </div>
      </header>

      <main className="flex-1 px-4 pb-10">
        <div className="w-full max-w-4xl mx-auto">
          {status === "loading" && (
            <CenterCard>
              <Loader2 className="animate-spin text-[color:var(--brand-dark)]" size={28} />
              <p className="text-sm text-muted-foreground mt-3">Cargando link de pago…</p>
            </CenterCard>
          )}

          {status === "notfound" && (
            <CenterCard>
              <AlertCircle className="text-muted-foreground" size={28} />
              <p className="font-semibold mt-3">Link no encontrado</p>
              <p className="text-xs text-muted-foreground mt-1">
                El enlace no existe o fue removido.
              </p>
            </CenterCard>
          )}

          {status === "inactive" && (
            <CenterCard>
              <AlertCircle className="text-amber-500" size={28} />
              <p className="font-semibold mt-3">Link inactivo</p>
              <p className="text-xs text-muted-foreground mt-1">
                Este cobro no esta disponible en este momento.
              </p>
            </CenterCard>
          )}

          {status === "expired" && (
            <CenterCard>
              <AlertCircle className="text-red-500" size={28} />
              <p className="font-semibold mt-3">Link vencido</p>
              <p className="text-xs text-muted-foreground mt-1">La fecha de pago expiró.</p>
            </CenterCard>
          )}

          {status === "error" && (
            <CenterCard>
              <AlertCircle className="text-red-500" size={28} />
              <p className="font-semibold mt-3">No pudimos cargar el link</p>
              <p className="text-xs text-muted-foreground mt-1">Intenta nuevamente mas tarde.</p>
            </CenterCard>
          )}

          <CheckoutSuccess {...vm} />

          <CheckoutForm {...vm} />
        </div>
      </main>
    </div>
  );
}
