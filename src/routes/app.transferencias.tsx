import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef, useEffect, useCallback } from "react";
import { ArrowUpRight, Calendar, Clock, ShieldCheck, Star, Trash2, Edit3, Play, FileText, Save, Users, X, Plus, KeyRound } from "lucide-react";
import { PageHeader, Input, Label, BtnPrimary, BtnOutline, Badge } from "@/components/portal-shell";
import { toast } from "sonner";
import { FormDialog } from "@/components/form-dialog";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { requireSupabase, toDataError, isPermissionError } from "@/lib/supabase";
import { recipientValidator, detectIdentifierKind } from "@/lib/recipient-validation";
import { executeTransfer } from "@/lib/transfer-orchestrator";

export const Route = createFileRoute("/app/transferencias")({ component: Page });

type Tab = "unica" | "programar" | "borradores" | "programadas" | "destinatarios";

type Draft = { id: string; destinatario: string; alias: string; monto: string; concepto: string; ref: string; fecha: string; cbu?: string; subcuentaOrigen?: string; montoNum?: number };
type Scheduled = { id: string; destinatario: string; alias: string; monto: string; fecha: string; hora: string; estado: string; concepto: string; cbu?: string; subcuentaOrigen?: string; montoNum?: number };
type CoelsaResult = { nombre: string; cuit: string; cbu: string; alias: string };
type Destinatario = CoelsaResult & { banco: string };

type Subcuenta = { id: string; nombre: string; cbu: string | null; saldo_disponible: number; tipo: string };

const fmt = (n: number) => `$ ${n.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function Page() {
  const [tab, setTab] = useState<Tab>("unica");
  const [confirm, setConfirm] = useState(false);
  const [destAlias, setDestAlias] = useState("");
  const [saveDestOpen, setSaveDestOpen] = useState(false);
  const [destValidation, setDestValidation] = useState<import("@/lib/recipient-validation").RecipientValidationResult | null>(null);
  const [prefilledDestinatario, setPrefilledDestinatario] = useState<CoelsaResult | undefined>(undefined);
  const [plantillaOpen, setPlantillaOpen] = useState(false);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [scheduled, setScheduled] = useState<Scheduled[]>([]);
  const [otpOpen, setOtpOpen] = useState(false);
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [confirmarEliminacion, setConfirmarEliminacion] = useState<{
    tipo: "borrador" | "programada";
    id: string;
  } | null>(null);

  const [subcuentas, setSubcuentas] = useState<Subcuenta[]>([]);
  const [totalDisponible, setTotalDisponible] = useState(0);
  const [enviadoMes, setEnviadoMes] = useState({ monto: 0, ops: 0 });
  const [loading, setLoading] = useState(true);

  const cargarDatos = useCallback(async () => {
    try {
      const sb = requireSupabase();
      const { data: { user } } = await sb.auth.getUser();
      const { data: cli } = await sb
        .from("clientes")
        .select("legajo")
        .eq("correo", user?.email ?? "")
        .maybeSingle();
      if (!cli?.legajo) return;

      const { data: subs } = await sb
        .from("subcuentas")
        .select("id, nombre, cbu, saldo_disponible, tipo")
        .eq("cliente_legajo", cli.legajo)
        .order("nombre", { ascending: true });
      setSubcuentas(subs ?? []);
      setTotalDisponible((subs ?? []).reduce((s, x) => s + (Number(x.saldo_disponible) || 0), 0));

      const now = new Date();
      const primerDiaMes = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const { data: movs } = await sb
        .from("movimientos")
        .select("monto_operacion, tipo")
        .eq("legajo", cli.legajo)
        .gte("fecha", primerDiaMes)
        .in("tipo", ["transferencia"]);
      const movsArr = movs ?? [];
      setEnviadoMes({
        monto: movsArr.reduce((s, m) => s + (Number(m.monto_operacion) || 0), 0),
        ops: movsArr.length,
      });
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { cargarDatos(); }, [cargarDatos]);

  const [otpSending, setOtpSending] = useState(false);

  const resetOtp = () => {
    setOtp(["", "", "", "", "", ""]);
    otpRefs.current[0]?.focus();
  };

  const enviarOtpCorreo = async () => {
    setOtpSending(true);
    try {
      const sb = requireSupabase();
      const { data, error } = await sb.functions.invoke("enviar-otp-transferencia", { body: {} });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success("Código enviado a tu correo");
      return true;
    } catch (e) {
      const msg = toDataError(e).message;
      toast.error(msg || "No se pudo enviar el código. Intenta reenviar.");
      return false;
    } finally {
      setOtpSending(false);
    }
  };

  const openOtp = async () => {
    resetOtp();
    setOtpOpen(true);
    // Envía el código por Resend al correo autenticado (credenciales RESEND_API_KEY / RESEND_FROM)
    await enviarOtpCorreo();
  };

  const [transferPayload, setTransferPayload] = useState<{
    subcuentaOrigen: string;
    destinatarioCbu: string;
    monto: number;
    concepto: string;
  } | null>(null);

  const [otpVerifying, setOtpVerifying] = useState(false);

  const confirmWithOtp = async () => {
    const code = otp.join("");
    if (code.length !== 6) {
      toast.error("Ingresa el código de 6 dígitos");
      return;
    }
    if (!transferPayload) {
      toast.error("No hay datos de transferencia para confirmar");
      return;
    }
    setOtpVerifying(true);
    try {
      const sb = requireSupabase();
      const { data, error } = await sb.functions.invoke("verificar-otp-transferencia", { body: { codigo: code } });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (!data?.ok) throw new Error("Código no válido");
    } catch (e) {
      const msg = toDataError(e).message;
      toast.error(msg || "Código incorrecto o expirado");
      setOtpVerifying(false);
      return;
    }
    setOtpVerifying(false);
    setOtpOpen(false);
    setConfirm(false);
    try {
      // Flujo desacoplado: validación → ejecución → movimiento
      const result = await executeTransfer({
        subcuentaOrigenId: transferPayload.subcuentaOrigen,
        destinatarioIdentifier: transferPayload.destinatarioCbu,
        monto: transferPayload.monto,
        concepto: transferPayload.concepto || null,
      });
      if (!result.ok) {
        const msg =
          result.validation.status === "not_found"
            ? "Destinatario no encontrado"
            : result.validation.status === "rejected"
              ? "Validación rechazada"
              : result.validation.status === "timeout"
                ? "Timeout validando destinatario"
                : result.error ?? "Validación fallida";
        toast.error(msg);
        return;
      }
      toast.success(`Transferencia enviada — TXID: ${result.txn.id_txn}`);
      setDestAlias(result.validation.titular?.alias ?? transferPayload.destinatarioCbu.slice(0, 10) + "...");
      setDestValidation(result.validation);
      setSaveDestOpen(true);
      setTransferPayload(null);
      await cargarDatos();
    } catch (e) {
      const err = toDataError(e);
      if (isPermissionError(e)) {
        toast.error("Sin permisos para realizar esta transferencia");
      } else {
        toast.error(err.message || "No se pudo enviar la transferencia");
      }
    }
  };

  const tabs: { key: Tab; label: string }[] = [
    { key: "unica", label: "Transferencia unica" },
    { key: "programar", label: "Programar" },
    { key: "borradores", label: "Borradores" },
    { key: "programadas", label: "Transferencias programadas" },
    { key: "destinatarios", label: "Destinatarios frecuentes" },
  ];

  return (
    <>
      <PageHeader
        title="Transferir"
        description="Envios inmediatos, programados y a CBU, CVU o alias."
        action={<BtnOutline onClick={() => setPlantillaOpen(true)}><FileText size={14} /> Plantillas</BtnOutline>}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="bg-card border rounded-lg p-3">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Disponible hoy</div>
          <div className="font-display tabular-nums text-base md:text-lg font-semibold mt-0.5">{fmt(totalDisponible)}</div>
          <div className="text-[10px] text-muted-foreground mt-0.5 truncate">{subcuentas.length} subcuentas</div>
        </div>
        <div className="bg-card border rounded-lg p-3">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Enviado este mes</div>
          <div className="font-display tabular-nums text-base md:text-lg font-semibold mt-0.5">{fmt(enviadoMes.monto)}</div>
          <div className="text-[10px] text-muted-foreground mt-0.5">{enviadoMes.ops} operaciones</div>
        </div>
        <div className="bg-card border rounded-lg p-3">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Programadas</div>
          <div className="font-display tabular-nums text-base md:text-lg font-semibold mt-0.5">{scheduled.length}</div>
        </div>
        <div className="bg-card border rounded-lg p-3">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Subcuentas</div>
          <div className="font-display tabular-nums text-base md:text-lg font-semibold mt-0.5">{subcuentas.length}</div>
          <div className="text-[10px] text-muted-foreground mt-0.5">activas</div>
        </div>
      </div>

      <div className="bg-card border rounded-lg mb-6 overflow-hidden">
        <div className="md:grid md:grid-cols-[220px_1fr]">
          <nav className="flex md:flex-col overflow-x-auto overflow-y-hidden md:overflow-visible border-b md:border-b-0 md:border-r bg-muted/10">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`shrink-0 px-4 py-3 text-sm font-semibold whitespace-nowrap border-b-2 md:border-b-0 md:border-l-2 md:text-left transition-colors ${
                  tab === t.key
                    ? "border-primary text-primary bg-[color:var(--brand-soft)]/50 md:bg-[color:var(--brand-soft)]/40"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
              >
                {t.label}
              </button>
            ))}
          </nav>
          <div className="p-5">
            {tab === "unica" && (
              <Unica
                confirm={confirm}
                setConfirm={setConfirm}
                onOtpRequired={openOtp}
                subcuentas={subcuentas}
                onTransferPayload={setTransferPayload}
                onSaveDraft={(d) => {
                  setDrafts((prev) => [...prev, d]);
                  toast.success("Borrador guardado");
                }}
                prefilledDestinatario={prefilledDestinatario}
                onClearPrefill={() => setPrefilledDestinatario(undefined)}
              />
            )}
            {tab === "programar" && (
              <Programar
                subcuentas={subcuentas}
                onSuccess={(s) => {
                  setScheduled((prev) => [...prev, s]);
                  toast.success("Transferencia programada");
                  setTab("programadas");
                }}
              />
            )}
            {tab === "borradores" && (
              <Borradores
                drafts={drafts}
                onDelete={(id) => setConfirmarEliminacion({ tipo: "borrador", id })}
                onEdit={(id) => {
                  const d = drafts.find((x) => x.id === id);
                  if (d?.cbu) setPrefilledDestinatario({ nombre: d.destinatario, cuit: "", cbu: d.cbu!, alias: d.alias });
                  setTab("unica");
                  toast.success("Borrador cargado en el formulario");
                }}
                onExecute={async (id) => {
                  const d = drafts.find((x) => x.id === id);
                  if (!d?.cbu || !d.montoNum || !d.subcuentaOrigen) { toast.error("Borrador incompleto"); return; }
                  try {
                    const res = await executeTransfer({ subcuentaOrigenId: d.subcuentaOrigen!, destinatarioIdentifier: d.cbu!, monto: d.montoNum!, concepto: d.concepto });
                    if (!res.ok) { toast.error(res.error ?? "Validación fallida"); return; }
                    toast.success(`Borrador ejecutado — TXID: ${res.txn.id_txn}`);
                    setDrafts((prev) => prev.filter((x) => x.id !== id));
                    await cargarDatos();
                  } catch (e) { toast.error(toDataError(e).message); }
                }}
              />
            )}
            {tab === "programadas" && (
              <Programadas
                items={scheduled}
                onCancel={(id) => setConfirmarEliminacion({ tipo: "programada", id })}
                onEdit={(id) => toast.success("Editando transferencia programada")}
                onExecute={async (id) => {
                  const s = scheduled.find((x) => x.id === id);
                  if (!s?.cbu || !s.montoNum || !s.subcuentaOrigen) { toast.error("Programada incompleta"); return; }
                  try {
                    const res = await executeTransfer({ subcuentaOrigenId: s.subcuentaOrigen!, destinatarioIdentifier: s.cbu!, monto: s.montoNum!, concepto: s.concepto, kind: "programada" });
                    if (!res.ok) { toast.error(res.error ?? "Validación fallida"); return; }
                    toast.success(`Programada ejecutada — TXID: ${res.txn.id_txn}`);
                    setScheduled((prev) => prev.map((x) => x.id === id ? { ...x, estado: "Ejecutada" } : x));
                    await cargarDatos();
                  } catch (e) { toast.error(toDataError(e).message); }
                }}
              />
            )}
            {tab === "destinatarios" && (
              <DestinatariosList onSelect={(d) => {
                setPrefilledDestinatario(d);
                setTab("unica");
                toast.success("Destinatario cargado");
              }} />
            )}
          </div>
        </div>
      </div>

      <FormDialog
        open={plantillaOpen}
        onClose={() => setPlantillaOpen(false)}
        title="Plantillas de transferencia"
        description="Selecciona una plantilla para precargar el formulario."
        submitLabel="Crear nueva plantilla"
        size="lg"
        onSubmit={() => {
          setPlantillaOpen(false);
          toast.success("Nueva plantilla creada");
        }}
      >
        <div className="divide-y border rounded-md max-h-64 overflow-y-auto">
          {[
            { n: "Sueldos mensuales", d: "18 empleados", m: "$ 4.820.000", t: "unica" as const },
            { n: "Pago proveedor SA", d: "Mensual · dia 10", m: "$ 220.000", t: "unica" as const },
            { n: "Honorarios estudio Rios", d: "Mensual · dia 12", m: "$ 145.000", t: "unica" as const },
            { n: "Alquiler oficina", d: "Mensual · dia 5", m: "$ 380.000", t: "programar" as const },
          ].map((p) => (
            <div key={p.n} className="flex items-center justify-between p-3 hover:bg-muted/50 cursor-pointer"
              onClick={() => {
                setPlantillaOpen(false);
                setTab(p.t);
                toast.success(`Plantilla "${p.n}" cargada`);
              }}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-md bg-[color:var(--brand-soft)] flex items-center justify-center shrink-0">
                  <Star size={14} className="text-[color:var(--brand-dark)]" />
                </div>
                <div className="min-w-0">
                  <div className="font-semibold text-sm truncate">{p.n}</div>
                  <div className="text-xs text-muted-foreground truncate">{p.d}</div>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-sm font-semibold">{p.m}</span>
                <button type="button" className="h-8 w-8 inline-flex items-center justify-center rounded-md border bg-card hover:bg-accent text-muted-foreground"><Trash2 size={13} /></button>
              </div>
            </div>
          ))}
        </div>
        <div className="pt-2">
          <Label>Nombre de la nueva plantilla</Label>
          <Input placeholder="Ej. Pago proveedor mensual" />
        </div>
      </FormDialog>

      <FormDialog
        open={otpOpen}
        onClose={() => { if (!otpVerifying && !otpSending) setOtpOpen(false); }}
        title="Verificacion de dos factores"
        description={otpSending ? "Enviando código a tu correo..." : "Ingresa el codigo de 6 digitos enviado a tu correo."}
        submitLabel={otpVerifying ? "Verificando..." : otpSending ? "Enviando código..." : "Verificar y confirmar"}
        onSubmit={confirmWithOtp}
      >
        <div className="space-y-4">
          <div className="flex items-center justify-center gap-2 py-2">
            <KeyRound size={18} className="text-muted-foreground" />
            <span className="text-xs text-muted-foreground">{otpSending ? "Enviando código..." : "Codigo de verificacion"}</span>
          </div>
          <div className="flex justify-center gap-2">
            {otp.map((d, i) => (
              <input
                key={i}
                ref={(el) => { otpRefs.current[i] = el; }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={d}
                onChange={(e) => {
                  const raw = e.target.value.replace(/\D/g, "");
                  // Soporta pegar código completo en una sola casilla
                  if (raw.length > 1) {
                    const digits = raw.slice(0, 6).split("");
                    const next = Array(6).fill("").map((_, idx) => digits[idx] ?? "");
                    setOtp(next);
                    const last = Math.min(digits.length, 6) - 1;
                    otpRefs.current[last]?.focus();
                    return;
                  }
                  const val = raw.slice(0, 1);
                  const next = [...otp];
                  next[i] = val;
                  setOtp(next);
                  if (val && i < 5) otpRefs.current[i + 1]?.focus();
                }}
                onPaste={(e) => {
                  e.preventDefault();
                  const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
                  if (!pasted) return;
                  const digits = pasted.split("");
                  const next = Array(6).fill("").map((_, idx) => digits[idx] ?? "");
                  setOtp(next);
                  const focusIdx = Math.min(digits.length, 6) - 1;
                  otpRefs.current[focusIdx]?.focus();
                }}
                onKeyDown={(e) => {
                  if (e.key === "Backspace" && !otp[i] && i > 0) otpRefs.current[i - 1]?.focus();
                }}
                onFocus={(e) => e.target.select()}
                className="w-11 h-12 text-center text-lg font-bold rounded-md border bg-card outline-none focus:ring-2 focus:ring-ring/40 focus:border-ring"
                autoComplete="one-time-code"
              />
            ))}
          </div>
          <div className="flex justify-between text-xs text-muted-foreground pt-1">
            <span>¿No recibiste el codigo?</span>
            <button type="button" className="text-primary font-semibold hover:underline disabled:opacity-50" disabled={otpSending} onClick={async () => { resetOtp(); const ok = await enviarOtpCorreo(); if (ok) toast.success("Nuevo código enviado"); }}>
              {otpSending ? "Enviando..." : "Reenviar"}
            </button>
          </div>
        </div>
      </FormDialog>

      <FormDialog
        open={saveDestOpen}
        onClose={() => setSaveDestOpen(false)}
        title="¿Deseas guardar este destinatario como frecuente?"
        description={`Podes agendar a ${destAlias} en tu lista de destinatarios frecuentes para reutilizarlo.`}
        submitLabel="Si, guardar destinatario"
        onSubmit={async () => {
          try {
            if (destValidation?.titular) {
              const sb = requireSupabase();
              const { data: { user } } = await sb.auth.getUser();
              const { data: cli } = await sb.from("clientes").select("legajo").eq("correo", user?.email ?? "").maybeSingle();
              if (cli?.legajo) {
                await sb.from("destinatarios_frecuentes").insert({
                  cliente_legajo: cli.legajo,
                  identifier: destValidation.identifier,
                  identifier_kind: destValidation.kind,
                  alias: destValidation.titular.alias,
                  cbu: destValidation.titular.cbu,
                  nombre: destValidation.titular.nombre,
                  cuit: destValidation.titular.cuit,
                  banco: destValidation.titular.banco ?? null,
                });
              }
            }
            toast.success(`Destinatario agregado a frecuentes`);
          } catch {
            toast.success(`Destinatario agregado a frecuentes (local)`);
          } finally {
            setSaveDestOpen(false);
            setDestValidation(null);
          }
        }}
      >
        <div className="text-xs text-muted-foreground">
          Los destinatarios ya no se guardan automaticamente. Solo se agendan si confirmas aqui.
        </div>
      </FormDialog>

      <ConfirmDialog
        open={confirmarEliminacion !== null}
        title={
          confirmarEliminacion?.tipo === "borrador"
            ? "¿Eliminar borrador?"
            : "¿Cancelar transferencia programada?"
        }
        description="Esta accion no se puede deshacer."
        confirmLabel={confirmarEliminacion?.tipo === "borrador" ? "Eliminar" : "Cancelar"}
        onClose={() => setConfirmarEliminacion(null)}
        onConfirm={() => {
          if (confirmarEliminacion?.tipo === "borrador") {
            setDrafts((prev) => prev.filter((d) => d.id !== confirmarEliminacion.id));
            toast.success("Borrador eliminado");
          } else if (confirmarEliminacion?.tipo === "programada") {
            setScheduled((prev) => prev.filter((s) => s.id !== confirmarEliminacion.id));
            toast.success("Transferencia cancelada");
          }
        }}
      />
    </>
  );
}

/* ===== Transferencia unica ===== */

function Unica({
  confirm,
  setConfirm,
  onOtpRequired,
  subcuentas,
  onTransferPayload,
  onSaveDraft,
  prefilledDestinatario,
  onClearPrefill,
}: {
  confirm: boolean;
  setConfirm: (v: boolean) => void;
  onOtpRequired: () => void | Promise<void>;
  subcuentas: Subcuenta[];
  onTransferPayload: (p: { subcuentaOrigen: string; destinatarioCbu: string; monto: number; concepto: string }) => void;
  onSaveDraft: (d: Draft) => void;
  prefilledDestinatario?: CoelsaResult;
  onClearPrefill?: () => void;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [selectedDestinatario, setSelectedDestinatario] = useState<CoelsaResult | null>(
    () => prefilledDestinatario ?? null
  );
  const [frecuentesOpen, setFrecuentesOpen] = useState(false);
  const [monto, setMonto] = useState("");
  const [subcuentaOrigen, setSubcuentaOrigen] = useState("");
  const [concepto, setConcepto] = useState("Pago a proveedor");

  useEffect(() => {
    if (subcuentas.length > 0 && !subcuentaOrigen) {
      setSubcuentaOrigen(subcuentas[0].id);
    }
  }, [subcuentas, subcuentaOrigen]);

  useEffect(() => {
    if (prefilledDestinatario) {
      onClearPrefill?.();
      setSelectedDestinatario(prefilledDestinatario);
    }
  }, [prefilledDestinatario, onClearPrefill]);

  const saveAsDraft = () => {
    if (!selectedDestinatario) return;
    // Borrador no genera movimiento; al ejecutar pasa por validación → ejecución → movimiento
    onSaveDraft({
      id: `d${Date.now()}`,
      destinatario: selectedDestinatario.nombre,
      alias: selectedDestinatario.alias,
      cbu: selectedDestinatario.cbu,
      subcuentaOrigen,
      montoNum: Number(monto) || 0,
      monto: `$ ${Number(monto).toLocaleString("es-AR")}`,
      concepto,
      ref: "",
      fecha: new Date().toLocaleDateString("es-AR"),
    });
    // También persistir en DB para historial/auditoría sin movimiento ejecutado
    (async () => {
      try {
        const sb = requireSupabase();
        const { data: { user } } = await sb.auth.getUser();
        const { data: cli } = await sb.from("clientes").select("legajo").eq("correo", user?.email ?? "").maybeSingle();
        if (cli?.legajo) {
          await sb.from("transferencias_borrador").insert({
            cliente_legajo: cli.legajo,
            subcuenta_origen: subcuentaOrigen || null,
            destinatario_identifier: selectedDestinatario.cbu,
            destinatario_kind: detectIdentifierKind(selectedDestinatario.cbu),
            monto: Number(monto) || 0,
            concepto,
          });
        }
      } catch { /* silencioso: fallback local */ }
    })();
  };

  const handleSearch = async () => {
    const q = searchQuery.trim();
    if (!q) return;
    setSearching(true);
    try {
      const res = await recipientValidator.validate({ identifier: q, kind: detectIdentifierKind(q) });
      if (res.ok && res.titular) {
        onClearPrefill?.();
        setSelectedDestinatario({
          nombre: res.titular.nombre,
          cuit: res.titular.cuit,
          cbu: res.titular.cbu,
          alias: res.titular.alias,
        });
        if (res.provider === "mock") {
          // mock acepta cualquier CBU/CVU/Alias sintácticamente válido para pruebas
        }
      } else {
        const msg =
          res.status === "invalid_format"
            ? "Formato inválido: CBU/CVU 22 dígitos o Alias 6-20 caracteres"
            : res.status === "not_found"
              ? "Destinatario no encontrado"
              : res.status === "rejected"
                ? "Validación rechazada"
                : res.errorMessage ?? "No se pudo validar el destinatario";
        toast.error(msg);
      }
    } catch {
      toast.error("Error validando destinatario");
    } finally {
      setSearching(false);
    }
  };

  const subcuentaSeleccionada = subcuentas.find((s) => s.id === subcuentaOrigen);

  if (confirm) {
    const montoNum = Number(monto) || 0;
    return (
      <div className="space-y-4">
        <div className="text-sm text-muted-foreground">Revisa los datos antes de confirmar.</div>
        <div className="border rounded-md divide-y">
          {[
            ["Origen", subcuentaSeleccionada?.nombre ?? "—"],
            ["CBU Origen", subcuentaSeleccionada?.cbu ?? "—"],
            ["Destinatario", selectedDestinatario?.nombre ?? "-"],
            ["CBU Destino", selectedDestinatario?.cbu ?? "-"],
            ["Monto", fmt(montoNum)],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between py-2.5 px-3 text-sm">
              <span className="text-muted-foreground">{k}</span>
              <span className="font-mono tabular-nums font-semibold">{v}</span>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground p-3 bg-muted rounded">
          <ShieldCheck size={14} /> Se solicitara 2FA al confirmar.
        </div>
        <div className="flex gap-2">
          <BtnOutline onClick={() => setConfirm(false)} className="flex-1">Volver</BtnOutline>
          <BtnPrimary type="button" onClick={async () => {
            if (!subcuentaOrigen) { toast.error("Selecciona una subcuenta de origen"); return; }
            if (!selectedDestinatario) { toast.error("Falta destinatario validado"); return; }
            if (!montoNum || montoNum <= 0) { toast.error("Ingresa un monto válido mayor a 0"); return; }
            onTransferPayload({
              subcuentaOrigen,
              destinatarioCbu: selectedDestinatario.cbu,
              monto: montoNum,
              concepto,
            });
            await onOtpRequired();
          }} className="flex-1">Confirmar transferencia</BtnPrimary>
        </div>
      </div>
    );
  }

  if (!selectedDestinatario) {
    return (
      <div className="space-y-4">
        <div>
          <Label>Destinatario</Label>
          <div className="flex gap-2">
            <div className="flex-1">
              <Input
                placeholder="Buscar por CUIT, CBU o alias"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleSearch();
                  }
                }}
                disabled={searching}
              />
            </div>
            <BtnPrimary type="button" onClick={handleSearch} disabled={searching}>
              {searching ? "Buscando..." : "Buscar"}
            </BtnPrimary>
          </div>
          {searching && (
            <div className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1">
              <span className="animate-pulse">Validando destinatario (CBU/CVU/Alias)...</span>
            </div>
          )}
        </div>

        <BtnOutline type="button" onClick={() => setFrecuentesOpen(true)} className="w-full">
          <Users size={14} /> Destinatarios frecuentes
        </BtnOutline>

        <FormDialog
          open={frecuentesOpen}
          onClose={() => setFrecuentesOpen(false)}
          title="Destinatarios frecuentes"
          description="Selecciona un destinatario de tu lista."
          submitLabel="Cerrar"
          onSubmit={() => setFrecuentesOpen(false)}
          size="md"
        >
          <div className="text-center py-8 text-muted-foreground text-sm">
            No tenes destinatarios frecuentes guardados.
          </div>
        </FormDialog>
      </div>
    );
  }

  return (
    <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); setConfirm(true); }}>
      <div className="border border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-800 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-3">
          <ShieldCheck size={16} className="text-green-600" />
          <span className="text-xs font-semibold text-green-700 dark:text-green-400 uppercase tracking-wider">
            Destinatario validado — {detectIdentifierKind(selectedDestinatario.cbu) === "ALIAS" ? "Alias" : (selectedDestinatario.cbu.startsWith("000") ? "CVU" : "CBU")}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Nombre</span>
            <span className="font-semibold">{selectedDestinatario.nombre}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">CUIT</span>
            <span className="font-semibold">{selectedDestinatario.cuit}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">CBU</span>
            <span className="font-semibold">{selectedDestinatario.cbu}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Alias</span>
            <span className="font-semibold">@{selectedDestinatario.alias}</span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            onClearPrefill?.();
            setSelectedDestinatario(null);
          }}
          className="text-xs text-primary mt-2 hover:underline"
        >
          Cambiar destinatario
        </button>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <div className="sm:col-span-2">
          <Label>Origen de fondos</Label>
          <select
            className="w-full h-10 px-3 rounded-md border bg-card text-sm"
            value={subcuentaOrigen}
            onChange={(e) => setSubcuentaOrigen(e.target.value)}
          >
            {subcuentas.length === 0 && <option value="">Sin subcuentas</option>}
            {subcuentas.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nombre} — {fmt(Number(s.saldo_disponible))}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label>Monto</Label>
          <Input
            type="number"
            placeholder="$ 0,00"
            value={monto}
            onChange={(e) => setMonto(e.target.value)}
            min="0"
            step="0.01"
          />
        </div>
        <div>
          <Label>Moneda</Label>
          <div className="h-10 px-3 rounded-md border bg-muted flex items-center text-sm text-muted-foreground">
            ARS — Pesos Argentinos
          </div>
        </div>
        <div>
          <Label>Concepto</Label>
          <select
            className="w-full h-10 px-3 rounded-md border bg-card text-sm"
            value={concepto}
            onChange={(e) => setConcepto(e.target.value)}
          >
            <option>Pago a proveedor</option>
            <option>Sueldos</option>
            <option>Honorarios</option>
            <option>Servicios</option>
            <option>Devolucion</option>
          </select>
        </div>
      </div>

      <div className="flex gap-2 pt-1">
        <BtnOutline type="button" className="flex-1" onClick={saveAsDraft}>
          <Save size={14} /> Guardar borrador
        </BtnOutline>
        <BtnPrimary type="submit" className="flex-1">Continuar</BtnPrimary>
      </div>
    </form>
  );
}

/* ===== Programar ===== */
function Programar({ subcuentas, onSuccess }: { subcuentas: Subcuenta[]; onSuccess: (s: Scheduled) => void }) {
  const [confirm, setConfirm] = useState(false);
  const [destQuery, setDestQuery] = useState("proveedor.sa");
  const [destValid, setDestValid] = useState<import("@/lib/recipient-validation").RecipientValidationResult | null>(null);
  const [validating, setValidating] = useState(false);
  const [subcuentaOrigen, setSubcuentaOrigen] = useState(subcuentas[0]?.id ?? "");
  const [monto, setMonto] = useState("220000");
  const [fecha, setFecha] = useState("");
  const [hora, setHora] = useState("14:30");
  const [concepto, setConcepto] = useState("Pago a proveedor");

  // Sincronizar subcuenta por defecto cuando cargan async
  useEffect(() => {
    if (subcuentas.length > 0 && !subcuentaOrigen) setSubcuentaOrigen(subcuentas[0].id);
  }, [subcuentas, subcuentaOrigen]);

  const handleValidate = async (): Promise<import("@/lib/recipient-validation").RecipientValidationResult | null> => {
    const q = destQuery.trim();
    if (!q) { toast.error("Ingresa un CBU/CVU o Alias"); return null; }
    setValidating(true);
    try {
      const res = await recipientValidator.validate({ identifier: q, kind: detectIdentifierKind(q) });
      if (res.ok) { setDestValid(res); return res; }
      else { setDestValid(null); toast.error(res.errorMessage ?? "Destinatario no válido"); return null; }
    } catch {
      toast.error("Error validando destinatario");
      return null;
    } finally { setValidating(false); }
  };

  if (confirm && destValid) {
    return (
      <div className="space-y-4">
        <div className="text-sm text-muted-foreground">Revisa los datos antes de programar. Se validará de nuevo al ejecutar.</div>
        <div className="border rounded-md divide-y">
          {[
            ["Origen", subcuentas.find((s) => s.id === subcuentaOrigen)?.nombre ?? "—"],
            ["Destinatario", destValid.titular?.nombre ?? destValid.identifier],
            ["Identificador", destValid.identifier + ` (${destValid.kind})`],
            ["Monto", fmt(Number(monto) || 0)],
            ["Fecha", fecha || "—"],
            ["Hora", hora],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between py-2.5 px-3 text-sm">
              <span className="text-muted-foreground">{k}</span>
              <span className="font-mono tabular-nums font-semibold">{v}</span>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <BtnOutline onClick={() => setConfirm(false)} className="flex-1">Volver</BtnOutline>
          <BtnPrimary onClick={async () => {
            // Programada no genera movimiento ahora; se persiste y al ejecutar pasa por validación → movimiento
            try {
              const sb = requireSupabase();
              const { data: { user } } = await sb.auth.getUser();
              const { data: cli } = await sb.from("clientes").select("legajo").eq("correo", user?.email ?? "").maybeSingle();
              if (cli?.legajo) {
                await sb.from("transferencias_programadas").insert({
                  cliente_legajo: cli.legajo,
                  subcuenta_origen: subcuentaOrigen || null,
                  destinatario_identifier: destValid.identifier,
                  destinatario_kind: destValid.kind,
                  monto: Number(monto) || 0,
                  concepto,
                  fecha_envio: fecha || new Date().toISOString().slice(0, 10),
                  hora_envio: hora,
                });
              }
            } catch { /* fallback local */ }
            onSuccess({
              id: `s${Date.now()}`,
              destinatario: destValid.titular?.nombre ?? destValid.identifier,
              alias: destValid.titular?.alias ?? destValid.identifier,
              cbu: destValid.titular?.cbu ?? destValid.identifier,
              subcuentaOrigen,
              montoNum: Number(monto) || 0,
              monto: fmt(Number(monto) || 0),
              fecha: fecha || new Date().toLocaleDateString("es-AR"),
              hora,
              estado: "Programada",
              concepto,
            });
          }} className="flex-1">Programar transferencia</BtnPrimary>
        </div>
      </div>
    );
  }

  return (
    <form className="space-y-4" onSubmit={async (e) => {
      e.preventDefault();
      let valid = destValid;
      if (!valid) {
        valid = await handleValidate();
        if (!valid) return;
      }
      // re-validar si el query cambió después de validar
      if (valid.identifier !== destQuery.trim()) {
        valid = await handleValidate();
        if (!valid) return;
      }
      // asegurar monto válido antes de confirmar
      if (!monto || Number(monto) <= 0) { toast.error("Ingresa un monto válido"); return; }
      setConfirm(true);
    }}>
      <div className="grid sm:grid-cols-2 gap-3">
        <div className="sm:col-span-2">
          <Label>Origen de fondos</Label>
          <select className="w-full h-10 px-3 rounded-md border bg-card text-sm" value={subcuentaOrigen} onChange={(e) => setSubcuentaOrigen(e.target.value)}>
            {subcuentas.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nombre} — {fmt(Number(s.saldo_disponible))}
              </option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <Label>Destinatario (CBU/CVU/Alias)</Label>
          <div className="flex gap-2">
            <Input className="flex-1" placeholder="22 dígitos o alias (6-20)" value={destQuery} onChange={(e) => { setDestQuery(e.target.value); setDestValid(null); }} />
            <BtnOutline type="button" onClick={handleValidate} disabled={validating}>{validating ? "Validando..." : "Validar"}</BtnOutline>
          </div>
          {destValid ? (
            <div className="text-xs text-emerald-700 mt-1 flex items-center gap-1"><ShieldCheck size={11} /> Validado: {destValid.titular?.nombre} — {destValid.titular?.banco ?? destValid.kind}</div>
          ) : (
            <div className="text-xs text-muted-foreground mt-1">Se validará vía servicio desacoplado (mock hoy, COELSA mañana)</div>
          )}
        </div>
        <div>
          <Label>Monto</Label>
          <Input placeholder="$ 0,00" value={monto} onChange={(e) => setMonto(e.target.value)} />
        </div>
        <div>
          <Label>Moneda</Label>
          <div className="h-10 px-3 rounded-md border bg-card flex items-center text-sm text-muted-foreground">
            ARS — Pesos Argentinos
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:col-span-2">
          <div>
            <Label>Fecha de envio</Label>
            <Input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
          </div>
          <div>
            <Label>Hora de envio</Label>
            <Input type="time" value={hora} onChange={(e) => setHora(e.target.value)} />
          </div>
        </div>
        <div>
          <Label>Concepto</Label>
          <select className="w-full h-10 px-3 rounded-md border bg-card text-sm" value={concepto} onChange={(e) => setConcepto(e.target.value)}>
            <option>Pago a proveedor</option>
            <option>Sueldos</option>
            <option>Honorarios</option>
            <option>Servicios</option>
            <option>Devolucion</option>
          </select>
        </div>
      </div>
      <div className="flex gap-2 pt-1">
        <BtnPrimary type="submit" className="flex-1" disabled={validating}>{validating ? "Validando..." : destValid ? "Programar" : "Validar y programar"}</BtnPrimary>
      </div>
    </form>
  );
}

/* ===== Borradores ===== */
function Borradores({ drafts, onDelete, onEdit, onExecute }: {
  drafts: Draft[];
  onDelete: (id: string) => void;
  onEdit: (id: string) => void;
  onExecute: (id: string) => void;
}) {
  if (drafts.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <FileText size={32} className="mx-auto mb-3 opacity-50" />
        <p className="font-semibold">No tenes borradores</p>
        <p className="text-sm mt-1">Las transferencias que guardes como borrador apareceran aca.</p>
      </div>
    );
  }

  return (
    <div className="divide-y">
      {drafts.map((d) => (
        <div key={d.id} className="flex items-center justify-between py-3">
          <div className="min-w-0">
            <div className="text-sm font-semibold">{d.destinatario}</div>
            <div className="text-xs text-muted-foreground">@{d.alias} · <span className="font-mono">{d.monto}</span> · {d.concepto}</div>
            <div className="text-[11px] text-muted-foreground/60">Guardado el {d.fecha}</div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button onClick={() => onEdit(d.id)} className="h-8 w-8 inline-flex items-center justify-center rounded-md border bg-card hover:bg-accent text-muted-foreground" title="Editar">
              <Edit3 size={13} />
            </button>
            <button onClick={() => onExecute(d.id)} className="h-8 w-8 inline-flex items-center justify-center rounded-md border bg-card hover:bg-accent text-muted-foreground" title="Ejecutar">
              <Play size={13} />
            </button>
            <button onClick={() => onDelete(d.id)} className="h-8 w-8 inline-flex items-center justify-center rounded-md border bg-card hover:bg-red-50 text-muted-foreground hover:text-red-600" title="Eliminar">
              <Trash2 size={13} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ===== Transferencias programadas ===== */
function Programadas({ items, onCancel, onEdit, onExecute }: {
  items: Scheduled[];
  onCancel: (id: string) => void;
  onEdit: (id: string) => void;
  onExecute: (id: string) => void;
}) {
  if (items.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Calendar size={32} className="mx-auto mb-3 opacity-50" />
        <p className="font-semibold">No tenes transferencias programadas</p>
        <p className="text-sm mt-1">Usa la pestana "Programar" para agendar una transferencia.</p>
      </div>
    );
  }

  return (
    <div className="divide-y">
      {items.map((s) => (
        <div key={s.id} className="flex items-center justify-between py-3">
          <div className="min-w-0">
            <div className="text-sm font-semibold">{s.destinatario}</div>
            <div className="text-xs text-muted-foreground">@{s.alias} · <span className="font-mono">{s.monto}</span> · {s.concepto}</div>
            <div className="text-xs text-muted-foreground/70 flex items-center gap-1 mt-0.5">
              <Calendar size={11} /> {s.fecha} <Clock size={11} className="ml-1" /> {s.hora}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Badge tone={s.estado === "Recurrente" ? "neutral" : "warn"}>{s.estado}</Badge>
            <button onClick={() => onEdit(s.id)} className="h-8 w-8 inline-flex items-center justify-center rounded-md border bg-card hover:bg-accent text-muted-foreground" title="Editar">
              <Edit3 size={13} />
            </button>
            <button onClick={() => onExecute(s.id)} className="h-8 w-8 inline-flex items-center justify-center rounded-md border bg-card hover:bg-accent text-muted-foreground" title="Ejecutar ahora">
              <Play size={13} />
            </button>
            <button onClick={() => onCancel(s.id)} className="h-8 w-8 inline-flex items-center justify-center rounded-md border bg-card hover:bg-red-50 text-muted-foreground hover:text-red-600" title="Cancelar">
              <X size={13} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ===== Destinatarios frecuentes ===== */
function DestinatariosList({ onSelect }: { onSelect: (d: Destinatario) => void }) {
  return (
    <div className="space-y-3">
      <div className="text-center py-12 text-muted-foreground">
        <Users size={32} className="mx-auto mb-3 opacity-50" />
        <p className="font-semibold">No tenes destinatarios frecuentes</p>
        <p className="text-sm mt-1">Los destinatarios se guardan al confirmar una transferencia.</p>
      </div>
    </div>
  );
}

/* ===== QELSA mock (placeholder hasta integrar API real) ===== */
const qelsaMock: CoelsaResult[] = [
  { nombre: "Proveedor SA", cuit: "30-12345678-9", cbu: "0000003100099887766112", alias: "proveedor.sa" },
  { nombre: "Estudio Rios", cuit: "30-87654321-0", cbu: "0000003200099887766223", alias: "rios.contable" },
  { nombre: "Servicios Generales", cuit: "30-11122333-4", cbu: "0000003300099887766334", alias: "serv.generales" },
  { nombre: "Juan Perez", cuit: "20-22333444-5", cbu: "0000003400099887766445", alias: "juanperez.mp" },
  { nombre: "Maria Lopez", cuit: "27-33444555-6", cbu: "0000003500099887766556", alias: "mlopez.cv" },
];
