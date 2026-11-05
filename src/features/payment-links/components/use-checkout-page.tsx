import {
countLinkView,
getPublicLink,
listActiveBrands,
} from "@/features/payment-links/payment-links.supabase";
import { useEffect,useMemo,useRef,useState } from "react";
import { moneyFromDecimal,moneyInputToNumber } from "@/shared/lib/money";
import { paymentMethods } from "@/features/payment-links/payment-links.data";
import {
PAYWAY_TEST_CARD,
isDevWithTestCard,
testCardFitsMethod,
} from "@/features/payment-links/payway-test-card";
import { toast } from "sonner";
import { paymentProcessor } from "@/features/payment-links/payment-processor";
import {
BATCH_CATEGORY_TO_METHODS,
EXTRA_METHODS,
expandMethods,
getMethodIdFromBrand,
isCardMethod,
route,
variantsDeBrand,
} from "@/features/payment-links/checkout.rules";
import { type LinkData } from "@/features/payment-links/checkout.types";

/** Estado y acciones de CheckoutPage: el componente solo dibuja. */
export function useCheckoutPage() {
  const { code } = route.useParams();
  const [status, setStatus] = useState<
    "loading" | "ready" | "notfound" | "inactive" | "expired" | "success" | "error"
  >("loading");
  const [data, setData] = useState<LinkData | null>(null);
  const [method, setMethod] = useState<string>("");
  const [amountPay, setAmountPay] = useState<string>("");
  const [holder, setHolder] = useState("");
  const [nro, setNro] = useState("");
  const [venc, setVenc] = useState("");
  const [cvv, setCvv] = useState("");
  const [email, setEmail] = useState("");
  const [document, setDocument] = useState("");
  const cardFormRef = useRef<HTMLFormElement | null>(null);
  const [processing, setProcessing] = useState(false);
  /**
   * Datos del comprobante que ve el pagador al terminar.
   *
   * `pagoEn` es la hora del navegador, no la del servidor: el backend no
   * devuelve el `created_at` que escribio en `cliente_links_pago_pagos`. Se
   * muestra en hora local de quien pago, que es como se lee un comprobante,
   * pero si hace falta la hora exacta del servidor hay que exponerla en la
   * respuesta de `/api/payway`.
   */
  const [result, setResult] = useState<{
    id: string;
    monto: number;
    ref: string;
    paywayPaymentId?: string;
    cuotas?: number;
    metodo?: string;
    pagoEn: Date;
    /** true cuando el cobro fue simulado (no se llamo a la pasarela). */
    simulado?: boolean;
  } | null>(null);
  const [merchantBrands, setMerchantBrands] = useState<string[]>([]);
  /**
   * Filas de `comercio_banderas` con su UUID. El backend resuelve el metodo
   * a partir del id de bandera, no del texto visible, asi que hace falta
   * poder mapear "visa-cred" -> fila concreta del comercio del link.
   */
  const [brandsRows, setBrandsRows] = useState<Array<{ id: string; bandera: string }>>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const d = await getPublicLink<LinkData>(code);
        if (cancelled) return;
        if (!d) {
          setStatus("notfound");
          return;
        }

        if (d.estado === "Inactivo") {
          setData(d);
          setStatus("inactive");
          return;
        }
        if (d.expira_en && new Date(d.expira_en).getTime() < Date.now()) {
          setData(d);
          setStatus("expired");
          return;
        }
        await countLinkView(d.id);
        setData(d);

        if (d.comercio_id) {
          const bandas = await listActiveBrands(d.comercio_id);
          setBrandsRows((bandas ?? []) as Array<{ id: string; bandera: string }>);
          const flags = (bandas ?? []).map((b: { bandera: string }) =>
            b.bandera.toLowerCase().replace(/\s+/g, "_"),
          );
          setMerchantBrands(flags);
          if (flags.length > 0) {
            setMethod(getMethodIdFromBrand(flags[0]));
          } else {
            const expanded = expandMethods(d.metodos_pago);
            setMethod((expanded[0] ?? d.metodos_pago?.[0] ?? "").trim());
          }
        } else {
          const expanded = expandMethods(d.metodos_pago);
          setMethod((expanded[0] ?? d.metodos_pago?.[0] ?? "").trim());
        }
        setAmountPay(total(d).toFixed(2));
        setStatus("ready");
      } catch {
        if (!cancelled) setStatus("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [code]);

  const total = (d: LinkData) => {
    if (d.detalle?.length) {
      // En centavos: 0,1 x 3 no puede dar 0,30000000000000004.
      const cents = d.detalle.reduce(
        (a, p) => a + Math.round(moneyFromDecimal(p.precio_unitario).cents * Number(p.cantidad)),
        0,
      );
      return cents / 100;
    }
    return Number(d.monto ?? 0);
  };

  const methodsAvailables = useMemo(() => {
    // Catálogo completo usado solo como diccionario id -> label. Nada se
    // muestra sin que el comercio lo habilite: la única fuente de verdad son
    // las banderas activas del comercio del link (o el `metodos_pago` que quedó
    // guardado en el link). No hay fallback que vuelque el catálogo entero ni
    // métodos agregados de forma incondicional.
    //
    // Cada bandera del comercio corresponde a UN método visible: si el comercio
    // tiene 3 banderas (Visa, Mastercard, Amex) se muestran 3 botones, no 6
    // por la expansión crédito/débito. Quien quiera débito por separado carga
    // la bandera "visa_débito" explícitamente.
    const base = [...paymentMethods, ...EXTRA_METHODS];
    const methodIds = new Set<string>();

    if (merchantBrands.length > 0) {
      // El comercio se resolvió y tiene banderas activas: solo sus métodos.
      merchantBrands.forEach((b) => {
        methodIds.add(getMethodIdFromBrand(b));
      });
    } else if (data?.metodos_pago?.length) {
      // Sin banderas resueltas (link sin comercio o lectura anónima limitada):
      // usar exactamente lo que guardó el link al crearse.
      data.metodos_pago.forEach((m) => {
        if (BATCH_CATEGORY_TO_METHODS[m]) {
          BATCH_CATEGORY_TO_METHODS[m].forEach((v) => methodIds.add(v));
          return;
        }
        methodIds.add(getMethodIdFromBrand(m));
      });
    }

    return base.filter((m) => methodIds.has(m.id));
  }, [data, merchantBrands]);

  /**
   * Metodo elegido -> UUID de la fila `comercio_banderas` que lo representa.
   *
   * El backend resuelve el metodo_key y la bandera a partir de ese UUID; con
   * el texto del metodo ("visa-cred") el lookup falla cuando el comercio no
   * tiene ese metodo_key cargado. Si ninguna bandera cubre el metodo, devuelve
   * undefined y el backend cae al camino legacy con `method`.
   */
  const brandIdDelMethod = (methodId: string): string | undefined => {
    if (!methodId) return undefined;
    return brandsRows.find((b) => variantsDeBrand(b.bandera).includes(methodId))?.id;
  };

  const isAmex = method === "amex";
  const cardDigitsMax = method === "amex" ? 15 : method === "diners" ? 14 : 16;
  const cvvMax = isAmex ? 4 : 3;

  /**
   * Prellena los datos de prueba de Payway, solo en desarrollo.
   *
   * Es una comodidad para no tipear 16 digitos en cada iteracion. El gate esta
   * en `isDevWithTestCard()`, que exige build de desarrollo mas el flag
   * explicito: en produccion esto no corre.
   *
   * Los campos se llenan para cualquier metodo de tarjeta cuyo PAN sea de 16
   * digitos. Amex (15) y Diners (14) se saltan a proposito: recortada, la
   * tarjeta daria un numero invalido en vez de un error que explique el motivo.
   */
  useEffect(() => {
    if (!isDevWithTestCard() || status !== "ready") return;
    if (!isCardMethod(method) || !testCardFitsMethod(method)) return;
    setHolder(PAYWAY_TEST_CARD.holderName);
    setNro(formatNro(PAYWAY_TEST_CARD.number));
    setVenc(formatVenc(PAYWAY_TEST_CARD.expiration));
    setCvv(PAYWAY_TEST_CARD.securityCode);
    setDocument(PAYWAY_TEST_CARD.docNumber);
    setEmail("test@molipay.com.ar");
    // formatNro/formatVenc dependen de cardDigitsMax, que ya esta definido
    // arriba y solo cambia al cambiar de metodo.
  }, [status, method]);

  const formatNro = (v: string) => {
    const digits = v.replace(/\D/g, "").slice(0, cardDigitsMax);
    if (isAmex) {
      return [digits.slice(0, 4), digits.slice(4, 10), digits.slice(10, 15)]
        .filter(Boolean)
        .join(" ");
    }
    return digits.replace(/(\d{4})(?=\d)/g, "$1 ");
  };

  const formatVenc = (v: string) => {
    const digits = v.replace(/\D/g, "").slice(0, 4);
    if (digits.length <= 2) return digits;
    return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  };

  // El SDK lee mes y anio por separado desde el DOM, mientras que el formulario
  // muestra un unico "MM/AA". Se derivan del mismo estado para que no puedan
  // desincronizarse.
  const vencMonth = venc.replace(/\D/g, "").slice(0, 2);
  const vencYear = venc.replace(/\D/g, "").slice(2, 4);

  const chooseMethod = (id: string) => {
    setMethod(id);
    const amex = id === "amex";
    const max = id === "amex" ? 15 : id === "diners" ? 14 : 16;
    setNro((prev) => {
      const digits = prev.replace(/\D/g, "").slice(0, max);
      if (amex) {
        return [digits.slice(0, 4), digits.slice(4, 10), digits.slice(10, 15)]
          .filter(Boolean)
          .join(" ");
      }
      return digits.replace(/(\d{4})(?=\d)/g, "$1 ");
    });
    setCvv((prev) => prev.slice(0, amex ? 4 : 3));
  };

  const validate = () => {
    if (!method) return "Selecciona un metodo de pago";
    if (isCardMethod(method)) {
      if (!holder.trim()) return "Ingresa el titular de la tarjeta";
      if (nro.replace(/\s/g, "").length !== cardDigitsMax) return "Numero de tarjeta invalido";
      if (!/^\d{2}\/\d{2}$/.test(venc)) return "Vencimiento invalido (MM/AA)";
      if (cvv.length !== cvvMax) return "CVV invalido";
      // La API de Payway exige la identificacion del titular: sin esto el token
      // no se genera y el error que vuelve no dice que falta este campo.
      if (document.trim().length < 6) return "Ingresa el numero de documento del titular";
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return "Email invalido";
    const mp = moneyInputToNumber(amountPay);
    if (data && (mp <= 0 || mp > total(data) + 0.001)) return "Monto a pagar invalido";
    // No se exige comercio_id: el backend lo deriva del link. Validarlo aca solo
    // serviria para bloquear pagos validos si el anon-read fallara.
    return null;
  };

  const pay = async () => {
    const err = validate();
    if (err) {
      toast.error(err);
      return;
    }
    if (!data) return;
    setProcessing(true);
    try {
      const mp = moneyInputToNumber(amountPay);

      // Se envia el codigo del link, no su id ni su monto. El backend resuelve
      // el link y calcula cuanto corresponde cobrar: el `mp` de arriba es un dato
      // de UI para links con pagos parciales, no una autoridad.
      const res = await paymentProcessor.process({
        linkCode: code,
        metodo: method,
        banderaId: brandIdDelMethod(method),
        monto: mp,
        pagadorNombre: holder.trim(),
        pagadorEmail: email.trim(),
        card: isCardMethod(method)
          ? { number: nro, holderName: holder.trim(), expiration: venc, securityCode: cvv }
          : undefined,
        // El SDK de Payway lee la tarjeta del DOM, no de este objeto: necesita
        // el `<form>` con los atributos `data-decidir`.
        cardForm: isCardMethod(method) ? cardFormRef.current : null,
        ...(document.trim()
          ? { documento: { type: "dni" as const, number: document.trim() } }
          : {}),
      });

      // El monto que se muestra es el que confirmo el backend, no el que se
      // pidio desde el formulario.
      setResult({
        id: res.id,
        monto: res.monto ?? mp,
        ref: data.referencia ?? res.id,
        paywayPaymentId: res.paywayPaymentId,
        // El checkout no ofrece selector de cuotas, asi que el pedido sale sin
        // `cuotas` y el backend aplica su default (1). Solo tiene sentido
        // mostrarlo para metodos que se pagan en cuotas.
        cuotas: isCardMethod(method) ? 1 : undefined,
        metodo: methodsAvailables.find((m) => m.id === method)?.label ?? method,
        pagoEn: new Date(),
      });
      setStatus("success");
    } catch (e: any) {
      // Los datos de la tarjeta no se conservan: si el usuario reintenta, vuelve
      // a tipearlos. Es una decision de PCI, no de conveniencia.
      if (isCardMethod(method)) {
        setNro("");
        setCvv("");
        setVenc("");
      }
      if (e?.name === "PaymentPendingError") {
        toast.info(e.message);
        return;
      }
      if (e?.name === "CardMethodMismatchError") {
        const label =
          methodsAvailables.find((m) => m.id === method)?.label ?? "el medio de pago elegido";
        toast.error("La tarjeta no coincide con el medio de pago", {
          description: `Elegiste ${label}, pero el número ingresado es de otra tarjeta. Revisá el número o elegí el medio de pago que corresponde a tu tarjeta. No se realizó ningún cargo.`,
          duration: 8000,
        });
        return;
      }
      toast.error(e?.message || "No se pudo procesar el pago");
    } finally {
      setProcessing(false);
    }
  };

  /**
   * Simulacion de pago: mismo camino que `pagar` menos la validacion de los
   * campos de tarjeta (no se tokeniza nada) y menos la llamada a la pasarela.
   * El backend registra el cobro via RPC como aprobado, asi que el movimiento
   * y los lotes quedan en la base igual que con un cobro real.
   */
  const simulate = async () => {
    if (!method) {
      toast.error("Selecciona un metodo de pago");
      return;
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      toast.error("Email invalido");
      return;
    }
    const mp = moneyInputToNumber(amountPay);
    if (data && (mp <= 0 || mp > total(data) + 0.001)) {
      toast.error("Monto a pagar invalido");
      return;
    }
    if (!data) return;
    setProcessing(true);
    try {
      const res = await paymentProcessor.simulate({
        linkCode: code,
        metodo: method,
        banderaId: brandIdDelMethod(method),
        monto: mp,
        pagadorNombre: holder.trim() || "Pago simulado",
        pagadorEmail: email.trim(),
        ...(document.trim()
          ? { documento: { type: "dni" as const, number: document.trim() } }
          : {}),
      });

      setResult({
        id: res.id,
        monto: res.monto ?? mp,
        ref: data.referencia ?? res.id,
        paywayPaymentId: res.paywayPaymentId,
        cuotas: isCardMethod(method) ? 1 : undefined,
        metodo: methodsAvailables.find((m) => m.id === method)?.label ?? method,
        pagoEn: new Date(),
        simulado: true,
      });
      setStatus("success");
    } catch (e: any) {
      toast.error(e?.message || "No se pudo simular el pago");
    } finally {
      setProcessing(false);
    }
  };
  return {
    status,
    data,
    method,
    amountPay,
    setAmountPay,
    holder,
    setHolder,
    nro,
    setNro,
    venc,
    setVenc,
    cvv,
    setCvv,
    email,
    setEmail,
    document,
    setDocument,
    cardFormRef,
    processing,
    result,
    total,
    methodsAvailables,
    isAmex,
    cvvMax,
    formatNro,
    formatVenc,
    vencMonth,
    vencYear,
    chooseMethod,
    pay,
    simulate,
  };
}

export type CheckoutPageVm = ReturnType<typeof useCheckoutPage>;
