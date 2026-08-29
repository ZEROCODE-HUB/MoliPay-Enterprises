import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  Plus, Search, Filter, Building2, FileText, CheckCircle2, Clock,
  XCircle, AlertCircle, Upload, MessageSquare, ChevronRight, X,
  User, ShieldCheck, Eye, Download, Camera, Loader2, RefreshCw,
} from "lucide-react";
import {
  PageHeader, Card, BtnPrimary, BtnOutline, Badge, Input, Label, Stat,
} from "@/components/portal-shell";
import { toast } from "sonner";
import { requireSupabase } from "@/lib/supabase";

export const Route = createFileRoute("/admin/clientes")({ component: Page });

type EstadoOnb = "pendiente" | "aprobado" | "rechazado";

type DocReal = {
  tipo: string;
  rawTipo: string;
  label: string;
  url: string;
  signedUrl: string | null;
  kind: "image" | "pdf" | "file";
};

type RealCliente = {
  legajo: string;
  n: string;
  cuit: string;
  correo: string;
  tipoPersona: "fisica" | "juridica";
  estado: EstadoOnb;
  fecha: string;
  docs: DocReal[];
};

const TIPO_LABEL: Record<string, string> = {
  id_frente: "DNI Frente",
  id_dorso: "DNI Dorso",
  servicio: "Servicio",
  selfie: "Selfie",
};

const TIPO_BG: Record<string, string> = {
  id_frente: "linear-gradient(135deg,#1e3a8a,#3b82f6)",
  id_dorso: "linear-gradient(135deg,#1e3a8a,#60a5fa)",
  servicio: "linear-gradient(135deg,#7c2d12,#ea580c)",
  selfie: "linear-gradient(135deg,#475569,#94a3b8)",
};

const IMG_EXT = ["png", "jpg", "jpeg", "jpe", "jfif", "jif", "webp", "gif", "bmp", "heic", "avif", "tiff", "tif"];

function kindOf(label: string, url: string): DocReal["kind"] {
  const ext = (label || url).split(".").pop()?.toLowerCase() ?? "";
  if (IMG_EXT.includes(ext)) return "image";
  if (ext === "pdf") return "pdf";
  return "file";
}

function fmtFecha(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

const estados: Array<EstadoOnb | "Todos"> = ["Todos", "pendiente", "aprobado", "rechazado"];
const tono = (e: EstadoOnb): "success" | "warn" | "danger" | "neutral" =>
  e === "aprobado" ? "success" : e === "rechazado" ? "danger" : "warn";
const estadoLabel = (e: EstadoOnb) =>
  e === "pendiente" ? "En revision" : e === "aprobado" ? "Aprobado" : "Rechazado";

function Page() {
  const [clientes, setClientes] = useState<RealCliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detalle, setDetalle] = useState<RealCliente | null>(null);
  const [docPreview, setDocPreview] = useState<DocReal | null>(null);
  const [nuevo, setNuevo] = useState(false);
  const [filtro, setFiltro] = useState<EstadoOnb | "Todos">("Todos");
  const [page, setPage] = useState(1);
  const pageSize = 5;

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const sb = requireSupabase();
      const [cRes, dRes] = await Promise.all([
        sb.from("clientes").select("legajo, nombre, correo, cuit, tipo_persona, estado_onboarding, fecha_alta, created_at"),
        sb.from("documentos").select("cliente_legajo, tipo, url, label"),
      ]);
      if (cRes.error) throw cRes.error;

      const list: RealCliente[] = await Promise.all(
        (cRes.data ?? []).map(async (c: any) => {
          const cDocs = (dRes.data ?? []).filter((d: any) => d.cliente_legajo === c.legajo);
          const docs: DocReal[] = await Promise.all(
            cDocs.map(async (d: any) => {
              let signedUrl: string | null = null;
              try {
                const { data: s } = await sb.storage.from("kyc").createSignedUrl(d.url, 3600);
                signedUrl = s?.signedUrl ?? null;
              } catch {
                signedUrl = null;
              }
              return {
                tipo: TIPO_LABEL[d.tipo] ?? d.tipo,
                rawTipo: d.tipo,
                label: d.label ?? d.url,
                url: d.url,
                signedUrl,
                kind: kindOf(d.label ?? d.url, d.url),
              };
            }),
          );
          return {
            legajo: c.legajo,
            n: c.nombre,
            cuit: c.cuit,
            correo: c.correo,
            tipoPersona: c.tipo_persona,
            estado: c.estado_onboarding,
            fecha: c.fecha_alta ?? c.created_at,
            docs,
          };
        }),
      );
      setClientes(list);
    } catch (e: any) {
      setError(e?.message ?? "No se pudo cargar los clientes");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const filtrados = filtro === "Todos" ? clientes : clientes.filter((c) => c.estado === filtro);
  const totalPages = Math.max(1, Math.ceil(filtrados.length / pageSize));
  const paginated = filtrados.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => { setPage(1); }, [filtro]);

  return (
    <>
      <PageHeader
        title="Clientes"
        description="Onboarding y gestion de clientes operando en Molly."
        action={<BtnPrimary onClick={() => setNuevo(true)}><Plus size={16} /> Nuevo cliente</BtnPrimary>}
      />

      <div className="grid md:grid-cols-4 gap-4 mb-6">
        <Stat label="Clientes" value={String(clientes.length)} sub="En la base de datos" />
        <Stat label="Legajos en revision" value={String(clientes.filter((c) => c.estado === "pendiente").length)} sub="Pendientes de aprobacion" />
        <Stat label="Aprobados" value={String(clientes.filter((c) => c.estado === "aprobado").length)} />
        <Stat label="Rechazados" value={String(clientes.filter((c) => c.estado === "rechazado").length)} />
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="p-4 border-b flex flex-wrap gap-2 items-center">
          <div className="relative flex-1 min-w-[260px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Buscar por razon social o CUIT..." className="pl-9" />
          </div>
          <select className="h-10 px-3 rounded-md border bg-card text-sm">
            <option>Segmento: todos</option>
            <option>Persona Fisica</option>
            <option>Persona Juridica</option>
          </select>
          <BtnOutline className="h-10" onClick={() => load()}><RefreshCw size={14} /> Refrescar</BtnOutline>
        </div>

        <div className="px-4 pt-3 flex flex-wrap gap-1.5">
          {estados.map((e) => (
            <button
              key={e}
              onClick={() => setFiltro(e)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition ${
                filtro === e
                  ? "bg-[color:var(--brand-soft)] text-[color:var(--brand-dark)] border-transparent"
                  : "bg-card hover:bg-muted"
              }`}
            >
              {e === "Todos" ? "Todos" : estadoLabel(e)}
            </button>
          ))}
        </div>

        <div className="overflow-x-auto -mx-0 mt-2">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[11px] uppercase tracking-wide text-muted-foreground border-b">
                <th className="text-left px-5 py-2.5">Razon social</th>
                <th className="text-left px-5 py-2.5">CUIT</th>
                <th className="text-left px-5 py-2.5">Tipo</th>
                <th className="text-left px-5 py-2.5">Correo</th>
                <th className="text-left px-5 py-2.5">Estado del legajo</th>
                <th className="text-left px-5 py-2.5">Alta</th>
                <th className="px-5 py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7}>
                  <div className="flex flex-col items-center text-center py-14 text-muted-foreground">
                    <Loader2 size={22} className="animate-spin mb-3" />
                    <div className="text-sm">Cargando clientes…</div>
                  </div>
                </td></tr>
              ) : error ? (
                <tr><td colSpan={7}><div className="p-6 text-sm text-red-600">{error}</div></td></tr>
              ) : filtrados.length === 0 ? (
                <tr><td colSpan={7}>
                  <div className="flex flex-col items-center text-center py-14">
                    <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-3">
                      <Building2 size={22} className="text-muted-foreground" />
                    </div>
                    <div className="font-semibold">No hay clientes con este estado</div>
                    <div className="text-sm text-muted-foreground mt-1">Proba con otro filtro o inicia un nuevo onboarding.</div>
                  </div>
                </td></tr>
              ) : paginated.map((c) => (
                <tr key={c.legajo} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="px-5 py-3 font-semibold">{c.n}</td>
                  <td className="px-5 py-3 text-xs text-muted-foreground font-mono">{c.cuit}</td>
                  <td className="px-5 py-3 text-xs">{c.tipoPersona === "juridica" ? "Persona Juridica" : "Persona Fisica"}</td>
                  <td className="px-5 py-3 text-xs text-muted-foreground">{c.correo}</td>
                  <td className="px-5 py-3"><Badge tone={tono(c.estado)}>{estadoLabel(c.estado)}</Badge></td>
                  <td className="px-5 py-3 text-xs text-muted-foreground">{fmtFecha(c.fecha)}</td>
                  <td className="px-5 py-3 text-right">
                    <BtnOutline className="h-8 px-3 text-xs" onClick={() => setDetalle(c)}>
                      Ver legajo <ChevronRight size={12} />
                    </BtnOutline>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {!loading && !error && filtrados.length > 0 && (
          <div className="px-5 py-3 border-t text-xs text-muted-foreground flex justify-between items-center">
            <span>{`${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, filtrados.length)} de ${filtrados.length}`}</span>
            <div className="flex gap-1">
              <BtnOutline className="h-8 px-3 text-xs" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Anterior</BtnOutline>
              <BtnOutline className="h-8 px-3 text-xs" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Siguiente</BtnOutline>
            </div>
          </div>
        )}
      </Card>

      {detalle && <DetalleDrawer cliente={detalle} onClose={() => setDetalle(null)} onPreview={setDocPreview} />}
      {nuevo && <NuevoClienteDrawer onClose={() => setNuevo(false)} />}

      {docPreview && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80" onClick={() => setDocPreview(null)} />
          <div className="relative max-w-3xl w-full">
            <div className="bg-card rounded-lg overflow-hidden shadow-2xl">
              <div className="border-b px-5 py-3 flex justify-between items-center">
                <div>
                  <div className="font-semibold">{docPreview.tipo}</div>
                  <div className="text-xs text-muted-foreground">{docPreview.label}</div>
                </div>
                <div className="flex gap-1">
                  {docPreview.signedUrl && (
                    <BtnOutline className="h-9 px-3 text-xs" onClick={() => window.open(docPreview.signedUrl!, "_blank")}>
                      <Download size={12} /> Descargar
                    </BtnOutline>
                  )}
                  <BtnOutline className="h-9 w-9 px-0" onClick={() => setDocPreview(null)}><X size={14} /></BtnOutline>
                </div>
              </div>
              <div className="h-[60vh] flex items-center justify-center bg-black/90 p-2">
                {docPreview.signedUrl ? (
                  docPreview.kind === "image" ? (
                    <img src={docPreview.signedUrl} alt={docPreview.label} className="max-h-full max-w-full object-contain" />
                  ) : docPreview.kind === "pdf" ? (
                    <iframe src={docPreview.signedUrl} title={docPreview.label} className="w-full h-full border-0" />
                  ) : (
                    <a href={docPreview.signedUrl} target="_blank" rel="noreferrer" className="text-white underline">Abrir archivo</a>
                  )
                ) : (
                  <p className="text-white/70 text-sm text-center px-6">
                    No se pudo generar la vista previa. Asegurate de haber iniciado sesion como administrador.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function DetalleDrawer({ cliente, onClose, onPreview }: { cliente: RealCliente; onClose: () => void; onPreview: (d: DocReal) => void }) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-2xl bg-background h-full overflow-y-auto shadow-xl">
        <div className="sticky top-0 bg-card border-b px-6 py-4 flex justify-between items-center z-10">
          <div>
            <div className="text-xs text-muted-foreground">Legajo de cliente</div>
            <div className="font-semibold text-lg">{cliente.n}</div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-md"><X size={18} /></button>
        </div>

        <div className="p-6 space-y-5">
          <div className="flex items-center gap-3">
            <Badge tone={tono(cliente.estado)}>{estadoLabel(cliente.estado)}</Badge>
            <span className="text-xs text-muted-foreground">Legajo {cliente.legajo} · Alta {fmtFecha(cliente.fecha)}</span>
          </div>

          <Card>
            <h4 className="font-semibold text-sm mb-3 flex items-center gap-2"><Building2 size={14} /> Datos del cliente</h4>
            <dl className="grid grid-cols-2 gap-y-2.5 text-sm">
              <dt className="text-muted-foreground text-xs">Razon social / nombre</dt><dd className="font-semibold">{cliente.n}</dd>
              <dt className="text-muted-foreground text-xs">CUIT</dt><dd className="font-mono text-xs">{cliente.cuit}</dd>
              <dt className="text-muted-foreground text-xs">Tipo</dt><dd>{cliente.tipoPersona === "juridica" ? "Persona Juridica" : "Persona Fisica"}</dd>
              <dt className="text-muted-foreground text-xs">Correo</dt><dd className="text-xs">{cliente.correo}</dd>
            </dl>
          </Card>

          <Card>
            <div className="flex justify-between items-center mb-3">
              <h4 className="font-semibold text-sm flex items-center gap-2"><FileText size={14} /> Documentacion</h4>
              <span className="text-[11px] text-muted-foreground">{cliente.docs.length} archivos</span>
            </div>
            {cliente.docs.length === 0 ? (
              <p className="text-xs text-muted-foreground">Este legajo no tiene documentos cargados.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {cliente.docs.map((d) => {
                  const Icon = d.rawTipo === "selfie" ? Camera : FileText;
                  return (
                    <button key={d.rawTipo + d.label} onClick={() => onPreview(d)} className="group rounded-md overflow-hidden border bg-card hover:border-primary text-left">
                      <div className="h-32 flex items-center justify-center relative bg-muted" style={d.kind === "image" && d.signedUrl ? undefined : { background: TIPO_BG[d.rawTipo] ?? "linear-gradient(135deg,#475569,#94a3b8)" }}>
                        {d.kind === "image" && d.signedUrl ? (
                          <img src={d.signedUrl} alt={d.label} className="h-full w-full object-cover" />
                        ) : (
                          <Icon size={42} className="text-white/90" />
                        )}
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                          <Eye size={20} className="text-white" />
                        </div>
                      </div>
                      <div className="px-3 py-2 text-xs">
                        <div className="font-semibold">{d.tipo}</div>
                        <div className="text-muted-foreground truncate">{d.label}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </Card>

          <Card>
            <h4 className="font-semibold text-sm mb-3 flex items-center gap-2"><MessageSquare size={14} /> Historial y comentarios internos</h4>
            <div className="space-y-3">
              <div className="border-l-2 border-primary/30 pl-3">
                <div className="text-sm">Legajo iniciado por el cliente.</div>
                <div className="text-xs text-muted-foreground mt-0.5">Sistema · {fmtFecha(cliente.fecha)}</div>
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <Input placeholder="Agregar comentario interno..." />
              <BtnPrimary>Publicar</BtnPrimary>
            </div>
          </Card>

          <div className="flex gap-2 sticky bottom-0 bg-background py-3 border-t">
            <BtnOutline className="flex-1" onClick={() => { onClose(); toast.error(`Legajo de ${cliente.n} rechazado`); }}>
              <XCircle size={14} /> Rechazar
            </BtnOutline>
            <BtnOutline className="flex-1" onClick={() => { onClose(); toast.success(`Legajo de ${cliente.n} aprobado`); }}>
              <AlertCircle size={14} /> Pedir documentacion
            </BtnOutline>
            <BtnPrimary className="flex-1" onClick={() => { onClose(); toast.success(`Legajo de ${cliente.n} aprobado`); }}>
              <ShieldCheck size={14} /> Aprobar legajo
            </BtnPrimary>
          </div>
        </div>
      </div>
    </div>
  );
}

function NuevoClienteDrawer({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-2xl bg-background h-full overflow-y-auto shadow-xl">
        <div className="sticky top-0 bg-card border-b px-6 py-4 flex justify-between items-center z-10">
          <div className="font-semibold text-lg">Nuevo cliente</div>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-md"><X size={18} /></button>
        </div>
        <form className="p-6 space-y-5">
          <Card>
            <h4 className="font-semibold text-sm mb-3">Datos de la persona juridica</h4>
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2"><Label>Razon social *</Label><Input placeholder="SA / SRL / SAS / Asociacion" /></div>
              <div><Label>CUIT *</Label><Input placeholder="30-XXXXXXXX-X" /></div>
              <div><Label>Segmento</Label>
                <select className="w-full h-10 px-3 rounded-md border bg-card text-sm">
                  <option>Consorcio</option><option>Alquileres</option>
                  <option>Microcredito</option><option>Empresa</option>
                  <option>Sector publico</option><option>Cooperativa</option>
                </select>
              </div>
              <div><Label>Actividad principal</Label><Input /></div>
              <div><Label>Inicio de actividades</Label><Input type="date" /></div>
              <div className="sm:col-span-2"><Label>Domicilio fiscal *</Label><Input /></div>
            </div>
          </Card>
          <Card>
            <h4 className="font-semibold text-sm mb-3">Representante legal</h4>
            <div className="grid sm:grid-cols-2 gap-3">
              <div><Label>Nombre completo *</Label><Input /></div>
              <div><Label>DNI *</Label><Input /></div>
              <div><Label>Cargo *</Label><Input placeholder="Presidente / Socio gerente" /></div>
              <div><Label>Email *</Label><Input type="email" /></div>
            </div>
          </Card>
          <Card>
            <h4 className="font-semibold text-sm mb-2">Documentacion inicial</h4>
            <p className="text-xs text-muted-foreground mb-3">Estatuto, acta de designacion, DNI de representantes. Podes subirlos luego.</p>
            <BtnOutline><Upload size={14} /> Adjuntar archivos</BtnOutline>
          </Card>
          <div className="flex gap-2 sticky bottom-0 bg-background py-3 border-t">
            <BtnOutline className="flex-1" onClick={onClose}>Cancelar</BtnOutline>
            <BtnPrimary className="flex-1">Crear legajo</BtnPrimary>
          </div>
        </form>
      </div>
    </div>
  );
}
