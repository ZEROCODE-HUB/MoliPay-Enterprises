import { useRecipientsPage } from "@/features/transfers/components/use-recipients-page";
import { PageHeader } from "@/shared/ui/page-header";
import { BtnOutline,BtnPrimary } from "@/shared/ui/button";
import { Plus,Upload } from "lucide-react";
import { Stat } from "@/shared/ui/card";
import { formatMoney } from "@/shared/lib/format";
import { sumDecimals } from "@/shared/lib/money";
import { RecipientsTable } from "@/features/transfers/components/recipients-table";
import { NewRecipientDialog } from "@/features/transfers/components/new-recipient-dialog";
import { FormDialog } from "@/shared/ui/form-dialog";
import { Input,Label,Select } from "@/shared/ui/form-controls";
import { ConfirmDialog } from "@/shared/ui/confirm-dialog";
import { deleteFrequentRecipient } from "@/features/transfers/transfer-store";
import { toast } from "sonner";
import { toDataError } from "@/infrastructure/supabase/errors";

export function RecipientsPage() {
  const vm = useRecipientsPage();
  const {
    setNewOpen,
    transfer,
    setTransfer,
    remove,
    setRemove,
    amount,
    setAmount,
    concept,
    setConcept,
    subaccountOrigin,
    setSubaccountOrigin,
    sending,
    items,
    setItems,
    subaccounts,
    handleTransfer,
  } = vm;

  return (
    <>
      <PageHeader
        title="Mis destinatarios"
        description="Agenda de contactos frecuentes con etiquetas y validacion CBU."
        action={
          <div className="flex gap-2">
            <BtnOutline>
              <Upload size={14} /> Importar CSV
            </BtnOutline>
            <BtnPrimary onClick={() => setNewOpen(true)}>
              <Plus size={16} /> Nuevo destinatario
            </BtnPrimary>
          </div>
        }
      />

      <div className="grid md:grid-cols-4 gap-4 mb-6">
        <Stat label="Total destinatarios" value={String(items.length)} />
        <Stat label="Favoritos" value={String(items.filter((d) => d.fav).length)} />
        <Stat label="Subcuentas" value={String(subaccounts.length)} />
        <Stat
          label="Disponible"
          value={formatMoney(sumDecimals(subaccounts.map((x) => x.saldo_disponible)))}
        />
      </div>

      <RecipientsTable {...vm} />

      <NewRecipientDialog {...vm} />

      <FormDialog
        open={!!transfer}
        onClose={() => setTransfer(null)}
        title={`Transferir a ${transfer?.n ?? ""}`}
        description="Confirma el monto y la subcuenta de origen para enviar la transferencia."
        submitLabel={sending ? "Enviando..." : "Enviar transferencia"}
        onSubmit={handleTransfer}
      >
        {transfer && (
          <div className="rounded-md border bg-muted/30 p-3 text-xs space-y-1">
            <div className="font-semibold text-sm text-foreground">{transfer.n}</div>
            <div className="text-muted-foreground">
              @{transfer.a} · {transfer.b}
            </div>
            <div className="font-mono text-muted-foreground">{transfer.cbu}</div>
          </div>
        )}
        <div>
          <Label>Subcuenta de origen</Label>
          <Select value={subaccountOrigin} onChange={(e) => setSubaccountOrigin(e.target.value)}>
            {subaccounts.length === 0 && <option value="">Sin subcuentas</option>}
            {subaccounts.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nombre} — {formatMoney(Number(s.saldo_disponible))}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label>Monto (ARS)</Label>
          <Input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0,00"
            min="0"
            step="0.01"
          />
        </div>
        <div>
          <Label>Concepto</Label>
          <Input
            value={concept}
            onChange={(e) => setConcept(e.target.value)}
            placeholder="Pago factura, sueldo, etc."
          />
        </div>
      </FormDialog>

      <ConfirmDialog
        confirmLabel="Eliminar"
        variant="danger"
        open={!!remove}
        title="Eliminar destinatario"
        message={
          remove ? `Se quitará "${remove.n}" de tu agenda. No afecta transferencias ya hechas.` : ""
        }
        onClose={() => setRemove(null)}
        onConfirm={async () => {
          const d = remove;
          setRemove(null);
          if (!d) return;
          try {
            await deleteFrequentRecipient(d.id);
            setItems((prev) => prev.filter((x) => x.id !== d.id));
            toast.success("Destinatario eliminado de la agenda");
          } catch (e) {
            toast.error(toDataError(e).message);
          }
        }}
      />
    </>
  );
}
