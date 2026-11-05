import { type Template } from "@/features/transfers/transfer-store";
import { useState } from "react";
import { toast } from "sonner";
import { moneyInputToNumber } from "@/shared/lib/money";
import { FormDialog } from "@/shared/ui/form-dialog";
import { Edit3,Star,Trash2 } from "lucide-react";
import { formatMoney } from "@/shared/lib/format";
import { Input,Label,Select } from "@/shared/ui/form-controls";
import { type Subaccount } from "@/features/transfers/transfers.types";

/* ===== Transferencia unica ===== */

/* ===== Plantillas ===== */
/**
 * Templates dialog: list, apply, create, edit and delete. Templates are generic
 * (name + amount, no recipient): the CBU/CVU/alias is chosen when applying them.
 * CBU/CVU/alias de la persona.
 */
export function PlantillasDialog({
  open,
  onClose,
  templates,
  error,
  subcuentas: subaccounts,
  onAplicar: onApply,
  onBorrar: onDelete,
  onCrear: onCreate,
  onEditar: onEdit,
}: {
  open: boolean;
  onClose: () => void;
  templates: Template[];
  /** Shown when the table does not exist yet (migration 1016). */
  error?: string | null;
  subcuentas: Subaccount[];
  onAplicar: (p: Template) => void;
  onBorrar: (p: Template) => void | Promise<void>;
  onCrear: (input: {
    nombre: string;
    monto?: number;
    subcuentaOrigen?: string;
    concepto?: string;
  }) => Promise<boolean>;
  onEditar: (
    id: string,
    input: { nombre: string; monto?: number; subcuentaOrigen?: string; concepto?: string },
  ) => Promise<boolean>;
}) {
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [subaccountOrigin, setSubaccountOrigin] = useState("");
  const [concept, setConcept] = useState("Pago a proveedor");
  const [creando, setCreando] = useState(false);
  /** Template being edited (null = creating a new one). */
  const [editing, setEditing] = useState<Template | null>(null);

  const save = async () => {
    if (creando) return;
    if (!name.trim()) {
      toast.error("Ponele un nombre a la plantilla");
      return;
    }
    const amountNum = amount.trim() ? moneyInputToNumber(amount) : undefined;
    if (amount.trim() && (!amountNum || amountNum <= 0)) {
      toast.error("Ingresa un monto valido o dejalo vacio");
      return;
    }
    setCreando(true);
    try {
      const data = {
        nombre: name.trim(),
        monto: amountNum,
        subcuentaOrigen: subaccountOrigin || undefined,
        concepto: concept || undefined,
      };
      const ok = editing ? await onEdit(editing.id, data) : await onCreate(data);
      if (ok) {
        setName("");
        setAmount("");
        setSubaccountOrigin("");
        setConcept("Pago a proveedor");
        setEditing(null);
      }
    } finally {
      setCreando(false);
    }
  };

  return (
    <FormDialog
      open={open}
      onClose={() => {
        setEditing(null);
        setName("");
        setAmount("");
        setSubaccountOrigin("");
        onClose();
      }}
      title="Plantillas de transferencia"
      description="Selecciona una plantilla para precargar el formulario."
      submitLabel={creando ? "Guardando..." : editing ? "Guardar cambios" : "Crear plantilla"}
      size="lg"
      onSubmit={() => {
        void save();
      }}
    >
      {error && (
        <div className="mb-3 rounded-md border border-amber-300/70 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          {error}
        </div>
      )}
      <div className="divide-y border rounded-md max-h-64 overflow-y-auto">
        {templates.length === 0 ? (
          <div className="p-5 text-center text-sm text-muted-foreground">
            Todavia no tenes templates. Crea una abajo o guardala desde el formulario de
            transferencia.
          </div>
        ) : (
          templates.map((p) => {
            const origin = p.subcuentaOrigen
              ? subaccounts.find((s) => s.id === p.subcuentaOrigen)?.nombre
              : undefined;
            return (
              <div
                key={p.id}
                className="flex items-center justify-between gap-2 p-3 hover:bg-muted/50 cursor-pointer"
                onClick={() => onApply(p)}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-md bg-[color:var(--brand-soft)] flex items-center justify-center shrink-0">
                    <Star size={14} className="text-[color:var(--brand-dark)]" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold text-sm truncate">{p.nombre}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {p.destinatario
                        ? `${p.destinatario.nombre}${p.destinatario.alias ? ` · @${p.destinatario.alias}` : ""}`
                        : p.monto != null
                          ? formatMoney(p.monto)
                          : "Sin monto"}
                      {p.concepto ? ` · ${p.concepto}` : ""}
                      {origin ? ` · ${origin}` : ""}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-sm font-semibold">
                    {p.monto != null ? formatMoney(p.monto) : "—"}
                  </span>
                  <button
                    type="button"
                    title="Editar plantilla"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditing(p);
                      setName(p.nombre);
                      setAmount(p.monto != null ? String(p.monto) : "");
                      setSubaccountOrigin(p.subcuentaOrigen ?? "");
                      setConcept(p.concepto || "Pago a proveedor");
                    }}
                    className="h-8 w-8 inline-flex items-center justify-center rounded-md border bg-card hover:bg-accent text-muted-foreground"
                  >
                    <Edit3 size={13} />
                  </button>
                  <button
                    type="button"
                    title="Eliminar plantilla"
                    onClick={(e) => {
                      e.stopPropagation();
                      void onDelete(p);
                    }}
                    className="h-8 w-8 inline-flex items-center justify-center rounded-md border bg-card hover:bg-red-50 text-muted-foreground hover:text-red-600"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="pt-3 space-y-2">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>{editing ? "Nombre" : "Nueva plantilla"}</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. Sueldos mensuales"
            />
          </div>
          <div>
            <Label>Monto ($)</Label>
            <Input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Ej. 482000"
              inputMode="decimal"
            />
          </div>
          <div>
            <Label>Origen de fondos (opcional)</Label>
            <Select value={subaccountOrigin} onChange={(e) => setSubaccountOrigin(e.target.value)}>
              <option value="">Sin especificar</option>
              {subaccounts.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nombre} — {formatMoney(Number(s.saldo_disponible))}
                </option>
              ))}
            </Select>
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
        <p className="text-[11px] text-muted-foreground">
          Al usar la template se precargan el monto, el concepto y el origen. El destinatario
          (CBU/CVU/alias) lo elegis en ese momento.
        </p>
      </div>
    </FormDialog>
  );
}
