import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useMemo, type ReactNode } from "react";
import {
  Loader2,
  CheckCircle2,
  Lock,
  CreditCard,
  AlertCircle,
  ShieldCheck,
} from "lucide-react";
import { Card, BtnPrimary, Input, Label } from "@/components/portal-shell";
import { toast } from "sonner";
import { requireSupabase } from "@/lib/supabase";
import { paymentProcessor } from "@/lib/payment-processor";
import { paymentMethods } from "@/data/links-pago";

export const Route = createFileRoute("/p/$code")({ component: Checkout });

type LinkData = {
  id: string;
  url: string;
  estado: string;
  referencia: string | null;
  notas: string | null;
  expira_en: string | null;
  pagos_parciales: boolean;
  metodos_pago: string[];
  cliente_legajo: string;
  monto: number;
  detalle: Array<{ producto_nombre: string; cantidad: number; precio_unitario: number }>;
};

const formatARS = (n: number) =>
  `$ ${Number(n || 0).toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function Checkout() {
  const { code } = Route.useParams();
  const [status, setStatus] = useState<"loading" | "ready" | "notfound" | "inactive" | "expired" | "success" | "error">("loading");
  const [data, setData] = useState<LinkData | null>(null);
  const [method, setMethod] = useState<string>("");
  const [montoPagar, setMontoPagar] = useState<string>("");
  const [titular, setTitular] = useState("");
  const [nro, setNro] = useState("");
  const [venc, setVenc] = useState("");
  const [cvv, setCvv] = useState("");
  const [email, setEmail] = useState("");
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<{ id: string; monto: number; ref: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const s = requireSupabase();
        const { data: r } = await s.rpc("obtener_link_pago", { p_codigo: code });
        if (cancelled) return;
        if (!r) {
          setStatus("notfound");
          return;
        }
        const d = r as LinkData;
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
        await s.rpc("incrementar_vistas_link", { p_link_id: d.id });
        setData(d);
        setMethod(d.metodos_pago?.[0] ?? "");
        setMontoPagar(total(d).toFixed(2));
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
      return d.detalle.reduce((a, p) => a + Number(p.precio_unitario) * Number(p.cantidad), 0);
    }
    return Number(d.monto ?? 0);
  };

  const metodosDisponibles = useMemo(() => {
    if (!data?.metodos_pago?.length) return paymentMethods;
    return paymentMethods.filter((m) => data.metodos_pago.includes(m.id));
  }, [data]);

  const validar = () => {
    if (!method) return "Selecciona un metodo de pago";
    if (!titular.trim()) return "Ingresa el titular de la tarjeta";
    if (nro.replace(/\s/g, "").length < 12) return "Numero de tarjeta invalido";
    if (!/^\d{2}\/\d{2}$/.test(venc)) return "Vencimiento invalido (MM/AA)";
    if (cvv.length < 3) return "CVV invalido";
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return "Email invalido";
    const mp = parseFloat(montoPagar.replace(",", "."));
    if (data && (mp <= 0 || mp > total(data) + 0.001)) return "Monto a pagar invalido";
    return null;
  };

  const pagar = async () => {
    const err = validar();
    if (err) {
      toast.error(err);
      return;
    }
    if (!data) return;
    setProcessing(true);
    try {
      const mp = parseFloat(montoPagar.replace(",", "."));
      const res = await paymentProcessor.process({
        linkId: data.id,
        clienteLegajo: data.cliente_legajo,
        metodo: method,
        monto: mp,
        pagadorNombre: titular.trim(),
        pagadorEmail: email.trim(),
        referencia: data.referencia ?? undefined,
      });
      setResult({ id: res.id, monto: mp, ref: data.referencia ?? res.id });
      setStatus("success");
    } catch (e: any) {
      toast.error(e?.message || "No se pudo procesar el pago");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(120%_120%_at_50%_0%,#fff_40%,#fdecee_100%)] flex flex-col">
      {/* Barra de marca */}
      <header className="flex items-center justify-between px-5 py-4 max-w-2xl mx-auto w-full">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md bg-[color:var(--brand-dark)] flex items-center justify-center">
            <span className="text-white font-black text-sm">M</span>
          </div>
          <span className="font-black tracking-tight text-lg text-[color:var(--brand-dark)]">MoliPay</span>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
          <Lock size={13} /> Pago seguro
        </div>
      </header>

      <main className="flex-1 px-4 pb-10 flex justify-center">
        <div className="w-full max-w-md">
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
              <p className="text-xs text-muted-foreground mt-1">El enlace no existe o fue removido.</p>
            </CenterCard>
          )}

          {status === "inactive" && (
            <CenterCard>
              <AlertCircle className="text-amber-500" size={28} />
              <p className="font-semibold mt-3">Link inactivo</p>
              <p className="text-xs text-muted-foreground mt-1">Este cobro no esta disponible en este momento.</p>
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

          {status === "success" && result && (
            <CenterCard>
              <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center mb-2">
                <CheckCircle2 className="text-emerald-600" size={32} />
              </div>
              <p className="font-bold text-lg">Pago aprobado</p>
              <p className="text-sm text-muted-foreground mt-1">Gracias, tu operacion fue completada.</p>
              <div className="w-full mt-4 space-y-2 text-sm">
                <Row label="Monto" value={formatARS(result.monto)} />
                <Row label="Referencia" value={result.ref || "—"} />
                <Row label="Comprobante" value={String(result.id).slice(0, 8).toUpperCase()} />
              </div>
            </CenterCard>
          )}

          {status === "ready" && data && (
            <Card className="p-5 sm:p-6 shadow-xl border-0">
              <div className="flex items-center gap-2 text-[11px] font-semibold text-muted-foreground mb-1">
                <ShieldCheck size={14} className="text-emerald-600" /> Cobro generado por MoliPay
              </div>
              <div className="text-3xl font-black tracking-tight text-[color:var(--brand-dark)]">
                {formatARS(parseFloat(montoPagar.replace(",", ".")))}
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

              {data.pagos_parciales && (
                <div className="mt-4">
                  <Label>Monto a pagar (pagos parciales habilitados)</Label>
                  <Input
                    className="mt-1"
                    inputMode="decimal"
                    value={montoPagar}
                    onChange={(e) => setMontoPagar(e.target.value)}
                  />
                  <div className="text-[11px] text-muted-foreground mt-1">
                    Máximo {formatARS(total(data))}
                  </div>
                </div>
              )}

              <div className="mt-5">
                <Label>Metodo de pago</Label>
                <div className="grid grid-cols-2 gap-2 mt-1.5">
                  {metodosDisponibles.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => setMethod(m.id)}
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
              </div>

              <div className="mt-5 space-y-3">
                <div>
                  <Label>Titular de la tarjeta</Label>
                  <Input className="mt-1" value={titular} onChange={(e) => setTitular(e.target.value)} placeholder="Como aparece en la tarjeta" />
                </div>
                <div>
                  <Label>Numero de tarjeta</Label>
                  <Input
                    className="mt-1 font-mono"
                    inputMode="numeric"
                    value={nro}
                    onChange={(e) => setNro(e.target.value)}
                    placeholder="0000 0000 0000 0000"
                  />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label>Vencimiento</Label>
                    <Input className="mt-1 font-mono" value={venc} onChange={(e) => setVenc(e.target.value)} placeholder="MM/AA" />
                  </div>
                  <div>
                    <Label>CVV</Label>
                    <Input className="mt-1 font-mono" inputMode="numeric" value={cvv} onChange={(e) => setCvv(e.target.value)} placeholder="123" />
                  </div>
                  <div className="col-span-1">
                    <Label>Email</Label>
                    <Input className="mt-1" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@email.com" />
                  </div>
                </div>
              </div>

              <BtnPrimary className="w-full mt-6 h-12 text-sm" onClick={pagar} disabled={processing}>
                {processing ? (
                  <>
                    <Loader2 size={16} className="animate-spin" /> Procesando…
                  </>
                ) : (
                  `Pagar ${formatARS(parseFloat(montoPagar.replace(",", ".")))}`
                )}
              </BtnPrimary>

              <p className="text-[11px] text-center text-muted-foreground mt-3 flex items-center justify-center gap-1">
                <Lock size={11} /> Tus datos se transmiten cifrados
              </p>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}

function CenterCard({ children }: { children: ReactNode }) {
  return (
    <Card className="p-8 shadow-xl border-0 flex flex-col items-center text-center">
      {children}
    </Card>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b pb-2 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold font-mono">{value}</span>
    </div>
  );
}
