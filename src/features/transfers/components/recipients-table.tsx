import { Send,Search,Star,Trash2,Tag } from "lucide-react";
import { Card } from "@/shared/ui/card";
import { BtnOutline } from "@/shared/ui/button";
import { Input,Select } from "@/shared/ui/form-controls";
import { Badge } from "@/shared/ui/badge";
import { categories } from "@/features/transfers/recipients.rules";
import type { RecipientsPageVm } from "./use-recipients-page";

export function RecipientsTable({
  items,
  loading,
  setTransfer,
  setAmount,
  setConcept,
  setRemove,
}: Pick<
  RecipientsPageVm,
  "items" | "loading" | "setTransfer" | "setAmount" | "setConcept" | "setRemove"
>) {
  return (
    <div className="grid lg:grid-cols-[220px_1fr] gap-6">
      <Card className="h-fit">
        <div className="text-xs uppercase tracking-wide text-muted-foreground mb-3">Categorias</div>
        <div className="space-y-1">
          {categories.map((c) => (
            <button
              key={c.n}
              className={`w-full flex justify-between px-3 py-2 rounded-md text-sm ${
                c.active
                  ? "bg-[color:var(--brand-soft)] text-[color:var(--brand-dark)] font-semibold"
                  : "hover:bg-muted"
              }`}
            >
              <span className="flex items-center gap-2">
                <Tag size={12} /> {c.n}
              </span>
              <span className="text-xs text-muted-foreground">{c.c}</span>
            </button>
          ))}
        </div>
      </Card>

      <Card className="p-0 overflow-hidden">
        <div className="p-4 border-b flex flex-wrap gap-2 items-center">
          <div className="relative w-full sm:flex-1 sm:min-w-[240px]">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <Input placeholder="Buscar por nombre, alias o CBU..." className="pl-9" />
          </div>
          <Select>
            <option>Ordenar: mas usados</option>
            <option>Alfabetico</option>
            <option>Recientes</option>
          </Select>
        </div>

        <div className="hidden md:grid grid-cols-[auto_1.2fr_1fr_1.4fr_0.8fr_0.8fr_auto] gap-4 px-5 py-3 border-b text-xs uppercase tracking-wide text-muted-foreground">
          <div></div>
          <div>Nombre</div>
          <div>Alias</div>
          <div>CBU</div>
          <div>Categoria</div>
          <div>Ops</div>
          <div></div>
        </div>
        {items.length === 0 && !loading && (
          <div className="px-5 py-10 text-center text-sm text-muted-foreground">
            Todavía no guardaste destinatarios. Cargá uno con "Nuevo destinatario".
          </div>
        )}
        {loading && (
          <div className="px-5 py-10 text-center text-sm text-muted-foreground">
            Cargando agenda…
          </div>
        )}
        {items.map((d) => (
          <div
            key={d.id || d.n}
            className="md:grid md:grid-cols-[auto_1.2fr_1fr_1.4fr_0.8fr_0.8fr_auto] gap-4 px-5 py-4 border-b last:border-0 items-center"
          >
            <Star
              size={14}
              className={d.fav ? "fill-amber-400 text-amber-400" : "text-muted-foreground"}
            />
            <div>
              <div className="font-semibold">{d.n}</div>
              <div className="text-xs text-muted-foreground md:hidden">
                @{d.a} · {d.b}
              </div>
            </div>
            <div className="text-sm text-muted-foreground hidden md:block">
              {d.a ? `@${d.a}` : "—"}
            </div>
            <div className="text-sm font-mono text-muted-foreground hidden md:block">{d.cbu}</div>
            <div className="hidden md:block">
              <Badge tone="neutral">{d.cat}</Badge>
            </div>
            <div className="text-sm text-muted-foreground hidden md:block">
              {d.ops ? `${d.ops} · ${d.ult}` : d.ult || "—"}
            </div>
            <div className="flex gap-1 mt-2 md:mt-0 justify-end">
              <BtnOutline
                className="h-9 px-3"
                onClick={() => {
                  setTransfer(d);
                  setAmount("");
                  setConcept("");
                }}
              >
                <Send size={14} /> Transferir
              </BtnOutline>
              <button
                className="h-9 w-9 inline-flex items-center justify-center rounded-md border bg-card hover:bg-red-50 text-muted-foreground hover:text-red-600"
                title="Eliminar de la agenda"
                onClick={() => setRemove(d)}
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </Card>
    </div>
  );
}
