import { Modal } from "@/shared/ui/modal";
import { formatARS } from "@/features/payment-links/payment-links.data";
import { toast } from "sonner";
import { Copy,Edit3,Share2,X } from "lucide-react";
import { BtnOutline } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { linkDisplayStatus } from "@/features/payment-links/products.rules";

import type { ProductsPageVm } from "./use-products-page";

export function PaymentLinkDetailModal({
  detailLink,
  setDetailLink,
  setDetailLinkBrands,
  setEditLink,
  detailLinkBrands,
}: Pick<
  ProductsPageVm,
  "detailLink" | "setDetailLink" | "setDetailLinkBrands" | "setEditLink" | "detailLinkBrands"
>) {
  return (
    <>
      {detailLink && (
        <Modal
          open
          onClose={() => {
            setDetailLink(null);
            setDetailLinkBrands([]);
          }}
          size="custom"
          className="max-w-lg"
        >
          <div className="min-h-0 flex-1 overflow-y-auto">
            <div className="sticky top-0 bg-card border-b px-6 py-4 flex justify-between items-center z-10">
              <div className="font-semibold">Detalle del link de pago</div>
              <button
                onClick={() => {
                  setDetailLink(null);
                  setDetailLinkBrands([]);
                }}
                className="h-8 w-8 inline-flex items-center justify-center rounded-lg hover:bg-accent transition"
              >
                <X size={16} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="font-mono text-sm break-all p-3 bg-muted rounded">
                {detailLink.url}
              </div>
              <div className="flex gap-2">
                <BtnOutline
                  className="flex-1 text-xs"
                  onClick={() => {
                    navigator.clipboard.writeText(detailLink.url);
                    toast.success("Link copiado");
                  }}
                >
                  <Copy size={13} /> Copiar enlace
                </BtnOutline>
                <BtnOutline
                  className="flex-1 text-xs"
                  onClick={() => {
                    setEditLink(detailLink);
                    setDetailLink(null);
                  }}
                >
                  <Edit3 size={13} /> Editar
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
                  <div className="font-mono">
                    {detailLink.url.split("/").pop() ?? detailLink.id}
                  </div>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Estado</span>
                  <div>
                    <Badge
                      tone={
                        linkDisplayStatus(detailLink) === "Activo"
                          ? "success"
                          : linkDisplayStatus(detailLink) === "Inactivo"
                            ? "neutral"
                            : "danger"
                      }
                    >
                      {linkDisplayStatus(detailLink)}
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
                <div>
                  <span className="text-xs text-muted-foreground">Comercio</span>
                  <div className="font-semibold">{detailLink.comercioNombre || "-"}</div>
                </div>
                <div className="col-span-2">
                  <span className="text-xs text-muted-foreground">Metodos de pago</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {detailLinkBrands.length > 0 ? (
                      detailLinkBrands.map((b, i) => (
                        <Badge key={i} tone="neutral">
                          {b}
                        </Badge>
                      ))
                    ) : detailLink.methods.length > 0 ? (
                      detailLink.methods.map((m, i) => (
                        <Badge key={i} tone="neutral">
                          {m}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-muted-foreground text-xs">Sin metodos de pago</span>
                    )}
                  </div>
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
        </Modal>
      )}
    </>
  );
}
