import {
createLinkRow,
deleteLinkRow,
deleteProductRow,
generateLinkCode,
linkAmount,
listActiveBrands,
listLinkRows,
listProductRows,
listUserMerchants,
saveProductRow,
updateLinkRow,
} from "@/features/payment-links/payment-links.supabase";
import { userMessage } from "@/shared/lib/errors";
import { useCurrentCustomer,useSessionUser } from "@/features/session/session.hooks";
import { useEffect,useState } from "react";
import {
paymentMethods,
type PaymentLink,
type Product,
} from "@/features/payment-links/payment-links.data";
import { buildResolvableUrl,toResolvableLinkPaymentUrl } from "@/shared/lib/pay-url";
import { toast } from "sonner";
import {
type DbLink,
type DbLinkDetail,
type DbProducto,
type MerchantBrand,
} from "@/features/payment-links/products.types";
import { methodIdFromBrand } from "@/features/payment-links/products.rules";

/** Estado y acciones de ProductsPage: el componente solo dibuja. */
export function useProductsPage() {
  const customer = useCurrentCustomer();
  const sessionEmail = useSessionUser().user?.email ?? "";
  const [legajo, setLegajo] = useState<string>("");
  const [products, setProducts] = useState<Product[]>([]);
  const [links, setLinks] = useState<PaymentLink[]>([]);
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [showLinkForm, setShowLinkForm] = useState(false);
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);
  const [confirmRemoveLinkId, setConfirmRemoveLinkId] = useState<string | null>(null);
  const [tab, setTab] = useState<"productos" | "links">("productos");
  const [detailLink, setDetailLink] = useState<PaymentLink | null>(null);
  const [detailLinkBrands, setDetailLinkBrands] = useState<string[]>([]);
  const [editLink, setEditLink] = useState<PaymentLink | null>(null);
  const [linksPage, setLinksPage] = useState(1);
  const LINKS_PAGE_SIZE = 10;

  const [linkPartial, setLinkPartial] = useState(false);
  const [linkMethods, setLinkMethods] = useState<string[]>(
    paymentMethods.filter((m) => m.enabled).map((m) => m.id),
  );
  const [linkExpires, setLinkExpires] = useState("");
  const [linkStatus, setLinkStatus] = useState<string>("Activo");
  const [linkRef, setLinkRef] = useState("");
  const [linkNotes, setLinkNotes] = useState("");
  const [userMerchants, setUserMerchants] = useState<{ id: string; nombre_comercio: string }[]>([]);
  const [selectedMerchantId, setSelectedMerchantId] = useState<string>("");
  const [merchantBrands, setMerchantBrands] = useState<MerchantBrand[]>([]);

  const loadProductos = async (lg: string) => {
    const rows: Product[] = (await listProductRows<DbProducto>(lg)).map((r: DbProducto) => ({
      id: r.id,
      name: r.nombre,
      qty: Number(r.cantidad ?? 1),
      price: Number(r.precio ?? 0),
      desc: r.descripcion ?? undefined,
    }));
    setProducts(rows);
  };

  const loadLinks = async (lg: string) => {
    const { links: lk, details: det } = await listLinkRows<DbLink, DbLinkDetail>(lg);
    const byLink = new Map<string, DbLinkDetail[]>();
    det.forEach((d) => {
      const arr = byLink.get(d.link_id) ?? [];
      arr.push(d);
      byLink.set(d.link_id, arr);
    });
    const rows: PaymentLink[] = lk.map((x: DbLink) => {
      const dd = byLink.get(x.id) ?? [];
      const prods: Product[] = dd.map((d) => ({
        id: d.producto_id ?? d.id,
        name: d.producto_nombre,
        qty: Number(d.cantidad ?? 1),
        price: Number(d.precio_unitario ?? 0),
      }));
      return {
        id: x.id,
        // La URL guardada puede ser branding (pay.molly.com.ar) o un origen
        // viejo (localhost). Se reconstruye con el dominio de producción para
        // que "Copiar" y el detalle apunten siempre al deploy.
        url: toResolvableLinkPaymentUrl(x.url),
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
        comercioId: x.comercio_id ?? undefined,
        comercioNombre: x.comercio_nombre ?? undefined,
      };
    });
    setLinks(rows);
  };

  useEffect(() => {
    const lg = customer.data?.legajo;
    if (!lg) return;
    setLegajo(lg);
    void loadProductos(lg).catch((e) =>
      toast.error(userMessage(e, "No se pudieron cargar los productos.")),
    );
    void loadLinks(lg).catch((e) =>
      toast.error(userMessage(e, "No se pudieron cargar los links.")),
    );
    void listUserMerchants(lg, sessionEmail)
      .then(setUserMerchants)
      .catch((e) => toast.error(userMessage(e, "No se pudieron cargar los comercios.")));
    // Las cargas dependen solo del cliente activo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customer.data?.legajo, sessionEmail]);

  useEffect(() => {
    if (!selectedMerchantId) {
      setMerchantBrands([]);
      return;
    }
    void listActiveBrands(selectedMerchantId).then((data) => {
      const rows = data.map((b) => ({
        ...b,
        methodId: b.metodo_key || methodIdFromBrand(b.bandera),
      }));

      // Un comercio puede tener varias filas que apuntan al mismo metodo
      // (ej. "Visa" y "Visa Crédito" -> visa-cred). Se muestra una sola vez.
      const byMethod = new Map<string, MerchantBrand>();
      rows.forEach((b) => {
        if (!byMethod.has(b.methodId)) byMethod.set(b.methodId, b);
      });
      const unique = Array.from(byMethod.values());

      setMerchantBrands(unique);
      setLinkMethods(unique.map((b) => b.methodId));
    });
  }, [selectedMerchantId]);

  useEffect(() => {
    if (!detailLink?.comercioId) {
      setDetailLinkBrands([]);
      return;
    }
    void listActiveBrands(detailLink.comercioId).then((data) => {
      setDetailLinkBrands(data.map((b) => b.bandera));
    });
  }, [detailLink?.comercioId]);

  const toggleMethod = (id: string) => {
    setLinkMethods((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const generateLink = async () => {
    const selProducts = products.filter((p) => selected.includes(p.id));
    if (selProducts.length === 0) {
      toast.error("Selecciona al menos un producto");
      return;
    }
    if (!legajo) {
      toast.error("Sesion no disponible");
      return;
    }
    if (!selectedMerchantId) {
      toast.error("Selecciona un comercio");
      return;
    }
    const selectedMerchant = userMerchants.find((c) => c.id === selectedMerchantId);
    const code = generateLinkCode();
    // URL resoluble real: VITE_APP_URL > VITE_PAY_URL > window.location.origin (ver @/lib/pay-url).
    const url = buildResolvableUrl(code);
    const amount = linkAmount(selProducts);
    const insertLink = {
      cliente_legajo: legajo,
      comercio_id: selectedMerchantId,
      comercio_nombre: selectedMerchant?.nombre_comercio || null,
      url,
      monto: amount,
      estado: linkStatus,
      referencia: linkRef || null,
      notas: linkNotes || null,
      expira_en: linkExpires ? new Date(linkExpires + "T23:59:59").toISOString() : null,
      pagos_parciales: linkPartial,
      metodos_pago: linkMethods,
    };
    let inserted: { id: string };
    try {
      inserted = await createLinkRow(insertLink, (linkId) =>
        selProducts.map((p) => ({
          link_id: linkId,
          producto_id: p.id,
          producto_nombre: p.name,
          cantidad: p.qty,
          precio_unitario: p.price,
        })),
      );
    } catch (e) {
      toast.error(userMessage(e, "No se pudo generar el link"));
      return;
    }
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
      comercioId: selectedMerchantId,
      comercioNombre: selectedMerchant?.nombre_comercio,
    };
    setLinks((prev) => [link, ...prev]);
    setShowLinkForm(false);
    setTab("links");
    setLinksPage(1);
    setSelected([]);
    setLinkRef("");
    setLinkNotes("");
    setLinkExpires("");
    setLinkPartial(false);
    setLinkMethods([]);
    setLinkStatus("Activo");
    setSelectedMerchantId("");
    setMerchantBrands([]);
    toast.success("Link generado con exito");
    await loadLinks(legajo);
  };

  const deleteLink = async (id: string) => {
    try {
      await deleteLinkRow(id);
    } catch (e) {
      toast.error(userMessage(e, "No se pudo eliminar"));
      return;
    }
    setLinks((prev) => prev.filter((l) => l.id !== id));
    toast.success("Link de pago eliminado");
  };

  const saveEditLink = async (
    id: string,
    vals: {
      status: string;
      reference?: string;
      notes?: string;
      expires?: string;
      partial: boolean;
      methods: string[];
    },
  ) => {
    try {
      await updateLinkRow(id, {
        estado: vals.status,
        referencia: vals.reference || null,
        notas: vals.notes || null,
        expira_en: vals.expires ? new Date(vals.expires + "T23:59:59").toISOString() : null,
        pagos_parciales: vals.partial,
        metodos_pago: vals.methods,
      });
    } catch (e) {
      toast.error(userMessage(e, "No se pudo actualizar el link"));
      return;
    }
    toast.success("Link de pago actualizado");
    setEditLink(null);
    if (legajo) await loadLinks(legajo);
  };

  const deleteProduct = async (id: string) => {
    try {
      await deleteProductRow(id);
    } catch (e) {
      toast.error(userMessage(e, "No se pudo eliminar"));
      return;
    }
    setProducts((prev) => prev.filter((p) => p.id !== id));
    setSelected((prev) => prev.filter((x) => x !== id));
    toast.success("Producto eliminado");
  };

  const saveProduct = async (product: Product) => {
    const payload = {
      cliente_legajo: legajo,
      nombre: product.name,
      descripcion: product.desc ?? null,
      precio: product.price,
      cantidad: product.qty,
    };
    try {
      await saveProductRow(editingProduct?.id ?? null, payload);
    } catch (e) {
      toast.error(userMessage(e, editingProduct ? "No se pudo actualizar" : "No se pudo crear"));
      return;
    }
    toast.success(editingProduct ? "Producto actualizado" : "Producto creado");
    setShowProductForm(false);
    setEditingProduct(null);
    if (legajo) await loadProductos(legajo);
  };
  return {
    products,
    links,
    showProductForm,
    setShowProductForm,
    editingProduct,
    setEditingProduct,
    selected,
    setSelected,
    showLinkForm,
    setShowLinkForm,
    confirmRemoveId,
    setConfirmRemoveId,
    confirmRemoveLinkId,
    setConfirmRemoveLinkId,
    tab,
    setTab,
    detailLink,
    setDetailLink,
    detailLinkBrands,
    setDetailLinkBrands,
    editLink,
    setEditLink,
    linksPage,
    setLinksPage,
    LINKS_PAGE_SIZE,
    linkPartial,
    setLinkPartial,
    linkMethods,
    setLinkMethods,
    linkExpires,
    setLinkExpires,
    linkStatus,
    setLinkStatus,
    linkRef,
    setLinkRef,
    linkNotes,
    setLinkNotes,
    userMerchants,
    selectedMerchantId,
    setSelectedMerchantId,
    merchantBrands,
    setMerchantBrands,
    toggleMethod,
    generateLink,
    deleteLink,
    saveEditLink,
    deleteProduct,
    saveProduct,
  };
}

export type ProductsPageVm = ReturnType<typeof useProductsPage>;
