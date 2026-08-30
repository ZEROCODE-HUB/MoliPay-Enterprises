import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useCallback } from "react";
import { Plus, Send, Search, Upload, Star, MoreVertical, Tag } from "lucide-react";
import { PageHeader, Card, BtnPrimary, BtnOutline, Input, Badge, Stat, Label } from "@/components/portal-shell";
import { toast } from "sonner";
import { FormDialog } from "@/components/form-dialog";
import { requireSupabase, toDataError, isPermissionError } from "@/lib/supabase";

export const Route = createFileRoute("/app/destinatarios")({ component: Page });

type Destinatario = {
  n: string;
  a: string;
  cbu: string;
  b: string;
  cat: string;
  fav: boolean;
  ult: string;
  ops: number;
};

type Subcuenta = { id: string; nombre: string; cbu: string | null; saldo_disponible: number };

const fmt = (n: number) => `$ ${n.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const initialData: Destinatario[] = [
  { n: "Proveedor SA", a: "proveedor.sa", cbu: "0000003100099887766112", b: "Banco Galicia", cat: "Proveedor", fav: true, ult: "Hoy", ops: 42 },
  { n: "Estudio Contable Rios", a: "rios.contable", cbu: "0000003200099887766223", b: "Banco Nacion", cat: "Servicios", fav: true, ult: "Ayer", ops: 12 },
  { n: "Servicios Generales SRL", a: "serv.generales", cbu: "0000003300099887766334", b: "Santander", cat: "Proveedor", fav: false, ult: "30/05", ops: 28 },
  { n: "Juan Perez", a: "juanperez.mp", cbu: "0000003400099887766445", b: "Mercado Pago", cat: "Empleado", fav: false, ult: "29/05", ops: 6 },
  { n: "Distribuidora Norte", a: "dist.norte", cbu: "0000003600099887766667", b: "BBVA", cat: "Proveedor", fav: false, ult: "25/05", ops: 18 },
  { n: "Laura Mendez", a: "laura.mendez", cbu: "0000003500099887766556", b: "Brubank", cat: "Empleado", fav: false, ult: "20/05", ops: 4 },
];

const categorias = [
  { n: "Todos", c: 24, active: true },
  { n: "Proveedores", c: 12 },
  { n: "Empleados", c: 8 },
  { n: "Servicios", c: 3 },
  { n: "Favoritos", c: 5 },
];

function Page() {
  const [nuevoOpen, setNuevoOpen] = useState(false);
  const [transferir, setTransferir] = useState<Destinatario | null>(null);
  const [monto, setMonto] = useState("");
  const [concepto, setConcepto] = useState("");
  const [subcuentaOrigen, setSubcuentaOrigen] = useState("");
  const [sending, setSending] = useState(false);
  const [subcuentas, setSubcuentas] = useState<Subcuenta[]>([]);

  const cargarSubcuentas = useCallback(async () => {
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
        .select("id, nombre, cbu, saldo_disponible")
        .eq("cliente_legajo", cli.legajo)
        .order("nombre", { ascending: true });
      setSubcuentas(subs ?? []);
      if (subs && subs.length > 0) setSubcuentaOrigen(subs[0].id);
    } catch {
      // silently fail
    }
  }, []);

  useEffect(() => { cargarSubcuentas(); }, [cargarSubcuentas]);

  const handleTransferir = async () => {
    if (!transferir || !subcuentaOrigen || !monto) return;
    const montoNum = Number(monto);
    if (!montoNum || montoNum <= 0) {
      toast.error("Ingresa un monto valido");
      return;
    }
    setSending(true);
    try {
      const sb = requireSupabase();
      const { data, error } = await sb.rpc("registrar_transferencia_externa", {
        p_subcuenta_origen: subcuentaOrigen,
        p_destinatario_cbu: transferir.cbu.replace(/\s/g, ""),
        p_monto: montoNum,
        p_concepto: concepto || null,
      });
      if (error) throw error;
      const result = data as { ok: boolean; id_txn: string; comision: number; impuesto: number; total_debitado: number };
      toast.success(`Transferencia enviada — TXID: ${result.id_txn}`);
      setTransferir(null);
      setMonto("");
      setConcepto("");
      await cargarSubcuentas();
    } catch (e) {
      const err = toDataError(e);
      if (isPermissionError(e)) {
        toast.error("Sin permisos para realizar esta transferencia");
      } else {
        toast.error(err.message || "No se pudo enviar la transferencia");
      }
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Mis destinatarios"
        description="Agenda de contactos frecuentes con etiquetas y validacion CBU."
        action={
          <div className="flex gap-2">
            <BtnOutline><Upload size={14} /> Importar CSV</BtnOutline>
            <BtnPrimary onClick={() => setNuevoOpen(true)}><Plus size={16} /> Nuevo destinatario</BtnPrimary>
          </div>
        }
      />

      <div className="grid md:grid-cols-4 gap-4 mb-6">
        <Stat label="Total destinatarios" value={String(initialData.length)} />
        <Stat label="Favoritos" value={String(initialData.filter((d) => d.fav).length)} />
        <Stat label="Subcuentas" value={String(subcuentas.length)} />
        <Stat label="Disponible" value={fmt(subcuentas.reduce((s, x) => s + (Number(x.saldo_disponible) || 0), 0))} />
      </div>

      <div className="grid lg:grid-cols-[220px_1fr] gap-6">
        <Card className="h-fit">
          <div className="text-xs uppercase tracking-wide text-muted-foreground mb-3">Categorias</div>
          <div className="space-y-1">
            {categorias.map((c) => (
              <button
                key={c.n}
                className={`w-full flex justify-between px-3 py-2 rounded-md text-sm ${
                  c.active ? "bg-[color:var(--brand-soft)] text-[color:var(--brand-dark)] font-semibold" : "hover:bg-muted"
                }`}
              >
                <span className="flex items-center gap-2"><Tag size={12} /> {c.n}</span>
                <span className="text-xs text-muted-foreground">{c.c}</span>
              </button>
            ))}
          </div>
        </Card>

        <Card className="p-0 overflow-hidden">
          <div className="p-4 border-b flex flex-wrap gap-2 items-center">
            <div className="relative w-full sm:flex-1 sm:min-w-[240px]">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Buscar por nombre, alias o CBU..." className="pl-9" />
            </div>
            <select className="h-10 px-3 rounded-md border bg-card text-sm">
              <option>Ordenar: mas usados</option>
              <option>Alfabetico</option>
              <option>Recientes</option>
            </select>
          </div>

          <div className="hidden md:grid grid-cols-[auto_1.2fr_1fr_1.4fr_0.8fr_0.8fr_auto] gap-4 px-5 py-3 border-b text-xs uppercase tracking-wide text-muted-foreground">
            <div></div><div>Nombre</div><div>Alias</div><div>CBU</div><div>Categoria</div><div>Ops</div><div></div>
          </div>
          {initialData.map((d) => (
            <div key={d.n} className="md:grid md:grid-cols-[auto_1.2fr_1fr_1.4fr_0.8fr_0.8fr_auto] gap-4 px-5 py-4 border-b last:border-0 items-center">
              <Star size={14} className={d.fav ? "fill-amber-400 text-amber-400" : "text-muted-foreground"} />
              <div>
                <div className="font-semibold">{d.n}</div>
                <div className="text-xs text-muted-foreground md:hidden">@{d.a} · {d.b}</div>
              </div>
              <div className="text-sm text-muted-foreground hidden md:block">@{d.a}</div>
              <div className="text-sm font-mono text-muted-foreground hidden md:block">{d.cbu}</div>
              <div className="hidden md:block"><Badge tone="neutral">{d.cat}</Badge></div>
              <div className="text-sm text-muted-foreground hidden md:block">{d.ops} · {d.ult}</div>
              <div className="flex gap-1 mt-2 md:mt-0 justify-end">
                <BtnOutline className="h-9 px-3" onClick={() => { setTransferir(d); setMonto(""); setConcepto(""); }}>
                  <Send size={14} /> Transferir
                </BtnOutline>
                <button className="h-9 w-9 inline-flex items-center justify-center rounded-md border bg-card hover:bg-accent"><MoreVertical size={14} /></button>
              </div>
            </div>
          ))}
        </Card>
      </div>

      <FormDialog
        open={nuevoOpen}
        onClose={() => setNuevoOpen(false)}
        title="Nuevo destinatario"
        description="Agregalo a tu agenda para reutilizarlo en transferencias."
        submitLabel="Agregar destinatario"
        onSubmit={() => {
          setNuevoOpen(false);
          toast.success("Destinatario agregado a tu agenda");
        }}
      >
        <div>
          <Label>Nombre o razon social</Label>
          <Input placeholder="Ej. Proveedor SA" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Alias</Label>
            <Input placeholder="proveedor.sa" />
          </div>
          <div>
            <Label>Categoria</Label>
            <select className="w-full h-10 px-3 rounded-md border bg-card text-sm">
              <option>Proveedor</option>
              <option>Empleado</option>
              <option>Servicios</option>
              <option>Otro</option>
            </select>
          </div>
        </div>
        <div>
          <Label>CBU / CVU</Label>
          <Input placeholder="22 digitos" />
        </div>
        <div>
          <Label>CUIT/CUIL (opcional)</Label>
          <Input placeholder="XX-XXXXXXXX-X" />
        </div>
        <label className="flex items-center gap-2 text-xs">
          <input type="checkbox" /> Marcar como favorito
        </label>
      </FormDialog>

      <FormDialog
        open={!!transferir}
        onClose={() => setTransferir(null)}
        title={`Transferir a ${transferir?.n ?? ""}`}
        description="Confirma el monto y la subcuenta de origen para enviar la transferencia."
        submitLabel={sending ? "Enviando..." : "Enviar transferencia"}
        onSubmit={handleTransferir}
      >
        {transferir && (
          <div className="rounded-md border bg-muted/30 p-3 text-xs space-y-1">
            <div className="font-semibold text-sm text-foreground">{transferir.n}</div>
            <div className="text-muted-foreground">@{transferir.a} · {transferir.b}</div>
            <div className="font-mono text-muted-foreground">{transferir.cbu}</div>
          </div>
        )}
        <div>
          <Label>Subcuenta de origen</Label>
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
          <Label>Monto (ARS)</Label>
          <Input
            type="number"
            value={monto}
            onChange={(e) => setMonto(e.target.value)}
            placeholder="0,00"
            min="0"
            step="0.01"
          />
        </div>
        <div>
          <Label>Concepto</Label>
          <Input
            value={concepto}
            onChange={(e) => setConcepto(e.target.value)}
            placeholder="Pago factura, sueldo, etc."
          />
        </div>
      </FormDialog>
    </>
  );
}
