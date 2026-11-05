import { useMemo,useState } from "react";
import {
CreditCard,
FileText,
Globe,
GraduationCap,
Wifi,
Zap,
type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { moneyInputToNumber } from "@/shared/lib/money";
import { type Item,type SectionTab,type Tab } from "@/features/services/services.types";
import { daysUntil,history,parseDate,services } from "@/features/services/services.rules";

/** Estado y acciones de ServicesPage: el componente solo dibuja. */
export function useServicesPage() {
  const [pay, setPay] = useState<Item | null>(null);
  const [tab, setTab] = useState<Tab>("servicios");
  const [remesaOpen, setRemesaOpen] = useState(false);
  const [catFilt, setCatFilt] = useState("Todos");
  const [sort, setSort] = useState("vencimiento");

  const [hCat, setHCat] = useState("Todas");
  const [hStatus, setHStatus] = useState("Todos");
  const [hFrom, setHFrom] = useState("");
  const [sectionTab, setSectionTab] = useState<SectionTab>("proximos");
  const [proxAll, setProxAll] = useState(false);
  const [suscAll, setSuscAll] = useState(false);
  const [dispAll, setDispAll] = useState(false);
  const [histAll, setHistAll] = useState(false);
  const [editService, setEditService] = useState<Item | null>(null);
  const [news, setNews] = useState<Item[]>([]);
  const [nameNew, setNameNew] = useState("");
  const [catNew, setCatNew] = useState("Servicios publicos");
  const [numberNew, setNumberNew] = useState("");
  const [scanOpen, setScanOpen] = useState(false);

  const addSuscripcion = () => {
    if (!numberNew.trim()) return;
    const catIcon: Record<string, LucideIcon> = {
      "Servicios publicos": Zap,
      "Telefonia e internet": Wifi,
      Impuestos: FileText,
      "Tarjetas de credito": CreditCard,
      "Cuotas escolares": GraduationCap,
    };
    const nuevo: Item = {
      n: nameNew.trim() || catNew,
      c: "Cliente " + numberNew.trim(),
      v: "$ 0",
      venc: "-",
      icon: catIcon[catNew] ?? Globe,
      cat: catNew,
      e: "Proximo",
      suscrito: true,
    };
    setNews((prev) => [nuevo, ...prev]);
    setNumberNew("");
    setNameNew("");
    toast.success("Servicio suscrito: " + nuevo.n);
    setSectionTab("suscritos");
  };

  const all = [...services, ...news];
  const sorted = [...all].sort((a, b) => {
    if (sort === "vencimiento") return parseDate(a.venc).getTime() - parseDate(b.venc).getTime();
    if (sort === "monto") return moneyInputToNumber(a.v) - moneyInputToNumber(b.v);
    return a.n.localeCompare(b.n);
  });
  const filtrados = catFilt === "Todos" ? sorted : sorted.filter((s) => s.cat === catFilt);

  const prox = [...filtrados].sort(
    (a, b) => parseDate(a.venc).getTime() - parseDate(b.venc).getTime(),
  );

  const suscritos = useMemo(() => filtrados.filter((s) => s.suscrito), [filtrados]);
  const availables = useMemo(() => all.filter((s) => !s.suscrito), [all]);

  const totalAdheridos = all.filter((s) => s.suscrito).length;
  const totalPayMonth = prox.reduce((acc, s) => {
    return acc + moneyInputToNumber(s.v);
  }, 0);
  const totalOverdues = prox.filter((s) => daysUntil(s.venc) < 0).length;

  const hFiltrados = history.filter((t) => {
    if (hCat !== "Todas" && t.cat !== hCat) return false;
    if (hStatus !== "Todos" && t.e !== hStatus) return false;
    if (hFrom && parseDate(t.f).getTime() < parseDate(hFrom).getTime()) return false;
    return true;
  });
  return {
    pay,
    setPay,
    tab,
    setTab,
    remesaOpen,
    setRemesaOpen,
    catFilt,
    setCatFilt,
    sort,
    setSort,
    hCat,
    setHCat,
    hStatus,
    setHStatus,
    hFrom,
    setHFrom,
    sectionTab,
    setSectionTab,
    proxAll,
    setProxAll,
    suscAll,
    setSuscAll,
    dispAll,
    setDispAll,
    histAll,
    setHistAll,
    editService,
    setEditService,
    nameNew,
    setNameNew,
    catNew,
    setCatNew,
    numberNew,
    setNumberNew,
    scanOpen,
    setScanOpen,
    addSuscripcion,
    prox,
    suscritos,
    availables,
    totalAdheridos,
    totalPayMonth,
    totalOverdues,
    hFiltrados,
  };
}

export type ServicesPageVm = ReturnType<typeof useServicesPage>;
