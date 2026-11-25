import { Suspense, useState } from "react";
import { BtnOutline, BtnPrimary } from "@/shared/ui/button";
import { PageHeader } from "@/shared/ui/page-header";
import { DEV_MODULES } from "../dev-modules";
import { LoadingLines } from "@/shared/ui/table-skeleton";

export function DevHubPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = DEV_MODULES.find((m) => m.id === selectedId);

  return (
    <main className="min-h-screen bg-background px-4 py-8 text-foreground">
      <div className="mx-auto max-w-5xl">
        <PageHeader title="Desarrollo" description="Documentación técnica de cada módulo" />
        <div className="mb-6 flex flex-wrap gap-2">
          {DEV_MODULES.map((m) => {
            const Btn = m.id === selectedId ? BtnPrimary : BtnOutline;
            return (
              <Btn key={m.id} onClick={() => setSelectedId(m.id)} title={m.description}>
                {m.label}
              </Btn>
            );
          })}
        </div>
        {selected ? (
          <Suspense fallback={<LoadingLines label="Cargando…" />}>
            <selected.Component />
          </Suspense>
        ) : (
          <p className="text-sm text-muted-foreground">Elegí un módulo para ver su información.</p>
        )}
      </div>
    </main>
  );
}
