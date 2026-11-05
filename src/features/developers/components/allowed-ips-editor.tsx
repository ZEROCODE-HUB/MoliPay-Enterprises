import { useState } from "react";
import { toast } from "sonner";
import { userMessage } from "@/shared/lib/errors";
import { BtnOutline } from "@/shared/ui/button";
import { useDeveloperActions } from "../developers.hooks";
import { parseIpList } from "../developers.rules";

/** Lista de IPs autorizadas, plegable. El texto arranca con lo guardado cada vez que se abre. */
export function AllowedIpsEditor({ ips }: { ips: string[] }) {
  const { saveAllowedIps } = useDeveloperActions();
  const [text, setText] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const open = text !== null;

  const save = async () => {
    if (text === null) return;
    setSaving(true);
    try {
      await saveAllowedIps(parseIpList(text));
      toast.success("IPs guardadas");
      setText(null);
    } catch (e) {
      toast.error(userMessage(e, "No se pudieron guardar las IPs."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mt-4 border-t pt-3">
      <button
        type="button"
        className="text-xs font-semibold text-primary"
        onClick={() => setText(open ? null : ips.join("\n"))}
      >
        IPs autorizadas: {ips.length ? ips.join(", ") : "cualquier IP"} ·{" "}
        {open ? "cerrar" : "editar"}
      </button>
      {open && (
        <div className="mt-2 space-y-2">
          <textarea
            className="min-h-[80px] w-full rounded-md border bg-background px-3 py-2 font-mono text-xs"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={"Vacío = cualquier IP\n203.0.113.10\n198.51.100.0/24"}
          />
          <BtnOutline className="h-8 px-3 text-xs" onClick={() => void save()} disabled={saving}>
            {saving ? "Guardando…" : "Guardar IPs"}
          </BtnOutline>
        </div>
      )}
    </div>
  );
}
