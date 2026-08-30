import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Plus, Copy, Share2, Edit3, ToggleLeft, RotateCcw, History, Search, Eye, Trash2, X } from "lucide-react";
import {
  Card,
  Input,
  Label,
  BtnPrimary,
  BtnOutline,
  Badge,
  PageHeader,
} from "@/components/portal-shell";
import { toast } from "sonner";
import { FormDialog } from "@/components/form-dialog";
import { ConfirmDialog } from "@/components/confirm-dialog";
import {
  paymentMethods,
  formatARS,
  type Product,
  type PaymentLink,
} from "@/data/links-pago";
import QRCode from "qrcode";
import { requireSupabase } from "@/lib/supabase";

export const Route = createFileRoute("/app/link-pago/productos")({ component: Page });

function Page() {
  const [legajo, setLegajo] = useState<string>("");
  const [products, setProducts] = useState<Product[]>([]);
  const [links, setLinks] = useState<PaymentLink[]>([]);
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [showLinkForm, setShowLinkForm] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [generatedLink, setGeneratedLink] = useState<PaymentLink | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [confirmarEliminarId, setConfirmarEliminarId] = useState<string | null>(null);
  const [confirmarEliminarLinkId, setConfirmarEliminarLinkId] = useState<string | null>(null);
  const [tab, setTab] = useState<"productos" | "links">("productos");
  const [detailLink, setDetailLink] = useState<PaymentLink | null>(null);

  const [linkPartial, setLinkPartial] = useState(false);
  const [linkMethods, setLinkMethods] = useState<string[]>(
    paymentMethods.filter((m) => m.enabled).map((m) => m.id),
  );
  const [linkExpires, setLinkExpires] = useState("");
  const [linkStatus, setLinkStatus] = useState<string>("Activo");
  const [linkRef, setLinkRef] = useState("");
  const [linkNotes, setLinkNotes] = useState("");

  const loadProductos = async (lg: string) => {
    const s = requireSupabase();
    const { data } = await s
      .from("productos")
      .select("*")
      .eq("cliente_legajo", lg)
      .order("created_at", { ascending: false });
    const rows: Product[] = (data ?? []).map((r: any) => ({
      id: r.id,
      name: r.nombre,
      qty: Number(r.cantidad ?? 1),
      price: Number(r.precio ?? 0),
      desc: r.descripcion ?? undefined,
    }));
    setProducts(rows);
  };

  const loadLinks = async (lg: string) => {
    const s = requireSupabase();
    const { data: lks } = await s
      .from("cliente_links_pago")
      .select("*")
      .eq("cliente_legajo", lg)
      .order("created_at", { ascending: false });
    const lk = lks ?? [];
    const ids = lk.map((x: any) => x.id);
    let det: any[] = [];
    if (ids.length) {
      const { data: d } = await s
        .from("cliente_links_pago_detalle")
        .select("*")
        .in("link_id", ids);
      det = d ?? [];
    }
    const byLink = new Map<string, any[]>();
    det.forEach((d) => {
      const arr = byLink.get(d.link_id) ?? [];
      arr.push(d);
      byLink.set(d.link_id, arr);
    });
    const rows: PaymentLink[] = lk.map((x: any) => {
      const dd = byLink.get(x.id) ?? [];
      const prods: Product[] = dd.map((d) => ({
        id: d.producto_id ?? d.id,
        name: d.producto_nombre,
        qty: Number(d.cantidad ?? 1),
        price: Number(d.precio_unitario ?? 0),
      }));
      return {
        id: x.id,
        url: x.url,
        products: prods,
        status: (x.estado ?? "Activo") as PaymentLink["status"],
        partialPayments: !!x.pagos_parciales,
        methods: Array.isArray(x.metodos_pago) ? x.metodos_pago : [],
        reference: x.referencia ?? undefined,
        notes: x.notas ?? undefined,
        createdAt: (x.created_at ?? "").slice(0, 10).split("-").reverse().join("/"),
        expiresAt: x.expira_en
          ? (x.expira_en as string).slice(0, 10).split("-").reverse().join("/")
          : undefined,
        views: Number(x.vistas ?? 0),
        payments: Number(x.pagos ?? 0),
      };
    });
    setLinks(rows);
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const s = requireSupabase();
        const { data: u } = await s.auth.getUser();
        const mail = u.user?.email;
        if (!mail) return;
        const { data: cli } = await s
          .from("clientes")
          .select("legajo")
          .eq("correo", mail)
          .maybeSingle();
        if (!cli) return;
        if (cancelled) return;
        setLegajo(cli.legajo);
        await loadProductos(cli.legajo);
        await loadLinks(cli.legajo);
      } catch {
        // silencioso
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const toggleMethod = (id: string) => {
    setLinkMethods((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const generateLink = async () => {
    const s = requireSupabase();
    const selProducts = products.filter((p) => selected.includes(p.id));
    if (selProducts.length === 0) {
      toast.error("Selecciona al menos un producto");
      return;
    }
    if (!legajo) {
      toast.error("Sesion no disponible");
      return;
    }
    const code = "LP-" + Math.random().toString(36).substring(2, 8).toUpperCase();
    const url = "https://pay.molly.com.ar/l/" + code;
    const monto = selProducts.reduce((a, p) => a + p.price * p.qty, 0);
    const insertLink = {
      cliente_legajo: legajo,
      comercio_nombre: selProducts.map((p) => p.name).join(", "),
      url,
      monto,
      estado: linkStatus,
      referencia: linkRef || null,
      notas: linkNotes || null,
      expira_en: linkExpires ? new Date(linkExpires + "T23:59:59").toISOString() : null,
      pagos_parciales: linkPartial,
      metodos_pago: linkMethods,
    };
    const { data: inserted, error } = await s
      .from("cliente_links_pago")
      .insert(insertLink)
      .select()
      .single();
    if (error || !inserted) {
      toast.error("No se pudo generar el link");
      return;
    }
    const detRows = selProducts.map((p) => ({
      link_id: inserted.id,
      producto_id: p.id,
      producto_nombre: p.name,
      cantidad: p.qty,
      precio_unitario: p.price,
    }));
    const { error: e2 } = await s.from("cliente_links_pago_detalle").insert(detRows);
    if (e2) toast.error("Link creado, pero fallo el detalle");
    const link: PaymentLink = {
      id: inserted.id,
      url,
      products: selProducts,
      status: linkStatus as PaymentLink["status"],
      partialPayments: linkPartial,
      methods: linkMethods,
      reference: linkRef || undefined,
      notes: linkNotes || undefined,
      createdAt: new Date().toLocaleDateString("es-AR"),
      expiresAt: linkExpires || undefined,
      views: 0,
      payments: 0,
    };
    setGeneratedLink(link);
    setLinks((prev) => [link, ...prev]);
    try {
      const qr = await QRCode.toDataURL(url, { width: 200, margin: 2 });
      setQrDataUrl(qr);
    } catch {
      setQrDataUrl("");
    }
    setShowLinkForm(false);
    setShowResult(true);
    setSelected([]);
    setLinkRef("");
    setLinkNotes("");
    setLinkExpires("");
    setLinkPartial(false);
    setLinkMethods(paymentMethods.filter((m) => m.enabled).map((m) => m.id));
    setLinkStatus("Activo");
    toast.success("Link de pago generado");
    await loadLinks(legajo);
  };

  const deleteLink = async (id: string) => {
    const s = requireSupabase();
    const { error } = await s.from("cliente_links_pago").delete().eq("id", id);
    if (error) {
      toast.error("No se pudo eliminar");
      return;
    }
    setLinks((prev) => prev.filter((l) => l.id !== id));
    toast.success("Link de pago eliminado");
  };

  const deleteProduct = async (id: string) => {
    const s = requireSupabase();
    const { error } = await s.from("productos").delete().eq("id", id);
    if (error) {
      toast.error("No se pudo eliminar");
      return;
    }
    setProducts((prev) => prev.filter((p) => p.id !== id));
    setSelected((prev) => prev.filter((x) => x !== id));
    toast.success("Producto eliminado");
  };

  const saveProduct = async (product: Product) => {
    const s = requireSupabase();
    const payload = {
      cliente_legajo: legajo,
      nombre: product.name,
      descripcion: product.desc ?? null,
      precio: product.price,
      cantidad: product.qty,
    };
    if (editingProduct) {
      const { error } = await s.from("productos").update(payload).eq("id", editingProduct.id);
      if (error) {
        toast.error("No se pudo actualizar");
        return;
      }
      toast.success("Producto actualizado");
    } else {
      const { error } = await s.from("productos").insert(payload);
      if (error) {
        toast.error("No se pudo crear");
        return;
      }
      toast.success("Producto creado");
    }
    setShowProductForm(false);
    setEditingProduct(null);
    if (legajo) await loadProductos(legajo);
  };

  return (
    <>
      <PageHeader
        title="Productos"
        description="Crea productos y genera links de cobro para compartir con tus clientes."
      />

      <div className="flex gap-1.5 mb-6">
        {([["productos", "Productos"], ["links", "Links de pago"]] as const).map(([k, l]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold border transition ${
              tab === k
                ? "bg-[color:var(--brand-soft)] text-[color:var(--brand-dark)] border-transparent"
                : "bg-card hover:bg-muted"
            }`}
          >
            {l}
          </button>
        ))}
      </div>

      {tab === "productos" && (
      <>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="relative w-full sm:flex-1 sm:min-w-[200px]">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <Input placeholder="Buscar producto..." className="pl-9" />
        </div>
        <div className="flex gap-2">
          <BtnOutline
            className="h-10"
            onClick={() => {
              setEditingProduct(null);
              setShowProductForm(true);
            }}
          >
            <Plus size={15} /> Producto
          </BtnOutline>
          <BtnPrimary
            className="h-10"
            onClick={() => {
              if (selected.length === 0) {
                toast.error("Selecciona productos primero");
                return;
              }
              setLinkPartial(false);
              setLinkMethods(paymentMethods.filter((m) => m.enabled).map((m) => m.id));
              setLinkExpires("");
              setLinkStatus("Activo");
              setLinkRef("");
              setLinkNotes("");
              setShowLinkForm(true);
            }}
          >
            <Plus size={15} /> Generar link
          </BtnPrimary>
        </div>
      </div>

      <Card className="p-0 overflow-hidden mb-6">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[11px] uppercase tracking-wide text-muted-foreground border-b bg-muted/30">
                <th className="w-10 px-3 py-2.5">
                  <input
                    type="checkbox"
                    onChange={(e) => setSelected(e.target.checked ? products.map((p) => p.id) : [])}
                    checked={selected.length === products.length && products.length > 0}
                  />
                </th>
                <th className="text-left px-3 py-2.5">Producto</th>
                <th className="text-right px-3 py-2.5">Cantidad</th>
                <th className="text-right px-3 py-2.5">Precio</th>
                <th className="text-left px-3 py-2.5 hidden md:table-cell">Descripcion</th>
                <th className="text-right px-3 py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="px-3 py-3">
                    <input
                      type="checkbox"
                      checked={selected.includes(p.id)}
                      onChange={() =>
                        setSelected((prev) =>
                          prev.includes(p.id) ? prev.filter((x) => x !== p.id) : [...prev, p.id],
                        )
                      }
                    />
                  </td>
                  <td className="px-3 py-3 font-semibold">{p.name}</td>
                  <td className="px-3 py-3 font-mono tabular-nums text-right">{p.qty}</td>
                  <td className="px-3 py-3 font-mono tabular-nums text-right font-semibold">{formatARS(p.price)}</td>
                  <td className="px-3 py-3 text-xs text-muted-foreground hidden md:table-cell">
                    {p.desc || "-"}
                  </td>
                  <td className="px-3 py-3 text-right">
                    <div className="flex gap-1 justify-end">
                      <BtnOutline
                        className="h-7 px-2 text-[11px]"
                        onClick={() => {
                          setEditingProduct(p);
                          setShowProductForm(true);
                        }}
                      >
                        Editar
                      </BtnOutline>
                      <BtnOutline
                        className="h-7 px-2 text-[11px]"
                        onClick={() => setConfirmarEliminarId(p.id)}
                      >
                        Eliminar
                      </BtnOutline>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <ProductFormDialog
        key={editingProduct?.id ?? "nuevo"}
        open={showProductForm}
        onClose={() => {
          setShowProductForm(false);
          setEditingProduct(null);
        }}
        product={editingProduct}
        onSave={saveProduct}
      />

      <FormDialog
        open={showLinkForm}
        onClose={() => setShowLinkForm(false)}
        title="Generar link de pago"
        description="Configura los metodos de pago y opciones del enlace."
        submitLabel="Generar link"
        size="lg"
        onSubmit={generateLink}
      >
        <div className="p-3 rounded-md bg-muted text-xs">
          <span className="text-muted-foreground">Productos seleccionados: </span>
          <span className="font-semibold">{selected.length}</span>
          {" - "}
          <span className="font-semibold">
            {formatARS(
              products
                .filter((p) => selected.includes(p.id))
                .reduce((s, p) => s + p.price * p.qty, 0),
            )}
          </span>
        </div>

        <label className="flex items-center justify-between text-sm">
          <span className="font-semibold">Permitir pagos parciales</span>
          <input
            type="checkbox"
            checked={linkPartial}
            onChange={(e) => setLinkPartial(e.target.checked)}
            className="toggle"
          />
        </label>

        <div>
          <Label>Metodos de pago permitidos</Label>
          {(["credit", "debit"] as const).map((cat) => (
            <div key={cat} className="mb-3">
              <div className="text-xs font-semibold text-muted-foreground uppercase mb-1.5">
                {cat === "credit" ? "Tarjetas de Credito" : "Tarjetas de Debito"}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                {paymentMethods
                  .filter((m) => m.category === cat)
                  .map((m) => (
                    <label
                      key={m.id}
                      className={
                        "flex items-center gap-2 px-3 py-2 rounded-md border text-xs cursor-pointer transition " +
                        (!m.enabled
                          ? "opacity-40 cursor-not-allowed"
                          : linkMethods.includes(m.id)
                            ? "border-primary bg-[color:var(--brand-soft)]"
                            : "bg-card hover:bg-muted")
                      }
                    >
                      <input
                        type="checkbox"
                        checked={linkMethods.includes(m.id)}
                        disabled={!m.enabled}
                        onChange={() => m.enabled && toggleMethod(m.id)}
                        className="accent-[color:var(--brand-dark)]"
                      />
                      {m.label}
                    </label>
                  ))}
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Fecha de expiracion</Label>
            <Input
              type="date"
              value={linkExpires}
              onChange={(e) => setLinkExpires(e.target.value)}
            />
          </div>
          <div>
            <Label>Estado</Label>
            <select
              className="w-full h-10 px-3 rounded-md border bg-card text-sm"
              value={linkStatus}
              onChange={(e) => setLinkStatus(e.target.value)}
            >
              <option value="Activo">Activo</option>
              <option value="Inactivo">Inactivo</option>
            </select>
          </div>
        </div>
        <div>
          <Label>Referencia interna</Label>
          <Input
            placeholder="FACT-0034"
            value={linkRef}
            onChange={(e) => setLinkRef(e.target.value)}
          />
        </div>
        <div>
          <Label>Observaciones (opcional)</Label>
          <textarea
            className="w-full h-20 px-3 py-2 rounded-md border bg-card text-sm resize-none"
            value={linkNotes}
            onChange={(e) => setLinkNotes(e.target.value)}
          />
        </div>
      </FormDialog>

      <FormDialog
        open={showResult}
        onClose={() => {
          setShowResult(false);
          setQrDataUrl("");
        }}
        title="Link de pago generado"
        description="Comparti el enlace con tu cliente para que realice el pago."
        submitLabel="Cerrar"
        size="lg"
        onSubmit={() => {
          setShowResult(false);
          setQrDataUrl("");
        }}
      >
        {generatedLink && (
          <>
            <div className="flex flex-col items-center gap-4 p-4">
              {qrDataUrl && <img src={qrDataUrl} alt="QR" className="w-40 h-40" />}
              <div className="font-mono text-sm break-all p-3 bg-muted rounded w-full text-center">
                {generatedLink.url}
              </div>
              <div className="flex gap-2">
                <BtnOutline
                  className="text-xs"
                  onClick={() => {
                    navigator.clipboard.writeText(generatedLink.url);
                    toast.success("URL copiada");
                  }}
                >
                  <Copy size={13} /> Copiar URL
                </BtnOutline>
                <BtnOutline
                  className="text-xs"
                  onClick={() => {
                    if (navigator.share)
                      navigator.share({ url: generatedLink.url }).catch(() => {});
                    else {
                      navigator.clipboard.writeText(generatedLink.url);
                      toast.success("URL copiada para compartir");
                    }
                  }}
                >
                  <Share2 size={13} /> Compartir
                </BtnOutline>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-muted-foreground text-xs">Estado</span>
                <div>
                  <Badge
                    tone={
                      generatedLink.status === "Activo"
                        ? "success"
                        : generatedLink.status === "Inactivo"
                          ? "neutral"
                          : "danger"
                    }
                  >
                    {generatedLink.status}
                  </Badge>
                </div>
              </div>
              <div>
                <span className="text-muted-foreground text-xs">Pagos parciales</span>
                <div>{generatedLink.partialPayments ? "Si" : "No"}</div>
              </div>
              <div>
                <span className="text-muted-foreground text-xs">Creado</span>
                <div>{generatedLink.createdAt}</div>
              </div>
              <div>
                <span className="text-muted-foreground text-xs">Expira</span>
                <div>{generatedLink.expiresAt || "Sin vencimiento"}</div>
              </div>
              <div className="col-span-2">
                <span className="text-muted-foreground text-xs">Productos</span>
                <div className="font-semibold">
                  {generatedLink.products.map((p) => p.name).join(", ")}
                </div>
              </div>
              {generatedLink.reference && (
                <div className="col-span-2">
                  <span className="text-muted-foreground text-xs">Referencia</span>
                  <div>{generatedLink.reference}</div>
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-2 pt-2 border-t">
              <BtnOutline className="text-xs">
                <Edit3 size={13} /> Editar
              </BtnOutline>
              <BtnOutline className="text-xs">
                <ToggleLeft size={13} />{" "}
                {generatedLink.status === "Activo" ? "Deshabilitar" : "Habilitar"}
              </BtnOutline>
              <BtnOutline className="text-xs">
                <RotateCcw size={13} /> Regenerar
              </BtnOutline>
              <BtnOutline className="text-xs">
                <History size={13} /> Historial de pagos
              </BtnOutline>
            </div>
          </>
        )}
      </FormDialog>

      <ConfirmDialog
        open={confirmarEliminarId !== null}
        title="¿Eliminar producto?"
        description="Esta accion no se puede deshacer."
        onClose={() => setConfirmarEliminarId(null)}
        onConfirm={() => {
          if (confirmarEliminarId) deleteProduct(confirmarEliminarId);
        }}
      />
      </>
      )}

      {tab === "links" && (
        <Card className="p-0 overflow-hidden">
          <div className="px-5 py-4 border-b">
            <h3 className="font-semibold text-sm">Links de pago generados</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[11px] uppercase tracking-wide text-muted-foreground border-b bg-muted/30">
                  <th className="text-left px-5 py-2.5">ID</th>
                  <th className="text-left px-5 py-2.5">Descripcion</th>
                  <th className="text-left px-5 py-2.5">Estado</th>
                  <th className="text-right px-5 py-2.5">Monto total</th>
                  <th className="text-left px-5 py-2.5">Fecha de expiracion</th>
                  <th className="text-right px-5 py-2.5">Pagos</th>
                  <th className="text-left px-5 py-2.5">Link de pago</th>
                  <th className="text-right px-5 py-2.5">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {links.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-5 py-10 text-center text-sm text-muted-foreground">
                      Aun no generaste links de pago. Crealos desde la pestana Productos.
                    </td>
                  </tr>
                ) : (
                  links.map((l) => {
                    const monto = l.products.reduce((s, p) => s + p.price * p.qty, 0);
                    const desc = l.products.map((p) => p.name).join(", ") || l.reference || "-";
                    return (
                      <tr key={l.id} className="border-b last:border-0 hover:bg-muted/30">
                        <td className="px-5 py-3 font-mono text-xs">{(l.url.split("/").pop()) ?? l.id}</td>
                        <td className="px-5 py-3 text-xs max-w-[220px] truncate" title={desc}>
                          {desc}
                        </td>
                        <td className="px-5 py-3">
                          <Badge
                            tone={
                              l.status === "Activo"
                                ? "success"
                                : l.status === "Inactivo"
                                  ? "neutral"
                                  : "danger"
                            }
                          >
                            {l.status}
                          </Badge>
                        </td>
                        <td className="px-5 py-3 font-mono tabular-nums text-right text-xs font-semibold">
                          {formatARS(monto)}
                        </td>
                        <td className="px-5 py-3 text-xs text-muted-foreground">
                          {l.expiresAt || "N/A"}
                        </td>
                        <td className="px-5 py-3 font-mono tabular-nums text-right text-xs">
                          {l.payments}
                        </td>
                        <td className="px-5 py-3">
                              <BtnOutline
                                className="h-7 px-2 text-[11px]"
                                onClick={() => {
                                  const code = l.url.split("/").pop();
                                  navigator.clipboard.writeText(code ? `${window.location.origin}/p/${code}` : l.url);
                                  toast.success("Link copiado");
                                }}
                              >
                                <Copy size={12} /> Copiar
                              </BtnOutline>
                        </td>
                        <td className="px-5 py-3 text-right">
                          <div className="flex gap-1 justify-end">
                            <button
                              onClick={() => setDetailLink(l)}
                              className="h-8 w-8 inline-flex items-center justify-center rounded-md border bg-card hover:bg-muted transition"
                              title="Ver detalle"
                            >
                              <Eye size={14} />
                            </button>
                            <button
                              onClick={() => setConfirmarEliminarLinkId(l.id)}
                              className="h-8 w-8 inline-flex items-center justify-center rounded-md border bg-card hover:bg-red-50 hover:text-red-600 transition"
                              title="Eliminar"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {detailLink && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setDetailLink(null)}
          />
          <div className="relative bg-card rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-card border-b px-6 py-4 flex justify-between items-center z-10">
              <div className="font-semibold">Detalle del link de pago</div>
              <button
                onClick={() => setDetailLink(null)}
                className="h-8 w-8 inline-flex items-center justify-center rounded-lg hover:bg-accent transition"
              >
                <X size={16} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="font-mono text-sm break-all p-3 bg-muted rounded">{detailLink.url}</div>
              <div className="flex gap-2">
                  <BtnOutline
                    className="flex-1 text-xs"
                    onClick={() => {
                      const code = detailLink.url.split("/").pop();
                      navigator.clipboard.writeText(code ? `${window.location.origin}/p/${code}` : detailLink.url);
                      toast.success("Link copiado");
                    }}
                  >
                    <Copy size={13} /> Copiar enlace
                  </BtnOutline>
                <BtnOutline
                  className="flex-1 text-xs"
                  onClick={() => {
                    if (navigator.share) navigator.share({ url: detailLink.url }).catch(() => {});
                    else {
                      navigator.clipboard.writeText(detailLink.url);
                      toast.success("Link copiado");
                    }
                  }}
                >
                  <Share2 size={13} /> Compartir
                </BtnOutline>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-xs text-muted-foreground">ID</span>
                  <div className="font-mono">{(detailLink.url.split("/").pop()) ?? detailLink.id}</div>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Estado</span>
                  <div>
                    <Badge
                      tone={
                        detailLink.status === "Activo"
                          ? "success"
                          : detailLink.status === "Inactivo"
                            ? "neutral"
                            : "danger"
                      }
                    >
                      {detailLink.status}
                    </Badge>
                  </div>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Monto total</span>
                  <div className="font-semibold">
                    {formatARS(detailLink.products.reduce((s, p) => s + p.price * p.qty, 0))}
                  </div>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Pagos</span>
                  <div>{detailLink.payments}</div>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Creado</span>
                  <div>{detailLink.createdAt}</div>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Expira</span>
                  <div>{detailLink.expiresAt || "N/A"}</div>
                </div>
                <div className="col-span-2">
                  <span className="text-xs text-muted-foreground">Productos</span>
                  <div className="font-semibold">
                    {detailLink.products.map((p) => p.name).join(", ")}
                  </div>
                </div>
                {detailLink.reference && (
                  <div className="col-span-2">
                    <span className="text-xs text-muted-foreground">Referencia</span>
                    <div>{detailLink.reference}</div>
                  </div>
                )}
                {detailLink.notes && (
                  <div className="col-span-2">
                    <span className="text-xs text-muted-foreground">Observaciones</span>
                    <div>{detailLink.notes}</div>
                  </div>
                )}
                <div>
                  <span className="text-xs text-muted-foreground">Pagos parciales</span>
                  <div>{detailLink.partialPayments ? "Si" : "No"}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmarEliminarLinkId !== null}
        title="¿Eliminar link de pago?"
        description="El enlace dejara de funcionar y no se podra recuperar. Esta accion no se puede deshacer."
        onClose={() => setConfirmarEliminarLinkId(null)}
        onConfirm={() => {
          if (confirmarEliminarLinkId) deleteLink(confirmarEliminarLinkId);
          setConfirmarEliminarLinkId(null);
        }}
      />
    </>
  );
}

function ProductFormDialog({
  open,
  onClose,
  product,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  product: Product | null;
  onSave: (p: Product) => void;
}) {
  const [name, setName] = useState(product?.name || "");
  const [qty, setQty] = useState(product?.qty.toString() || "1");
  const [price, setPrice] = useState(product?.price.toString() || "");
  const [desc, setDesc] = useState(product?.desc || "");

  return (
    <FormDialog
      open={open}
      onClose={onClose}
      title={product ? "Editar producto" : "Nuevo producto"}
      description="Registra un producto para asociarlo a un link de pago."
      submitLabel={product ? "Guardar cambios" : "Crear producto"}
      onSubmit={() => {
        if (!name || !price) {
          toast.error("Nombre y precio son obligatorios");
          return;
        }
        onSave({
          id: product?.id || "p" + Date.now(),
          name,
          qty: parseInt(qty) || 1,
          price: parseFloat(price.replace(/[^0-9,]/g, "").replace(",", ".")) || 0,
          desc: desc || undefined,
        });
      }}
    >
      <div>
        <Label>Nombre del producto</Label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Suscripcion Premium"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Cantidad</Label>
          <Input type="number" min={1} value={qty} onChange={(e) => setQty(e.target.value)} />
        </div>
        <div>
          <Label>Precio ($)</Label>
          <Input value={price} onChange={(e) => setPrice(e.target.value)} placeholder="29900" />
        </div>
      </div>
      <div>
        <Label>Descripcion (opcional)</Label>
        <Input
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          placeholder="Plan mensual premium"
        />
      </div>
    </FormDialog>
  );
}
