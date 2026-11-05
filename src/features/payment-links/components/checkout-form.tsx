import { moneyInputToNumber } from "@/shared/lib/money";
import {
isDevWithTestCard,
isPaywayTestCardApproved,
testCardFitsMethod,
} from "@/features/payment-links/payway-test-card";
import { CreditCard,FlaskConical,Loader2,Lock,ShieldCheck } from "lucide-react";
import { Card } from "@/shared/ui/card";
import { Input,Label } from "@/shared/ui/form-controls";
import { BtnPrimary } from "@/shared/ui/button";
import { formatARS,isCardMethod } from "@/features/payment-links/checkout.rules";

import type { CheckoutPageVm } from "./use-checkout-page";

export function CheckoutForm({
  status,
  data,
  amountPay,
  setAmountPay,
  total,
  methodsAvailables,
  chooseMethod,
  method,
  cardFormRef,
  holder,
  setHolder,
  nro,
  setNro,
  formatNro,
  isAmex,
  vencMonth,
  vencYear,
  venc,
  setVenc,
  formatVenc,
  cvvMax,
  cvv,
  setCvv,
  document,
  setDocument,
  email,
  setEmail,
  pay,
  processing,
  simulate,
}: Pick<
  CheckoutPageVm,
  | "status"
  | "data"
  | "amountPay"
  | "setAmountPay"
  | "total"
  | "methodsAvailables"
  | "chooseMethod"
  | "method"
  | "cardFormRef"
  | "holder"
  | "setHolder"
  | "nro"
  | "setNro"
  | "formatNro"
  | "isAmex"
  | "vencMonth"
  | "vencYear"
  | "venc"
  | "setVenc"
  | "formatVenc"
  | "cvvMax"
  | "cvv"
  | "setCvv"
  | "document"
  | "setDocument"
  | "email"
  | "setEmail"
  | "pay"
  | "processing"
  | "simulate"
>) {
  return (
    <>
      {status === "ready" && data && (
        <div className="grid md:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] gap-6 items-start">
          {/* Resumen del cobro */}
          <Card className="p-6 shadow-xl border-0">
            <div className="flex items-center gap-2 text-[11px] font-semibold text-muted-foreground mb-1">
              <ShieldCheck size={14} className="text-emerald-600" />{" "}
              {data.comercio_nombre || "MoliPay"}
            </div>
            <div className="text-3xl font-black tracking-tight text-[color:var(--brand-dark)]">
              {formatARS(moneyInputToNumber(amountPay))}
            </div>
            <div className="text-xs text-muted-foreground">Total a abonar</div>

            {data.detalle?.length > 0 && (
              <div className="mt-4 border rounded-lg divide-y">
                {data.detalle.map((p, i) => (
                  <div key={i} className="flex items-center justify-between px-3 py-2.5 text-sm">
                    <div className="min-w-0">
                      <div className="font-semibold truncate">{p.producto_nombre}</div>
                      <div className="text-[11px] text-muted-foreground">
                        {p.cantidad} × {formatARS(p.precio_unitario)}
                      </div>
                    </div>
                    <div className="font-mono tabular-nums font-semibold">
                      {formatARS(p.precio_unitario * p.cantidad)}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {data.referencia && (
              <div className="mt-4 text-xs text-muted-foreground">
                Referencia: <span className="font-semibold text-foreground">{data.referencia}</span>
              </div>
            )}
            {data.notas && <div className="mt-2 text-xs text-muted-foreground">{data.notas}</div>}

            {data.pagos_parciales && (
              <div className="mt-4">
                <Label>Monto a pagar (pagos parciales habilitados)</Label>
                <Input
                  className="mt-1"
                  inputMode="decimal"
                  value={amountPay}
                  onChange={(e) => setAmountPay(e.target.value)}
                />
                <div className="text-[11px] text-muted-foreground mt-1">
                  Máximo {formatARS(total(data))}
                </div>
              </div>
            )}
          </Card>

          {/* Pago */}
          <Card className="p-6 shadow-xl border-0">
            <div>
              <Label>Metodo de pago</Label>
              {methodsAvailables.length === 0 ? (
                <p className="mt-1.5 rounded-lg border border-black-100 bg-muted/30 px-3 py-2.5 text-xs text-muted-foreground">
                  No hay metodos de pago habilitados para este link. Contacta al comercio.
                </p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-1.5">
                  {methodsAvailables.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => chooseMethod(m.id)}
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-xs font-semibold transition ${
                        method === m.id
                          ? "border-[color:var(--brand-dark)] bg-[color:var(--brand-soft)] text-[color:var(--brand-dark)]"
                          : "bg-card hover:bg-muted"
                      }`}
                    >
                      <CreditCard size={15} /> {m.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {methodsAvailables.length === 0 ? null : isCardMethod(method) ? (
              <form
                ref={cardFormRef}
                className="mt-6 rounded-lg border border-black-100 bg-[color:var(--brand-soft)] p-4"
                onSubmit={(e) => e.preventDefault()}
              >
                <div className="flex items-center gap-2 text-sm font-bold mb-3">
                  <CreditCard size={17} className="text-[color:var(--brand-dark)]" />
                  Datos de la tarjeta
                </div>
                {/*
                      Aviso en pantalla cuando los campos vienen precargados con
                      datos de prueba. Es deliberado: una tarjeta de test
                      precargada que parece real es la forma mas facil de que
                      alguien pulse "pagar" creyendo que esta cobrando de verdad.
                    */}
                {isDevWithTestCard() && testCardFitsMethod(method) && (
                  <p className="mb-3 rounded-md bg-amber-50 border border-amber-200 px-2 py-1 text-[11px] font-semibold text-amber-800">
                    Datos de prueba de sandbox, no usar con clientes reales.
                    {!isPaywayTestCardApproved(method) &&
                      " Esta tarjeta es Visa: solo aprueba en Visa, porque Payway exige que el medio de pago coincida con la marca."}
                  </p>
                )}
                <div className="space-y-3">
                  <div>
                    <Label>Titular de la tarjeta</Label>
                    <Input
                      className="mt-1 bg-card"
                      autoComplete="cc-name"
                      maxLength={60}
                      value={holder}
                      onChange={(e) => setHolder(e.target.value)}
                      placeholder="Como aparece en la tarjeta"
                      data-decidir="card_holder_name"
                    />
                  </div>
                  <div>
                    <Label>Numero de tarjeta</Label>
                    <Input
                      className="mt-1 bg-card font-mono tracking-wider"
                      inputMode="numeric"
                      autoComplete="cc-number"
                      value={nro}
                      onChange={(e) => setNro(formatNro(e.target.value))}
                      placeholder={isAmex ? "0000 000000 00000" : "0000 0000 0000 0000"}
                      data-decidir="card_number"
                    />
                  </div>
                  {/*
                        El SDK de Payway espera mes y anio por separado, no un
                        "MM/AA" combinado. El input visible no lleva
                        `data-decidir`: los valores que el SDK lee salen de los
                        dos inputs ocultos de abajo, derivados del mismo estado.
                      */}
                  <input
                    type="hidden"
                    readOnly
                    data-decidir="card_expiration_month"
                    value={vencMonth}
                  />
                  <input
                    type="hidden"
                    readOnly
                    data-decidir="card_expiration_year"
                    value={vencYear}
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Vencimiento</Label>
                      <Input
                        className="mt-1 bg-card font-mono"
                        inputMode="numeric"
                        autoComplete="cc-exp"
                        maxLength={5}
                        value={venc}
                        onChange={(e) => setVenc(formatVenc(e.target.value))}
                        placeholder="MM/AA"
                        name="vencimiento"
                      />
                    </div>
                    <div>
                      <Label>CVV</Label>
                      {/*
                            El CVV se pide y se valida aca, pero NO lleva
                            `data-decidir`: el SDK de Payway no lo usa para
                            tokenizar (solo para re-pagar con una tarjeta ya
                            tokenizada). Marcarlo mandaria el CVV dentro de un
                            payload que la API puede rechazar.
                          */}
                      <Input
                        className="mt-1 bg-card font-mono"
                        inputMode="numeric"
                        autoComplete="cc-csc"
                        maxLength={cvvMax}
                        value={cvv}
                        onChange={(e) => setCvv(e.target.value.replace(/\D/g, "").slice(0, cvvMax))}
                        placeholder={isAmex ? "1234" : "123"}
                        name="cvv"
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Numero de documento del titular</Label>
                    {/*
                          La API de Payway exige `card_holder_identification`.
                          El SDK la arma a partir de estos dos campos: si estan
                          presentes produce el objeto, y si no, no lo manda. Por
                          eso el tipo va fijo en hidden y solo el numero es
                          editable.
                        */}
                    <input type="hidden" readOnly data-decidir="card_holder_doc_type" value="dni" />
                    <Input
                      className="mt-1 bg-card font-mono"
                      inputMode="numeric"
                      autoComplete="off"
                      maxLength={12}
                      value={document}
                      onChange={(e) => setDocument(e.target.value.replace(/\D/g, "").slice(0, 12))}
                      placeholder="12345678"
                      data-decidir="card_holder_doc_number"
                    />
                  </div>
                </div>
              </form>
            ) : (
              <div className="mt-6 rounded-lg border border-black-100 bg-[color:var(--brand-soft)] p-4">
                <div className="flex items-center gap-2 text-sm font-bold mb-3">
                  <CreditCard size={17} className="text-[color:var(--brand-dark)]" />
                  {method === "qr" ? "Codigo QR" : "Datos de transferencia"}
                </div>
                <p className="text-xs text-muted-foreground">
                  {method === "qr"
                    ? "Se generara un codigo QR para completar el pago."
                    : "Se te indicaran los datos de la cuenta para transferir."}
                </p>
              </div>
            )}

            <div className="mt-4">
              <Label>Email para el comprobante</Label>
              <Input
                className="mt-1"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
              />
            </div>

            <BtnPrimary
              className="w-full mt-6 h-12 text-sm"
              onClick={pay}
              disabled={processing || methodsAvailables.length === 0}
            >
              {processing ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> Procesando…
                </>
              ) : (
                `Pagar ${formatARS(moneyInputToNumber(amountPay))}`
              )}
            </BtnPrimary>

            {/*
                  Boton de simulacion: registra el cobro en la base como
                  aprobado sin llamar a la pasarela, para probar el flujo
                  completo (comprobante, movimiento, lotes) sin tarjeta ni
                  sandbox de Payway. El backend lo responde con 404 en
                  produccion, asi que aunque aparezca nunca simula un cobro
                  contra datos reales.
                */}
            <button
              type="button"
              onClick={simulate}
              disabled={processing}
              className="w-full mt-3 h-11 text-sm rounded-lg border-2 border-dashed border-amber-400 text-amber-700 bg-amber-50 hover:bg-amber-100 font-semibold transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {processing ? (
                <>
                  <Loader2 size={15} className="animate-spin" /> Simulando…
                </>
              ) : (
                <>
                  <FlaskConical size={15} /> Simular pago (solo test)
                </>
              )}
            </button>

            <p className="text-[11px] text-center text-muted-foreground mt-3 flex items-center justify-center gap-1">
              <Lock size={11} /> Tus datos se transmiten cifrados
            </p>
          </Card>
        </div>
      )}
    </>
  );
}
