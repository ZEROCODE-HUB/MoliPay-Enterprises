import { Fragment, useState } from "react";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";

async function copyText(text: string): Promise<boolean> {
  try {
    if (!navigator.clipboard) return false;
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      aria-label={copied ? "Copiado" : "Copiar"}
      onClick={() =>
        void copyText(text).then((ok) => {
          if (!ok) {
            toast.error("No se pudo copiar. Seleccioná el texto y copialo a mano.");
            return;
          }
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        })
      }
      className="rounded p-1.5 text-slate-400 transition hover:bg-white/10 hover:text-slate-100"
    >
      {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
    </button>
  );
}

/** Bloque de codigo oscuro con pestañas opcionales (cURL / Node.js…) y boton de copiar. */
export function CodeBlock({
  tabs,
  label,
}: {
  tabs: { label: string; code: string }[];
  /** Titulo cuando hay una sola pestaña (p. ej. "Respuesta 200"). */
  label?: string;
}) {
  const [active, setActive] = useState(0);
  const current = tabs[Math.min(active, tabs.length - 1)]!;
  return (
    <div className="overflow-hidden rounded-lg border border-slate-800 bg-[#0B1437]">
      <div className="flex items-center justify-between gap-2 border-b border-white/10 px-2 py-1">
        <div className="flex min-w-0 gap-1 overflow-x-auto" role="tablist">
          {tabs.length > 1 ? (
            tabs.map((t, i) => (
              <button
                key={t.label}
                type="button"
                role="tab"
                aria-selected={i === active}
                onClick={() => setActive(i)}
                className={`whitespace-nowrap rounded px-2 py-1 text-[11px] font-medium transition ${
                  i === active ? "bg-white/10 text-white" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {t.label}
              </button>
            ))
          ) : (
            <span className="px-2 py-1 text-[11px] font-medium text-slate-400">
              {label ?? current.label}
            </span>
          )}
        </div>
        <CopyButton text={current.code} />
      </div>
      <pre className="max-h-[420px] overflow-auto p-3 font-mono text-[12px] leading-relaxed text-slate-100">
        {current.code}
      </pre>
    </div>
  );
}

/** Texto con `codigo` entre comillas invertidas. */
export function RichText({ text }: { text: string }) {
  return (
    <>
      {text.split("`").map((part, i) =>
        i % 2 === 1 ? (
          <code key={i} className="rounded bg-muted px-1 py-0.5 font-mono text-[0.85em]">
            {part}
          </code>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        ),
      )}
    </>
  );
}
