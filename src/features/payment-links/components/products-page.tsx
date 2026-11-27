import { ProductsTab } from "./products-tab";
import { PaymentLinksTab } from "./payment-links-tab";
import { PaymentLinkDetailModal } from "./payment-link-detail-modal";
import { PageHeader } from "@/shared/ui/page-header";
import { ConfirmDialog } from "@/shared/ui/confirm-dialog";
import { LinkEditDialog } from "./link-edit-dialog";
import { LinkFormDialog } from "./link-form-dialog";
import { BtnPrimary } from "@/shared/ui/button";
import { Plus } from "lucide-react";
import { useProductsPage, type ProductsSection } from "./use-products-page";

/** E-commerce > Productos (catálogo) o Link de pago > Links, según la ruta. */
export function ProductsPage({ section }: { section: ProductsSection }) {
  const vm = useProductsPage(section);
  const {
    confirmRemoveLinkId,
    setConfirmRemoveLinkId,
    openLinkForm,
    editLink,
    setEditLink,
    deleteLink,
    saveEditLink,
  } = vm;

  return (
    <>
      {section === "productos" ? (
        <PageHeader title="Productos" description="Catálogo de productos de tu tienda online" />
      ) : (
        <PageHeader
          title="Links de pago"
          description="Generá links de cobro y compartilos con tus clientes"
          action={
            <BtnPrimary className="h-10" onClick={openLinkForm}>
              <Plus size={15} /> Generar link
            </BtnPrimary>
          }
        />
      )}

      <ProductsTab {...vm} />

      <PaymentLinksTab {...vm} />

      <PaymentLinkDetailModal {...vm} />

      <LinkFormDialog {...vm} />

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
