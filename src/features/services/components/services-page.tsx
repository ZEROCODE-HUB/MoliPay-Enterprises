import { UpcomingPaymentsSection } from "./upcoming-payments-section";
import { SubscribedServicesSection } from "./subscribed-services-section";
import { AvailableServicesSection } from "./available-services-section";
import { ServicesHistorySection } from "./services-history-section";
import { RemittancesTab } from "./remittances-tab";
import { RemittanceModal } from "./remittance-modal";
import { useServicesPage } from "./use-services-page";
import { toast } from "sonner";
import { PageHeader } from "@/shared/ui/page-header";
import { formatARS } from "@/features/collections/collections.data";
import { Input,Label,Select } from "@/shared/ui/form-controls";
import { FormDialog } from "@/shared/ui/form-dialog";
import { type SectionTab,type Tab } from "@/features/services/services.types";
import { cats } from "@/features/services/services.rules";
import { BarcodeScanModal } from "./barcode-scan-modal";

export function ServicesPage() {
  const vm = useServicesPage();
  const {
    pay,
    setPay,
    tab,
    setTab,
    sectionTab,
    setSectionTab,
    editService,
    setEditService,
    setNumberNew,
    scanOpen,
    setScanOpen,
    prox,
    suscritos,
    availables,
    totalAdheridos,
    totalPayMonth,
    totalOverdues,
    hFiltrados,
  } = vm;

  return (
    <>
      <PageHeader
        title="Servicios y pagos"
        description="Pago de servicios, remesas internacionales e historial de operaciones."
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="bg-card border rounded-lg p-3">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Servicios adheridos
          </div>
          <div className="font-display tabular-nums text-base md:text-lg font-semibold mt-0.5">
            {totalAdheridos}
          </div>
        </div>
        <div className="bg-card border rounded-lg p-3">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
            A pagar este mes
          </div>
          <div className="font-display tabular-nums text-base md:text-lg font-semibold mt-0.5">
            {formatARS(totalPayMonth)}
          </div>
          <div className="text-[10px] text-muted-foreground mt-0.5">{prox.length} factura(s)</div>
        </div>
        <div className="bg-card border rounded-lg p-3">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Vencidos</div>
          <div className="font-display tabular-nums text-base md:text-lg font-semibold mt-0.5">
            {totalOverdues}
          </div>
        </div>
        <div className="bg-card border rounded-lg p-3">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Disponibles para suscribir
          </div>
          <div className="font-display tabular-nums text-base md:text-lg font-semibold mt-0.5">
            {availables.length}
          </div>
        </div>
      </div>

      <div className="flex gap-1 mb-6 border-b">
        {(
          [
            ["servicios", "Servicios"],
            ["remesas", "Remesas y crossborder"],
          ] as Array<[Tab, string]>
        ).map(([k, l]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition ${
              tab === k
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {l}
          </button>
        ))}
      </div>

      {tab === "servicios" && (
        <>
          <div className="flex gap-1 mb-5 bg-muted/50 p-1 rounded-lg">
            {(
              [
                ["proximos", `Proximos pagos (${prox.length})`],
                ["suscritos", `Suscritos (${suscritos.length})`],
                ["disponibles", `Disponibles (${availables.length})`],
                ["historial", `Historial (${hFiltrados.length})`],
              ] as Array<[SectionTab, string]>
            ).map(([k, l]) => (
              <button
                key={k}
                onClick={() => setSectionTab(k)}
                className={`flex-1 px-3 py-2 text-sm font-semibold rounded-md transition ${
                  sectionTab === k
                    ? "bg-card shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {l}
              </button>
            ))}
          </div>

          <UpcomingPaymentsSection {...vm} />

          <SubscribedServicesSection {...vm} />

          <AvailableServicesSection {...vm} />

          <ServicesHistorySection {...vm} />
        </>
      )}

      <RemittancesTab {...vm} />

      <FormDialog
        open={editService !== null}
        onClose={() => setEditService(null)}
        title={editService ? `Editar ${editService.n}` : "Editar servicio"}
        description="Modifica la configuracion del servicio."
        submitLabel="Guardar cambios"
        onSubmit={() => {
          setEditService(null);
          toast.success("Servicio actualizado");
        }}
      >
        {editService && (
          <>
            <div>
              <Label>Numero de cuenta / referencia</Label>
              <Input defaultValue={editService.c} />
            </div>
            <div>
              <Label>Categoria</Label>
              <Select defaultValue={editService.cat}>
                {cats
                  .filter((c) => c !== "Todos")
                  .map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
              </Select>
            </div>
          </>
        )}
      </FormDialog>

      <FormDialog
        open={pay !== null}
        onClose={() => setPay(null)}
        title={pay ? `Pagar ${pay.n}` : "Pagar servicio"}
        description={pay ? `${pay.c} · Vence ${pay.venc}` : undefined}
        submitLabel="Confirmar pago"
        onSubmit={() => {
          const s = pay;
          setPay(null);
          if (s) toast.success(`Pago de ${s.n} confirmado por ${s.v}`);
        }}
      >
        <div className="p-4 rounded-md bg-muted">
          <div className="text-xs text-muted-foreground">Total a pagar</div>
          <div className="font-display tabular-nums text-2xl font-semibold mt-0.5">{pay?.v}</div>
        </div>
        <div>
          <Label>Subcuenta de origen</Label>
          <Select>
            <option>Operaciones — $ 6.389.830,55</option>
            <option>Sucursal Centro — $ 4.220.000,00</option>
            <option>Sucursal Norte — $ 1.870.500,00</option>
          </Select>
        </div>
        <div>
          <Label>Fecha de pago</Label>
          <Input type="date" />
        </div>
      </FormDialog>

      <RemittanceModal {...vm} />

      <BarcodeScanModal
        open={scanOpen}
        onClose={() => setScanOpen(false)}
        onDetect={(code) => setNumberNew(code)}
      />
    </>
  );
}
