import {
cotizarTransfer,
type FeeConfig,
type Quote,
type TaxAplicado,
} from "@/features/transfers/transfer-store";
import { formatMoney } from "@/shared/lib/format";
import { useEffect,useRef,useState } from "react";
import { type StepTransfer } from "./transfer-ui.types";

export const fmtPct = (n: number) => `${n.toLocaleString("es-AR", { maximumFractionDigits: 2 })}%`;

/** "0,6%" o "$ 150,00 fijo" (alícuota de un impuesto asignado). */
export const detailTax = (t: TaxAplicado) =>
  t.tipoCalculo === "Monto fijo" ? `${formatMoney(t.alicuota)} fijo` : fmtPct(t.alicuota);

/** "1,5% del monto" o "fijo $ 5,00 por transferencia". */
export const detailFee = (c: FeeConfig) =>
  c.modalidad === "Fijo"
    ? `fijo ${formatMoney(c.montoFijo ?? 0)} por transferencia`
    : `${fmtPct(c.porcentaje ?? 0)} del monto`;

// ============================================================================
// Cotizacion en tiempo real
// ============================================================================

/**
 * Cotiza contra la base (misma regla de comision que se cobra al enviar), con
 * debounce. Mientras llega la respuesta, `estimado` compara el monto contra el
 * disponible local para que la validacion sea inmediata.
 */
export function useQuote(
  subaccountOrigin: string,
  amount: number,
  destination: string | null | undefined,
  available: number,
) {
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(false);
  const pedido = useRef(0);

  useEffect(() => {
    if (!subaccountOrigin || !(amount > 0)) {
      setQuote(null);
      setLoading(false);
      return;
    }
    const id = ++pedido.current;
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const c = await cotizarTransfer({
          subcuentaOrigen: subaccountOrigin,
          monto: amount,
          destino: destination,
        });
        if (id === pedido.current) setQuote(c);
      } catch {
        if (id === pedido.current) setQuote(null);
      } finally {
        if (id === pedido.current) setLoading(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [subaccountOrigin, amount, destination]);

  // La cotizacion vieja no vale si cambio el monto u origen.
  const effective = quote && quote.monto === Math.round(amount * 100) / 100 ? quote : null;
  const excedeAvailable = amount > 0 && amount > available;
  const insuficiente = excedeAvailable || (effective ? !effective.alcanza : false);
  const faltante = effective ? effective.faltante : Math.max(amount - available, 0);

  return { cotizacion: effective, cargando: loading, insuficiente, faltante };
}

/** Cargo que se suma al monto: "+ $ 6,00". */
export const fmtCargo = (n: number) => `+ ${formatMoney(n)}`;

export const STEPS: { key: StepTransfer; label: string }[] = [
  { key: "reserva", label: "Reservando fondos" },
  { key: "envio", label: "Enviando al banco" },
  { key: "confirmacion", label: "Confirmando la operación" },
];
