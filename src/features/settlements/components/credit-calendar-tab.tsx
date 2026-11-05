import { Modal } from "@/shared/ui/modal";
import { useBatchBreakdown,useBatchesByRange,useCreditCalendar } from "../settlements.hooks";
import { useMemo,useState } from "react";
import { ChevronLeft,ChevronRight,Loader2,Plus,X } from "lucide-react";
import { formatARS } from "@/features/collections/collections.data";
import { BtnPrimary } from "@/shared/ui/button";
import { type BatchCompany,type Ticket } from "@/features/settlements/settlements.types";
import { DAYS_SEMANA_CAL,MONTHS_CAL,isoLocal } from "@/features/settlements/settlements.rules";
import { RowBatchCompany } from "./batch-company-row";
import { BreakdownBatchModal } from "./batch-breakdown-modal";

/**
 * Calendario de acreditaciones de la empresa (9.2): por dia habil, cuanto
 * esta Programado y cuanto se Acredito. Pendiente y Vencida son estados
 * internos del backoffice: la empresa los ve como Programada.
 */
export function CalendarioCreditsTab({
  loading: parentLoading,
  onSelectDate,
  onOpenGeneral,
}: {
  comercioId: string | null;
  loading: boolean;
  faltaCobrar: number;
  porAcreditar: number;
  adelantosEnCurso: number;
  disponible: number;
  tickets: Ticket[];
  onSelectDate: (date: string) => void;
  onClearSelection: () => void;
  onOpenGeneral: () => void;
  onOpenDetalle: (t: Ticket) => void;
}) {
  const today = new Date();
  const [month, setMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [day, setDay] = useState<string | null>(null);
  const [brand, setBrand] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const [breakdown, setBreakdown] = useState<string | null>(null);

  const from = isoLocal(month);
  const to = isoLocal(new Date(month.getFullYear(), month.getMonth() + 1, 0));
  const q = useCreditCalendar(from, to);
  const byDate = useMemo(() => new Map((q.data ?? []).map((d) => [d.fecha, d])), [q.data]);
  const totMonth = (q.data ?? []).reduce(
    (a, d) => ({ prog: a.prog + Number(d.programado), acr: a.acr + Number(d.acreditado) }),
    { prog: 0, acr: 0 },
  );

  const batchesDay = useBatchesByRange(day, day);
  const salesBatch = useBatchBreakdown(open);

  const celdas = useMemo(() => {
    const offset = (new Date(month.getFullYear(), month.getMonth(), 1).getDay() + 6) % 7;
    const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    const out: (string | null)[] = Array(offset).fill(null);
    for (let i = 1; i <= days; i++)
      out.push(isoLocal(new Date(month.getFullYear(), month.getMonth(), i)));
    while (out.length % 7) out.push(null);
    return out;
  }, [month]);

  const batches = (batchesDay.data ?? []).filter((l) => !brand || l.bandera === brand);
  const brandsDay = Array.from(new Set((batchesDay.data ?? []).map((l) => l.bandera))).sort();
  const progDay = batches.filter((l) => l.estado !== "Acreditado");
  const acrDay = batches.filter((l) => l.estado === "Acreditado");
  const sum = (ls: BatchCompany[]) => ls.reduce((a, l) => a + Number(l.neto), 0);
  const todayIso = isoLocal(today);

  return (
    <div className="p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="h-9 w-9 inline-flex items-center justify-center rounded-md border border-black-100 bg-white text-black-600 shadow-sm hover:bg-plata-200"
            onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}
            aria-label="Mes anterior"
          >
            <ChevronLeft size={18} strokeWidth={2.5} />
          </button>
          <div className="min-w-[160px] text-center font-semibold">
            {MONTHS_CAL[month.getMonth()]} {month.getFullYear()}
          </div>
          <button
            type="button"
            className="h-9 w-9 inline-flex items-center justify-center rounded-md border border-black-100 bg-white text-black-600 shadow-sm hover:bg-plata-200"
            onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}
            aria-label="Mes siguiente"
          >
            <ChevronRight size={18} strokeWidth={2.5} />
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-xs">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-amber-400" /> Programado del mes:{" "}
            <b className="font-mono">{formatARS(totMonth.prog)}</b>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Acreditado del mes:{" "}
            <b className="font-mono">{formatARS(totMonth.acr)}</b>
          </span>
          <BtnPrimary className="h-9 px-3 text-xs" onClick={onOpenGeneral}>
            <Plus size={14} /> Solicitar adelanto
          </BtnPrimary>
        </div>
      </div>

      {q.isLoading || parentLoading ? (
        <div className="py-10 text-center text-sm text-muted-foreground">
          <Loader2 size={16} className="inline animate-spin mr-2" /> Cargando calendario…
        </div>
      ) : q.isError ? (
        <div className="py-10 text-center text-sm text-red-700">{(q.error as Error).message}</div>
      ) : (
        <div>
          <div className="grid grid-cols-7 gap-1 text-[11px] text-muted-foreground mb-1">
            {DAYS_SEMANA_CAL.map((d) => (
              <div key={d} className="px-1 font-semibold">
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {celdas.map((f, i) => {
              if (!f) return <div key={`v${i}`} />;
              const d = byDate.get(f);
              const noHabil = d?.no_habil ?? [0, 6].includes(new Date(`${f}T12:00:00`).getDay());
              const prog = Number(d?.programado ?? 0);
              const acr = Number(d?.acreditado ?? 0);
              return (
                <button
                  key={f}
                  type="button"
                  onClick={() => {
                    setDay(f);
                    setBrand("");
                    setOpen(null);
                  }}
                  className={`min-h-[78px] rounded-md border p-1.5 text-left text-[11px] transition ${noHabil ? "bg-muted/50" : "bg-card hover:bg-muted/30"}`}
                >
                  <div
                    className={`font-semibold ${f === todayIso ? "text-primary" : "text-muted-foreground"}`}
                  >
                    {Number(f.slice(8))}
                  </div>
                  {prog !== 0 && (
                    <div className="flex items-center gap-1 mt-0.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                      <span className="font-mono">{formatARS(prog)}</span>
                    </div>
                  )}
                  {acr !== 0 && (
                    <div className="flex items-center gap-1 mt-0.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      <span className="font-mono">{formatARS(acr)}</span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
          <p className="text-[11px] text-muted-foreground mt-2">
            Los sábados, domingos y feriados aparecen sombreados: los plazos de Payway son en días
            hábiles.
          </p>
        </div>
      )}

      {day && (
        <Modal open onClose={() => setDay(null)} size="custom" className="max-w-3xl">
          <div className="min-h-0 flex-1 overflow-y-auto">
            <div className="sticky top-0 bg-card px-6 py-4 border-b flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  Acreditaciones del día
                </div>
                <div className="font-semibold capitalize">
                  {new Date(`${day}T12:00:00`).toLocaleDateString("es-AR", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                  })}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {brandsDay.length > 1 && (
                  <select
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    className="h-9 rounded-md border bg-card px-2 text-sm"
                  >
                    <option value="">Todas las banderas</option>
                    {brandsDay.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                )}
                <button onClick={() => setDay(null)} className="p-1 hover:bg-muted rounded">
                  <X size={16} />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              {batchesDay.isLoading ? (
                <p className="text-sm text-muted-foreground">Cargando…</p>
              ) : batches.length === 0 ? (
                <div className="rounded-lg border border-dashed py-10 text-center text-sm text-muted-foreground">
                  Sin acreditaciones este día.
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-lg border-2 border-amber-200 bg-amber-50/50 p-4">
                      <div className="flex items-center gap-1.5 text-sm font-semibold">
                        <span className="h-2.5 w-2.5 rounded-full bg-amber-400" /> Programado
                      </div>
                      <div className="font-mono text-xl font-bold mt-1 text-amber-700">
                        {formatARS(sum(progDay))}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {progDay.length} lote(s) · todavía no es saldo
                      </div>
                    </div>
                    <div className="rounded-lg border-2 border-emerald-200 bg-emerald-50/50 p-4">
                      <div className="flex items-center gap-1.5 text-sm font-semibold">
                        <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Acreditado
                      </div>
                      <div className="font-mono text-xl font-bold mt-1 text-emerald-700">
                        {formatARS(sum(acrDay))}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {acrDay.length} lote(s) · ya está en tu cuenta
                      </div>
                    </div>
                  </div>
                  <table className="w-full text-sm">
                    <thead className="text-xs text-muted-foreground">
                      <tr className="text-left border-b">
                        <th className="py-1.5 pr-3">Bandera</th>
                        <th className="py-1.5 pr-3 text-right">Ops</th>
                        <th className="py-1.5 pr-3 text-right">Bruto</th>
                        <th className="py-1.5 pr-3 text-right">Neto</th>
                        <th className="py-1.5 pr-3">Estado</th>
                        <th className="py-1.5" />
                      </tr>
                    </thead>
                    <tbody>
                      {batches.map((l) => (
                        <RowBatchCompany
                          key={l.id}
                          l={l}
                          abierto={open === l.id}
                          ventas={open === l.id ? (salesBatch.data?.ventas ?? null) : null}
                          cargandoVentas={open === l.id && salesBatch.isLoading}
                          onToggle={() => setOpen(open === l.id ? null : l.id)}
                          onApertura={() => setBreakdown(l.id)}
                        />
                      ))}
                    </tbody>
                  </table>
                  {progDay.length > 0 && day >= todayIso && (
                    <div className="flex items-center justify-between gap-3 rounded-lg border bg-muted/30 px-4 py-3">
                      <span className="text-sm text-muted-foreground">
                        ¿Necesitás cobrar antes? Pedí un adelanto sobre lo programado.
                      </span>
                      <BtnPrimary
                        className="h-9 px-3 text-xs"
                        onClick={() => {
                          setDay(null);
                          onSelectDate(day);
                        }}
                      >
                        <Plus size={14} /> Solicitar adelanto
                      </BtnPrimary>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </Modal>
      )}
      <BreakdownBatchModal loteId={breakdown} onClose={() => setBreakdown(null)} />
    </div>
  );
}
