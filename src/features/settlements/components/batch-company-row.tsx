import { formatARS } from "@/features/collections/collections.data";
import { Badge } from "@/shared/ui/badge";
import { type BatchCompany,type BreakdownBatch } from "@/features/settlements/settlements.types";
import { statusCompany } from "@/features/settlements/settlements.rules";

export function RowBatchCompany({
  l,
  abierto: open,
  ventas: sales,
  cargandoVentas: loadingSales,
  onToggle,
  onApertura: onBreakdown,
}: {
  l: BatchCompany;
  abierto: boolean;
  ventas: BreakdownBatch["ventas"] | null;
  cargandoVentas: boolean;
  onToggle: () => void;
  onApertura: () => void;
}) {
  return (
    <>
      <tr className="border-b">
        <td className="py-2 pr-3">{l.bandera}</td>
        <td className="py-2 pr-3 text-right font-mono">{l.cantidad_operaciones}</td>
        <td className="py-2 pr-3 text-right font-mono">{formatARS(l.bruto)}</td>
        <td
          className={`py-2 pr-3 text-right font-mono font-semibold ${Number(l.neto) < 0 ? "text-red-600" : ""}`}
        >
          {formatARS(l.neto)}
        </td>
        <td className="py-2 pr-3">
          <Badge tone={l.estado === "Acreditado" ? "success" : "warn"}>
            {statusCompany(l.estado)}
          </Badge>
          {(l.es_negativo || l.con_contracargo) && (
            <span className="ml-1">
              <Badge tone="danger">Contracargo</Badge>
            </span>
          )}
        </td>
        <td className="py-2 text-right whitespace-nowrap">
          <button
            type="button"
            className="text-xs text-primary hover:underline mr-3"
            onClick={onToggle}
          >
            {open ? "Ocultar ventas" : "Ver ventas"}
          </button>
          <button
            type="button"
            className="text-xs text-primary hover:underline"
            onClick={onBreakdown}
          >
            Ver liquidación
          </button>
        </td>
      </tr>
      {open && (
        <tr className="bg-muted/20">
          <td colSpan={6} className="px-3 py-2">
            {loadingSales ? (
              <p className="text-xs text-muted-foreground">Cargando ventas…</p>
            ) : !sales || sales.length === 0 ? (
              <p className="text-xs text-muted-foreground">Sin ventas vinculadas a este lote.</p>
            ) : (
              <table className="w-full text-xs">
                <tbody className="divide-y">
                  {sales.map((v) => (
                    <tr key={v.id_txn}>
                      <td className="py-1 pr-3">
                        {new Date(v.fecha).toLocaleString("es-AR", {
                          day: "2-digit",
                          month: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="py-1 pr-3 font-mono">{v.id_txn}</td>
                      <td className="py-1 pr-3">{v.cuotas} cuota(s)</td>
                      <td className="py-1 text-right font-mono">{formatARS(v.monto)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </td>
        </tr>
      )}
    </>
  );
}
