import { formatARS } from "@/features/payment-links/payment-links.data";
import { toast } from "sonner";
import { Copy,Edit3,Eye,Trash2 } from "lucide-react";
import { BtnOutline } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { linkDisplayStatus } from "@/features/payment-links/products.rules";

import type { ProductsPageVm } from "./use-products-page";

export function PaymentLinksTab({
  tab,
  links,
  LINKS_PAGE_SIZE,
  linksPage,
  setDetailLink,
  setEditLink,
  setConfirmRemoveLinkId,
  setLinksPage,
}: Pick<
  ProductsPageVm,
  | "tab"
  | "links"
  | "LINKS_PAGE_SIZE"
  | "linksPage"
  | "setDetailLink"
  | "setEditLink"
  | "setConfirmRemoveLinkId"
  | "setLinksPage"
>) {
  return (
    <>
      {tab === "links" &&
        (() => {
          const totalLinks = links.length;
          const totalLinkPages = Math.max(1, Math.ceil(totalLinks / LINKS_PAGE_SIZE));
          const safeLinksPage = Math.min(linksPage, totalLinkPages);
          const paginatedLinks = links.slice(
            (safeLinksPage - 1) * LINKS_PAGE_SIZE,
            safeLinksPage * LINKS_PAGE_SIZE,
          );

          return (
            <Card className="p-0 overflow-hidden">
              <div className="px-5 py-4 border-b flex items-center justify-between">
                <h3 className="font-semibold text-sm">Links de pago generados</h3>
                <span className="text-xs text-muted-foreground">
                  {totalLinks} link{totalLinks !== 1 ? "s" : ""}
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-[11px] uppercase tracking-wide text-muted-foreground border-b bg-muted/30">
                      <th className="text-left px-5 py-2.5">ID</th>
                      <th className="text-left px-5 py-2.5">Comercio</th>
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
                    {totalLinks === 0 ? (
                      <tr>
                        <td
                          colSpan={9}
                          className="px-5 py-10 text-center text-sm text-muted-foreground"
                        >
                          Aun no generaste links de pago. Crealos desde la pestana Productos.
                        </td>
                      </tr>
                    ) : (
                      paginatedLinks.map((l) => {
                        const amount = l.products.reduce((s, p) => s + p.price * p.qty, 0);
                        const desc = l.products.map((p) => p.name).join(", ") || l.reference || "-";
                        return (
                          <tr key={l.id} className="border-b last:border-0 hover:bg-muted/30">
                            <td className="px-5 py-3 font-mono text-xs">
                              {l.url.split("/").pop() ?? l.id}
                            </td>
                            <td
                              className="px-5 py-3 text-xs max-w-[150px] truncate"
                              title={l.comercioNombre || "-"}
                            >
                              {l.comercioNombre || "-"}
                            </td>
                            <td className="px-5 py-3 text-xs max-w-[220px] truncate" title={desc}>
                              {desc}
                            </td>
                            <td className="px-5 py-3">
                              <Badge
                                tone={
                                  linkDisplayStatus(l) === "Activo"
                                    ? "success"
                                    : linkDisplayStatus(l) === "Inactivo"
                                      ? "neutral"
                                      : "danger"
                                }
                              >
                                {linkDisplayStatus(l)}
                              </Badge>
                            </td>
                            <td className="px-5 py-3 font-mono tabular-nums text-right text-xs font-semibold">
                              {formatARS(amount)}
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
                                  navigator.clipboard.writeText(l.url);
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
                                  onClick={() => setEditLink(l)}
                                  className="h-8 w-8 inline-flex items-center justify-center rounded-md border bg-card hover:bg-muted transition"
                                  title="Editar"
                                >
                                  <Edit3 size={14} />
                                </button>
                                <button
                                  onClick={() => setConfirmRemoveLinkId(l.id)}
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
              {totalLinks > 0 && (
                <div className="px-5 py-3 border-t flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    Mostrando {(safeLinksPage - 1) * LINKS_PAGE_SIZE + 1}–
                    {Math.min(safeLinksPage * LINKS_PAGE_SIZE, totalLinks)} de {totalLinks}
                  </span>
                  <div className="flex gap-1">
                    <BtnOutline
                      className="h-7 px-2 text-[11px]"
                      disabled={safeLinksPage <= 1}
                      onClick={() => setLinksPage(1)}
                    >
                      «
                    </BtnOutline>
                    <BtnOutline
                      className="h-7 px-2 text-[11px]"
                      disabled={safeLinksPage <= 1}
                      onClick={() => setLinksPage((p) => Math.max(1, p - 1))}
                    >
                      ‹
                    </BtnOutline>
                    <span className="h-7 px-2 flex items-center font-medium">
                      {safeLinksPage}/{totalLinkPages}
                    </span>
                    <BtnOutline
                      className="h-7 px-2 text-[11px]"
                      disabled={safeLinksPage >= totalLinkPages}
                      onClick={() => setLinksPage((p) => Math.min(totalLinkPages, p + 1))}
                    >
                      ›
                    </BtnOutline>
                    <BtnOutline
                      className="h-7 px-2 text-[11px]"
                      disabled={safeLinksPage >= totalLinkPages}
                      onClick={() => setLinksPage(totalLinkPages)}
                    >
                      »
                    </BtnOutline>
                  </div>
                </div>
              )}
            </Card>
          );
        })()}
    </>
  );
}
