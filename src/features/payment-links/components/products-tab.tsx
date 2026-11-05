import { formatARS,paymentMethods } from "@/features/payment-links/payment-links.data";
import { toast } from "sonner";
import { Plus,Search } from "lucide-react";
import { Input,Label,Select } from "@/shared/ui/form-controls";
import { BtnOutline,BtnPrimary } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { FormDialog } from "@/shared/ui/form-dialog";
import { ConfirmDialog } from "@/shared/ui/confirm-dialog";
import { ProductFormDialog } from "./product-form-dialog";

import type { ProductsPageVm } from "./use-products-page";

export function ProductsTab({
  tab,
  setEditingProduct,
  setShowProductForm,
  selected,
  setLinkPartial,
  setLinkMethods,
  setLinkExpires,
  setLinkStatus,
  setLinkRef,
  setLinkNotes,
  setShowLinkForm,
  setSelected,
  products,
  setConfirmRemoveId,
  editingProduct,
  showProductForm,
  saveProduct,
  showLinkForm,
  setSelectedMerchantId,
  setMerchantBrands,
  generateLink,
  selectedMerchantId,
  userMerchants,
  linkPartial,
  merchantBrands,
  linkMethods,
  toggleMethod,
  linkExpires,
  linkStatus,
  linkRef,
  linkNotes,
  confirmRemoveId,
  deleteProduct,
}: Pick<
  ProductsPageVm,
  | "tab"
  | "setEditingProduct"
  | "setShowProductForm"
  | "selected"
  | "setLinkPartial"
  | "setLinkMethods"
  | "setLinkExpires"
  | "setLinkStatus"
  | "setLinkRef"
  | "setLinkNotes"
  | "setShowLinkForm"
  | "setSelected"
  | "products"
  | "setConfirmRemoveId"
  | "editingProduct"
  | "showProductForm"
  | "saveProduct"
  | "showLinkForm"
  | "setSelectedMerchantId"
  | "setMerchantBrands"
  | "generateLink"
  | "selectedMerchantId"
  | "userMerchants"
  | "linkPartial"
  | "merchantBrands"
  | "linkMethods"
  | "toggleMethod"
  | "linkExpires"
  | "linkStatus"
  | "linkRef"
  | "linkNotes"
  | "confirmRemoveId"
  | "deleteProduct"
>) {
  return (
    <>
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
                        onChange={(e) =>
                          setSelected(e.target.checked ? products.map((p) => p.id) : [])
                        }
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
                              prev.includes(p.id)
                                ? prev.filter((x) => x !== p.id)
                                : [...prev, p.id],
                            )
                          }
                        />
                      </td>
                      <td className="px-3 py-3 font-semibold">{p.name}</td>
                      <td className="px-3 py-3 font-mono tabular-nums text-right">{p.qty}</td>
                      <td className="px-3 py-3 font-mono tabular-nums text-right font-semibold">
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

          <FormDialog
            open={showLinkForm}
            onClose={() => {
              setShowLinkForm(false);
              setSelectedMerchantId("");
              setMerchantBrands([]);
            }}
            title="Generar link de pago"
            description="Configura los metodos de pago y opciones del enlace."
            submitLabel="Generar link"
            size="lg"
            onSubmit={generateLink}
          >
            <div>
              <Label>Comercio</Label>
              <Select
                value={selectedMerchantId}
                onChange={(e) => setSelectedMerchantId(e.target.value)}
              >
                <option value="">Seleccionar comercio...</option>
                {userMerchants.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre_comercio || c.id}
                  </option>
                ))}
              </Select>
            </div>

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

            {!selectedMerchantId ? (
              <div className="p-4 rounded-md bg-muted/50 text-center text-sm text-muted-foreground">
                Selecciona un comercio para ver los metodos de pago disponibles
              </div>
            ) : merchantBrands.length === 0 ? (
              <div className="p-4 rounded-md bg-muted/50 text-center text-sm text-muted-foreground">
                Este comercio no tiene metodos de pago configurados
              </div>
            ) : (
              <div>
                <Label>Metodos de pago permitidos</Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                  {merchantBrands.map((b) => {
                    const isSelected = linkMethods.includes(b.methodId);
                    return (
                      <label
                        key={b.id}
                        className={
                          "flex items-center gap-2 px-3 py-2 rounded-md border text-xs cursor-pointer transition " +
                          (isSelected
                            ? "border-primary bg-[color:var(--brand-soft)]"
                            : "bg-card hover:bg-muted")
                        }
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleMethod(b.methodId)}
                          className="accent-[color:var(--brand-dark)]"
                        />
                        {b.bandera}
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

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
                <Select value={linkStatus} onChange={(e) => setLinkStatus(e.target.value)}>
                  <option value="Pendiente de aprobación">Pendiente de aprobación</option>
                  <option value="Activo">Activo</option>
                  <option value="Inactivo">Inactivo</option>
                </Select>
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
