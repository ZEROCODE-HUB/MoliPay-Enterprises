import { Copy } from "lucide-react";
import { toast } from "sonner";
import { Label } from "@/shared/ui/form-controls";

function copyToClipboard(value: string) {
  void navigator.clipboard.writeText(value).then(
    () => toast.success("Copiado"),
    () => toast.error("No se pudo copiar"),
  );
}

/** Valor de solo lectura con boton de copiar (`masked`: se muestra enmascarado y sin copiar). */
export function CopyableField({
  label,
  value,
  masked = false,
}: {
  label: string;
  value: string;
  masked?: boolean;
}) {
  return (
    <div>
      <Label>{label}</Label>
      <div className="flex items-center gap-2 rounded-md border bg-muted p-2">
        <code className="flex-1 truncate text-xs">{value}</code>
        {!masked && (
          <button
            type="button"
            className="p-1 hover:opacity-70"
            onClick={() => copyToClipboard(value)}
            aria-label={`Copiar ${label}`}
          >
            <Copy size={14} />
          </button>
        )}
      </div>
    </div>
  );
}
