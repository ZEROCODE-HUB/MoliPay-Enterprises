import { ProductsTab } from "./products-tab";
import { PaymentLinksTab } from "./payment-links-tab";
import { PaymentLinkDetailModal } from "./payment-link-detail-modal";
import { useProductsPage } from "./use-products-page";
import { PageHeader } from "@/shared/ui/page-header";
import { ConfirmDialog } from "@/shared/ui/confirm-dialog";
import { LinkEditDialog } from "./link-edit-dialog";

export function ProductsPage() {
  const vm = useProductsPage();
  const {
    confirmRemoveLinkId,
    setConfirmRemoveLinkId,
    tab,
    setTab,
    editLink,
    setEditLink,
    deleteLink,
    saveEditLink,
  } = vm;

  return (
    <>
      <PageHeader
        title="Productos"
        description="Crea productos y genera links de cobro para compartir con tus clientes."
      />

      <div className="flex gap-6 border-b border-black-100 mb-6">
        {(
          [
            ["productos", "Productos"],
            ["links", "Links de pago"],
          ] as const
        ).map(([k, l]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`w-auto pb-3 text-sm font-semibold transition-colors ${
              tab === k
                ? "border-b-2 border-red-500 text-black-800"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {l}
          </button>
        ))}
      </div>

      <ProductsTab {...vm} />

      <PaymentLinksTab {...vm} />

      <PaymentLinkDetailModal {...vm} />

      <ConfirmDialog
        confirmLabel="Eliminar"
        variant="danger"
        open={confirmRemoveLinkId !== null}
        title="¿Eliminar link de pago?"
        message="El enlace dejara de funcionar y no se podra recuperar. Esta accion no se puede deshacer."
        onClose={() => setConfirmRemoveLinkId(null)}
        onConfirm={() => {
          if (confirmRemoveLinkId) deleteLink(confirmRemoveLinkId);
          setConfirmRemoveLinkId(null);
        }}
      />

      <LinkEditDialog link={editLink} onClose={() => setEditLink(null)} onSave={saveEditLink} />
    </>
  );
}
