import { loadLinksDashboard } from "@/features/payment-links/payment-links.supabase";
import { toast } from "sonner";
import { userMessage } from "@/shared/lib/errors";
import { useCurrentCustomer } from "@/features/session/session.hooks";
import { useState,useMemo,useEffect } from "react";
import {
PieChart,
Pie,
Cell,
BarChart,
Bar,
XAxis,
YAxis,
CartesianGrid,
Tooltip,
ResponsiveContainer,
} from "recharts";
import { Download,FileSpreadsheet } from "lucide-react";
import { Card } from "@/shared/ui/card";
import { BtnOutline } from "@/shared/ui/button";
import { PageHeader } from "@/shared/ui/page-header";
import { formatARS } from "@/features/payment-links/payment-links.data";
import jsPDF from "jspdf";
import "jspdf-autotable";
import { downloadXlsx } from "@/shared/lib/download";

const presets = [
  { label: "Hoy", days: 0 },
  { label: "15 dias", days: 15 },
  { label: "30 dias", days: 30 },
  { label: "60 dias", days: 60 },
  { label: "90 dias", days: 90 },
];

const COLORS: Record<string, string> = {
  Aprobado: "#22c55e",
  Pendiente: "#f59e0b",
  Rechazado: "#ef4444",
  Reembolsado: "#a855f7",
};
const METHOD_COLORS = [
  "#2563eb",
  "#7c3aed",
  "#059669",
  "#dc2626",
  "#d97706",
  "#0891b2",
  "#4f46e5",
  "#9333ea",
  "#16a34a",
  "#ca8a04",
];

export function PaymentLinksDashboardPage() {
  const customer = useCurrentCustomer();
  const [days, setDays] = useState(30);
  const [movs, setMovs] = useState<any[]>([]);
  const [links, setLinks] = useState<any[]>([]);

  useEffect(() => {
    const lg = customer.data?.legajo;
    if (!lg) return;
    let cancelled = false;
    void loadLinksDashboard(lg, days)
      .then((r) => {
        if (cancelled) return;
        setMovs(r.movs);
        setLinks(r.links);
      })
      .catch((e) => toast.error(userMessage(e, "No se pudo cargar el resumen de links.")));
    return () => {
      cancelled = true;
    };
  }, [days, customer.data?.legajo]);

  const metrics = useMemo(() => {
    const total = movs.length;
    const approveds = movs.filter((x) => x.estado === "Aprobado");
    const totalApproved = approveds.reduce((a, x) => a + x.monto, 0);
    const pending = movs.filter((x) => x.estado === "Pendiente").length;
    const rejected = movs.filter((x) => x.estado === "Rechazado").length;
    const refunds = movs.filter((x) => x.estado === "Reembolsado").length;
    return {
      totalApproved,
      totalTx: total,
      pending,
      rejected,
      refunds,
      conversionRate: total > 0 ? Math.round((approveds.length / total) * 100) : 0,
      avgTicket: approveds.length > 0 ? Math.round(totalApproved / approveds.length) : 0,
    };
  }, [movs]);

  const statusData = [
    { name: "Aprobado", value: movs.filter((x) => x.estado === "Aprobado").length },
    { name: "Pendiente", value: metrics.pending },
    { name: "Rechazado", value: metrics.rejected },
    { name: "Reembolsado", value: metrics.refunds },
  ];

  const linkData = links.map((l: any) => ({
    name: (l.url ?? "").split("/").pop() || String(l.id).slice(0, 8).toUpperCase(),
    amount: Number(l.monto ?? 0),
  }));
  const volData = linkData.map((d) => ({ ...d, vol: +(d.amount / 1_000_000).toFixed(1) }));

  const kpis = [
    { label: "Total aprobado", value: formatARS(metrics.totalApproved) },
    { label: "Transacciones totales", value: metrics.totalTx.toString() },
    { label: "Pendientes", value: metrics.pending.toString() },
    { label: "Rechazadas", value: metrics.rejected.toString() },
    { label: "Reembolsos", value: metrics.refunds.toString() },
    { label: "Tasa de conversion", value: metrics.conversionRate + "%" },
    { label: "Ticket promedio", value: formatARS(metrics.avgTicket) },
  ];

  const label = presets.find((p) => p.days === days)?.label ?? `${days} dias`;

  const exportExcel = () => {
    downloadXlsx(
      "links-pago-dashboard-" + label + ".xlsx",
      [
        { Metrica: "Total aprobado", Valor: formatARS(metrics.totalApproved) },
        { Metrica: "Transacciones totales", Valor: metrics.totalTx },
        { Metrica: "Pendientes", Valor: metrics.pending },
        { Metrica: "Rechazadas", Valor: metrics.rejected },
        { Metrica: "Reembolsos", Valor: metrics.refunds },
        { Metrica: "Tasa de conversion", Valor: metrics.conversionRate + "%" },
        { Metrica: "Ticket promedio", Valor: formatARS(metrics.avgTicket) },
        ...linkData.map((d) => ({ Metrica: "Monto " + d.name, Valor: formatARS(d.amount) })),
      ],
      { sheetName: "PaymentLinksDashboardPage" },
    );
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.text("PaymentLinksDashboardPage - Links de Pago", 14, 20);
    doc.text("Periodo: " + label, 14, 30);
    const body = kpis.map((k) => [k.label, k.value]);
    (doc as any).autoTable({ startY: 38, head: [["Metrica", "Valor"]], body });
    doc.save("links-pago-dashboard-" + label + ".pdf");
  };

  return (
    <div>
      <PageHeader
        title="Links de Pago"
        description="Genera y administra links de cobro, productos e integraciones con tu tienda."
      />
      <div className="flex flex-wrap gap-2 mb-6">
        {presets.map((p) => (
          <button
            key={p.days}
            onClick={() => setDays(p.days)}
            className={
              "px-4 py-2 rounded-lg text-xs font-semibold border transition " +
              (days === p.days
                ? "bg-[color:var(--brand-soft)] text-[color:var(--brand-dark)] border-transparent"
                : "bg-card hover:bg-muted")
            }
          >
            {p.label}
          </button>
        ))}
        <div className="flex-1" />
        <BtnOutline className="h-9 px-3 text-xs" onClick={exportExcel}>
          <FileSpreadsheet size={14} /> Excel
        </BtnOutline>
        <BtnOutline className="h-9 px-3 text-xs" onClick={exportPDF}>
          <Download size={14} /> PDF
        </BtnOutline>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3 mb-6">
        {kpis.map((k) => (
          <div key={k.label} className="bg-card border rounded-lg p-3">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
              {k.label}
            </div>
            <div className="font-display tabular-nums text-sm md:text-base font-semibold mt-0.5">
              {k.value}
            </div>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6 mb-6">
        <Card>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
            Estado de transacciones
          </h4>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={statusData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={80}
                label={({ name, value }: any) => name + " " + value}
              >
                {statusData.map((e) => (
                  <Cell key={e.name} fill={COLORS[e.name] || "#666"} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
            Montos por link de pago
          </h4>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={linkData}
                dataKey="amount"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={80}
                label={({ name }: any) => name}
              >
                {linkData.map((_, i) => (
                  <Cell key={i} fill={METHOD_COLORS[i % METHOD_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(v: number) => formatARS(v)} />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        <Card className="md:col-span-2 xl:col-span-1">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
            Volumen por link (millones ARS)
          </h4>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={volData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip formatter={(v: number) => v + "M"} />
              <Bar dataKey="vol" radius={[4, 4, 0, 0]}>
                {volData.map((_, i) => (
                  <Cell key={i} fill={METHOD_COLORS[i % METHOD_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  );
}
