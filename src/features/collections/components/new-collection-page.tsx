import { BatchParametersStep } from "./batch-parameters-step";
import { BatchFileStep } from "./batch-file-step";
import { BatchSummaryStep } from "./batch-summary-step";
import { useNewCollectionPage } from "./use-new-collection-page";
import { ArrowLeft,Check } from "lucide-react";

export function NewCollectionPage() {
  const vm = useNewCollectionPage();
  const { navigate, step } = vm;

  return (
    <div className="max-w-4xl">
      <button
        type="button"
        onClick={() => navigate({ to: "/app/cobros/gestion" })}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground mb-4"
      >
        <ArrowLeft size={14} /> Volver a Gestión de lotes
      </button>
      {/* Steps indicator */}
      <div className="flex items-center gap-2 mb-8">
        {["Parametros generales", "Carga de CSV", "Confirmacion"].map((label, i) => (
          <div key={label} className="flex items-center gap-2">
            <div
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition ${
                i === step
                  ? "bg-primary text-primary-foreground"
                  : i < step
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-muted text-muted-foreground"
              }`}
            >
              {i < step ? <Check size={12} /> : <span>{i + 1}</span>}
              {label}
            </div>
            {i < 2 && <div className="w-6 h-px bg-border" />}
          </div>
        ))}
      </div>

      {/* Paso 1: Parametros generales */}
      <BatchParametersStep {...vm} />

      {/* Paso 2: Carga de CSV */}
      <BatchFileStep {...vm} />

      {/* Paso 3: Confirmacion */}
      <BatchSummaryStep {...vm} />
    </div>
  );
}
