import { Pagination } from "@/shared/ui/pagination";
import { useMemo,useState,useEffect } from "react";
import { Search,Store } from "lucide-react";
import { PageHeader } from "@/shared/ui/page-header";
import { Card } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { Input,Select } from "@/shared/ui/form-controls";
import { useMyMerchants } from "../merchants.hooks";
import type { Merchant } from "../merchants.types";

const statusTone = (status: string): "neutral" | "success" | "warn" | "danger" => {
  const e = status.toLowerCase();
  if (e.includes("activ") || e.includes("activo") || e.includes("aprob")) return "success";
  if (
    e.includes("desactiv") ||
    e.includes("rechaz") ||
    e.includes("elimin") ||
    e.includes("cancel")
  )
    return "danger";
  if (e.includes("pendiente") || e.includes("suspend")) return "warn";
  return "neutral";
};

export function MerchantsPage() {
  const merchantsQuery = useMyMerchants();
  const merchants = useMemo<Merchant[]>(() => merchantsQuery.data ?? [], [merchantsQuery.data]);
  const loading = merchantsQuery.isLoading;
  const [q, setQ] = useState("");
  const [level, setLevel] = useState("Todos");
  const [status, setStatus] = useState("Todos");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const levels = useMemo(
    () => Array.from(new Set(merchants.map((c) => c.level).filter(Boolean))).sort(),
    [merchants],
  );
  const statuses = useMemo(
    () => Array.from(new Set(merchants.map((c) => c.status).filter(Boolean))).sort(),
    [merchants],
  );

  const filtradas = useMemo(
    () =>
      merchants.filter(
        (c) =>
          (q === "" ||
            c.name.toLowerCase().includes(q.toLowerCase()) ||
            c.legajo.toLowerCase().includes(q.toLowerCase()) ||
            c.user.toLowerCase().includes(q.toLowerCase())) &&
          (level === "Todos" || c.level === level) &&
          (status === "Todos" || c.status === status),
      ),
    [merchants, q, level, status],
  );

  const totalPages = Math.max(1, Math.ceil(filtradas.length / pageSize));
  const paginated = filtradas.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => {
    setPage(1);
  }, [q, level, status]);

  const actives = merchants.filter((c) => statusTone(c.status) === "success").length;

  return (
    <>
      <PageHeader
        title="Mis comercios"
        description="Los comercios asociados a tu cuenta."
        action={
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <div className="bg-white border border-black-100 rounded-md px-4 py-2 flex items-center gap-2">
              <Store size={14} className="text-moli-orange" />
              <span className="font-semibold text-black-700">{merchants.length}</span> comercios
            </div>
            <div className="bg-white border border-black-100 rounded-md px-4 py-2 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-success inline-block" />
              <span className="font-semibold text-black-700">{actives}</span> activos
            </div>
          </div>
        }
      />

      <Card className="mb-4 p-3">
        <div className="flex flex-wrap gap-2">
          <div className="relative w-full sm:flex-1 sm:min-w-[220px]">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por nombre, legajo o email..."
              className="pl-9"
            />
          </div>
          <Select value={level} onChange={(e) => setLevel(e.target.value)}>
            <option>Todos</option>
            {levels.map((n) => (
              <option key={n}>{n}</option>
            ))}
          </Select>
          <Select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option>Todos</option>
            {statuses.map((e) => (
              <option key={e}>{e}</option>
            ))}
          </Select>
        </div>
      </Card>

      {loading ? (
        <Card className="p-6 text-sm text-muted-foreground">Cargando comercios…</Card>
      ) : (
        <Card className="p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[11px] uppercase tracking-wide text-muted-foreground border-b bg-muted/30">
                  <th className="text-left px-4 py-2.5">Comercio</th>
                  <th className="text-left px-4 py-2.5">Legajo</th>
                  <th className="text-left px-4 py-2.5">Nivel</th>
                  <th className="text-left px-4 py-2.5">Estado</th>
                  <th className="text-left px-4 py-2.5">Email de usuario</th>
                  <th className="text-left px-4 py-2.5">Creado</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((c) => (
                  <tr key={c.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="h-8 w-8 shrink-0 rounded-full inline-flex items-center justify-center bg-moli-orange/10 text-moli-orange">
                          <Store size={15} />
                        </span>
                        <span className="font-semibold">{c.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                      {c.legajo}
                    </td>
                    <td className="px-4 py-3">{c.level}</td>
                    <td className="px-4 py-3">
                      <Badge tone={statusTone(c.status)}>{c.status}</Badge>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{c.user}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{c.createdAt}</td>
                  </tr>
                ))}
                {paginated.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-sm text-muted-foreground">
                      No hay comercios para mostrar.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <Pagination
            className="border-t px-4 py-3"
            page={page}
            pageSize={pageSize}
            total={filtradas.length}
            onPageChange={setPage}
          />
        </Card>
      )}
    </>
  );
}
