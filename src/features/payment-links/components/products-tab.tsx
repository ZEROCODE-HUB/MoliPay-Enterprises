import { formatARS } from "@/features/payment-links/payment-links.data";
import { Plus, Search } from "lucide-react";
import { Input } from "@/shared/ui/form-controls";
import { BtnOutline, BtnPrimary } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { ConfirmDialog } from "@/shared/ui/confirm-dialog";
import { ProductFormDialog } from "./product-form-dialog";

import type { ProductsPageVm } from "./use-products-page";

export function ProductsTab({
  tab,
  setEditingProduct,
  setShowProductForm,
  products,
  setConfirmRemoveId,
  editingProduct,
  showProductForm,
  saveProduct,
  confirmRemoveId,
  deleteProduct,
}: Pick<
  ProductsPageVm,
  | "tab"
  | "setEditingProduct"
  | "setShowProductForm"
  | "products"
  | "setConfirmRemoveId"
  | "editingProduct"
  | "showProductForm"
  | "saveProduct"
  | "confirmRemoveId"
  | "deleteProduct"
>) {
  return (
    <>
      {tab === "productos" && (
        <>
          <div className="mb-3 flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card p-3">
            <div className="relative w-full sm:flex-1 sm:min-w-[200px]">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <Input placeholder="Buscar producto" className="pl-9" />
            </div>
            <div className="flex gap-2">
              <BtnPrimary
                className="h-10"
                onClick={() => {
                  setEditingProduct(null);
                  setShowProductForm(true);
                }}
              >
                <Plus size={15} /> Producto
              </BtnPrimary>
            </div>
          </div>

          <Card className="p-0 overflow-hidden mb-6">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[11px] border-b bg-muted/30">
                    <th className="text-left px-3 py-2.5">Producto</th>
                    <th className="text-right px-3 py-2.5">Cantidad</th>
                    <th className="text-right px-3 py-2.5">Precio</th>
                    <th className="text-left px-3 py-2.5 hidden md:table-cell">Descripción</th>
                    <th className="text-right px-3 py-2.5"></th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((p) => (
                    <tr key={p.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="px-3 py-3 font-medium">{p.name}</td>
                      <td className="px-3 py-3 font-mono tabular-nums text-right">{p.qty}</td>
                      <td className="px-3 py-3 font-mono tabular-nums text-right font-medium">
                        {formatARS(p.price)}
                      </td>
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
                            onClick={() => setConfirmRemoveId(p.id)}
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

          <ConfirmDialog
            confirmLabel="Eliminar"
            variant="danger"
            open={confirmRemoveId !== null}
            title="¿Eliminar producto?"
            message="Esta accion no se puede deshacer."
            onClose={() => setConfirmRemoveId(null)}
            onConfirm={() => {
              if (confirmRemoveId) deleteProduct(confirmRemoveId);
            }}
          />
        </>
      )}
    </>
  );
}
