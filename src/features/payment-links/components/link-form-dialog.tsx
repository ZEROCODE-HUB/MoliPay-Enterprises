import { formatARS } from "@/features/payment-links/payment-links.data";
import { Input, Label, Select } from "@/shared/ui/form-controls";
import { FormDialog } from "@/shared/ui/form-dialog";

import type { ProductsPageVm } from "./use-products-page";

/** Formulario para generar un link: con productos del catálogo o con concepto y monto libres. */
export function LinkFormDialog({
  showLinkForm,
  setShowLinkForm,
  setSelectedMerchantId,
  setMerchantBrands,
  generateLink,
  selectedMerchantId,
  userMerchants,
  products,
  selected,
  setSelected,
  linkPartial,
  setLinkPartial,
  merchantBrands,
  linkMethods,
  toggleMethod,
  linkExpires,
  setLinkExpires,
  linkStatus,
  setLinkStatus,
  linkRef,
  setLinkRef,
  linkNotes,
  setLinkNotes,
  linkConcept,
  setLinkConcept,
  linkFreeAmount,
  setLinkFreeAmount,
}: Pick<
  ProductsPageVm,
  | "showLinkForm"
  | "setShowLinkForm"
  | "setSelectedMerchantId"
  | "setMerchantBrands"
  | "generateLink"
  | "selectedMerchantId"
  | "userMerchants"
  | "products"
  | "selected"
  | "setSelected"
  | "linkPartial"
  | "setLinkPartial"
  | "merchantBrands"
  | "linkMethods"
  | "toggleMethod"
  | "linkExpires"
  | "setLinkExpires"
  | "linkStatus"
  | "setLinkStatus"
  | "linkRef"
  | "setLinkRef"
  | "linkNotes"
  | "setLinkNotes"
  | "linkConcept"
  | "setLinkConcept"
  | "linkFreeAmount"
  | "setLinkFreeAmount"
>) {
  return (
    <FormDialog
      open={showLinkForm}
      onClose={() => {
        setShowLinkForm(false);
        setSelected([]);
        setSelectedMerchantId("");
        setMerchantBrands([]);
      }}
      title="Generar link de pago"
      description="Configura los metodos de pago y opciones del enlace"
      submitLabel="Generar link"
      size="lg"
      onSubmit={generateLink}
    >
      <div>
        <Label>Comercio</Label>
        <Select value={selectedMerchantId} onChange={(e) => setSelectedMerchantId(e.target.value)}>
          <option value="">Seleccionar comercio...</option>
          {userMerchants.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nombre_comercio || c.id}
            </option>
          ))}
        </Select>
      </div>

      {products.length > 0 && (
        <div>
          <Label>Productos del catálogo (opcional)</Label>
          <div className="max-h-40 space-y-1 overflow-y-auto rounded-md border p-2">
            {products.map((p) => (
              <label key={p.id} className="flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={selected.includes(p.id)}
                  onChange={() =>
                    setSelected((prev) =>
                      prev.includes(p.id) ? prev.filter((x) => x !== p.id) : [...prev, p.id],
                    )
                  }
                />
                <span className="flex-1">{p.name}</span>
                <span className="font-mono tabular-nums text-muted-foreground">
                  {p.qty} × {formatARS(p.price)}
                </span>
              </label>
            ))}
          </div>
        </div>
      )}

      {selected.length > 0 ? (
        <div className="p-3 rounded-md bg-muted text-xs">
          <span className="text-muted-foreground">Productos seleccionados: </span>
          <span className="font-medium">{selected.length}</span>
          {" - "}
          <span className="font-medium">
            {formatARS(
              products
                .filter((p) => selected.includes(p.id))
                .reduce((s, p) => s + p.price * p.qty, 0),
            )}
          </span>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-[1fr_180px]">
          <div>
            <Label>Concepto</Label>
            <Input
              placeholder="Ej.: Cuota de noviembre"
              value={linkConcept}
              onChange={(e) => setLinkConcept(e.target.value)}
            />
          </div>
          <div>
            <Label>Monto</Label>
            <Input
              inputMode="decimal"
              placeholder="0,00"
              className="text-right font-mono tabular-nums"
              value={linkFreeAmount}
              onChange={(e) => setLinkFreeAmount(e.target.value)}
            />
          </div>
          <p className="text-xs text-muted-foreground sm:col-span-2">
            Sin productos: el cliente paga este monto.
          </p>
        </div>
      )}

      <label className="flex items-center justify-between text-sm">
        <span className="font-medium">Permitir pagos parciales</span>
        <input
          type="checkbox"
          checked={linkPartial}
          onChange={(e) => setLinkPartial(e.target.checked)}
          className="toggle"
        />
      </label>

      {!selectedMerchantId ? (
        <div className="p-4 rounded-md bg-muted/50 text-center text-sm text-muted-foreground">
          Selecciona un comercio para ver los métodos de pago disponibles
        </div>
      ) : merchantBrands.length === 0 ? (
        <div className="p-4 rounded-md bg-muted/50 text-center text-sm text-muted-foreground">
          Este comercio no tiene métodos de pago configurados
        </div>
      ) : (
        <div>
          <Label>Métodos de pago permitidos</Label>
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
          <Input type="date" value={linkExpires} onChange={(e) => setLinkExpires(e.target.value)} />
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
  );
}
