import { toast } from "sonner";
import { SummaryQuote } from "@/features/transfers/components/summary-quote";
import { formatMoney } from "@/shared/lib/format";
import { Save,Users,X } from "lucide-react";
import { BtnOutline,BtnPrimary } from "@/shared/ui/button";
import { Input,Label,Select } from "@/shared/ui/form-controls";
import { RecipientValidatedCard } from "./transfers-parts";

import type { UnicaVm } from "./use-single-transfer-form";

export function SingleTransferFields({
  selectedRecipient,
  handleSearch,
  amountNumber,
  cot,
  setConfirm,
  searchQuery,
  setSearchQuery,
  setSelectedRecipient,
  searching,
  setFrequentsOpen,
  subaccountOrigin,
  setSubaccountOrigin,
  subaccounts,
  monto,
  setAmount,
  availableOrigin,
  concept,
  setConcept,
  resetForm,
  saveAsDraft,
}: Pick<
  UnicaVm,
  | "selectedRecipient"
  | "handleSearch"
  | "amountNumber"
  | "cot"
  | "setConfirm"
  | "searchQuery"
  | "setSearchQuery"
  | "setSelectedRecipient"
  | "searching"
  | "setFrequentsOpen"
  | "subaccountOrigin"
  | "setSubaccountOrigin"
  | "subaccounts"
  | "monto"
  | "setAmount"
  | "availableOrigin"
  | "concept"
  | "setConcept"
  | "resetForm"
  | "saveAsDraft"
>) {
  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        // If the recipient is not validated (or the text changed), validate here
        // before moving on to the confirmation screen.
        if (!selectedRecipient) {
          if (!(await handleSearch())) return;
        }
        if (amountNumber <= 0) {
          toast.error("Ingresa un monto valido");
          return;
        }
        if (cot.insuficiente) {
          toast.error("Saldo insuficiente en la subcuenta de origen");
          return;
        }
        setConfirm(true);
      }}
    >
      <div>
        <Label>Destinatario (CBU/CVU/Alias)</Label>
        <div className="flex gap-2">
          <Input
            className="flex-1"
            placeholder="22 digitos o alias (6-20)"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              // Si cambia el texto, la validacion anterior deja de valer.
              setSelectedRecipient(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void handleSearch();
              }
            }}
            disabled={searching}
          />
          <BtnOutline
            type="button"
            onClick={() => {
              void handleSearch();
            }}
            disabled={searching}
          >
            {searching ? "Validando..." : "Validar"}
          </BtnOutline>
        </div>
        {selectedRecipient ? (
          <RecipientValidatedCard d={selectedRecipient} />
        ) : (
          <div className="text-xs text-muted-foreground mt-1">
            Se valida contra el banco (/accounts/info) antes de continuar.
          </div>
        )}
        <BtnOutline type="button" onClick={() => setFrequentsOpen(true)} className="w-full mt-2">
          <Users size={14} /> Destinatarios frecuentes
        </BtnOutline>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <div className="sm:col-span-2">
          <Label>Origen de fondos</Label>
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
          <Label>Monto</Label>
          <Input
            type="number"
            placeholder="$ 0,00"
            value={monto}
            onChange={(e) => setAmount(e.target.value)}
            min="0"
            step="0.01"
            aria-invalid={cot.insuficiente}
            className={
              cot.insuficiente ? "!border-red-400 !text-red-700 focus:!ring-red-100" : undefined
            }
          />
        </div>
        <div>
          <Label>Moneda</Label>
          <div className="h-10 px-3 rounded-md border bg-muted flex items-center text-sm text-muted-foreground">
            ARS — Pesos Argentinos
          </div>
        </div>
        <div className="sm:col-span-2 -mt-1">
          <SummaryQuote
            monto={amountNumber}
            disponible={availableOrigin}
            cotizacion={cot.cotizacion}
            cargando={cot.cargando}
            insuficiente={cot.insuficiente}
            faltante={cot.faltante}
          />
        </div>
        <div>
          <Label>Concepto</Label>
          <Select value={concept} onChange={(e) => setConcept(e.target.value)}>
            <option>Pago a proveedor</option>
            <option>Sueldos</option>
            <option>Honorarios</option>
            <option>Servicios</option>
            <option>Devolucion</option>
          </Select>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 pt-1">
        <BtnOutline type="button" className="flex-1 min-w-[130px]" onClick={resetForm}>
          <X size={14} /> Cancelar
        </BtnOutline>
        <BtnOutline
          type="button"
          className="flex-1 min-w-[130px]"
          onClick={() => {
            void saveAsDraft();
          }}
        >
          <Save size={14} /> Guardar borrador
        </BtnOutline>
        <BtnPrimary type="submit" className="flex-1 min-w-[130px]" disabled={cot.insuficiente}>
          Continuar
        </BtnPrimary>
      </div>
    </form>
  );
}
