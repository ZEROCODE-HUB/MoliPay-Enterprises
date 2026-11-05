import {
Building2,
CreditCard,
Droplet,
FileText,
Flame,
GraduationCap,
Phone,
Wifi,
Zap,
} from "lucide-react";
import { type Item,type TxHist } from "./services.types";

export const services: Item[] = [
  {
    n: "Edesur",
    c: "Cuenta 8821-039",
    v: "$ 64.320,00",
    venc: "05/07/2026",
    icon: Zap,
    cat: "Servicios publicos",
    e: "Pendiente",
    suscrito: false,
  },
  {
    n: "Metrogas",
    c: "Cuenta 4421-128",
    v: "$ 22.180,00",
    venc: "08/07/2026",
    icon: Flame,
    cat: "Servicios publicos",
    e: "Pendiente",
    suscrito: false,
  },
  {
    n: "AySA",
    c: "Cuenta 9990-2211",
    v: "$ 18.450,00",
    venc: "12/07/2026",
    icon: Droplet,
    cat: "Servicios publicos",
    e: "Proximo",
    suscrito: false,
  },
  {
    n: "Telecom",
    c: "Linea 011-4444-5555",
    v: "$ 14.800,00",
    venc: "10/07/2026",
    icon: Phone,
    cat: "Telefonia e internet",
    e: "Proximo",
    suscrito: false,
  },
  {
    n: "Fibertel",
    c: "Cuenta 4488-1102",
    v: "$ 32.500,00",
    venc: "14/07/2026",
    icon: Wifi,
    cat: "Telefonia e internet",
    e: "Proximo",
    suscrito: false,
  },
  {
    n: "Claro",
    c: "Linea 011-5555-6666",
    v: "$ 11.200,00",
    venc: "18/07/2026",
    icon: Phone,
    cat: "Telefonia e internet",
    e: "Proximo",
    suscrito: false,
  },
  {
    n: "ARBA",
    c: "Cuenta 88.123-4",
    v: "$ 88.230,00",
    venc: "20/07/2026",
    icon: FileText,
    cat: "Impuestos",
    e: "Proximo",
    suscrito: false,
  },
  {
    n: "AFIP",
    c: "CUIT 30-71234567-9",
    v: "$ 125.000,00",
    venc: "22/07/2026",
    icon: FileText,
    cat: "Impuestos",
    e: "Proximo",
    suscrito: false,
  },
  {
    n: "ABL CABA",
    c: "Partida 12.345.678",
    v: "$ 45.900,00",
    venc: "15/07/2026",
    icon: Building2,
    cat: "Impuestos",
    e: "Proximo",
    suscrito: false,
  },
  {
    n: "Naranja",
    c: "Tarjeta **** 4521",
    v: "$ 78.500,00",
    venc: "25/07/2026",
    icon: CreditCard,
    cat: "Tarjetas de credito",
    e: "Proximo",
    suscrito: false,
  },
  {
    n: "Visa Premium",
    c: "Tarjeta **** 8832",
    v: "$ 142.000,00",
    venc: "28/07/2026",
    icon: CreditCard,
    cat: "Tarjetas de credito",
    e: "Proximo",
    suscrito: false,
  },
  {
    n: "Mastercard Gold",
    c: "Tarjeta **** 6677",
    v: "$ 96.300,00",
    venc: "30/07/2026",
    icon: CreditCard,
    cat: "Tarjetas de credito",
    e: "Proximo",
    suscrito: false,
  },
  {
    n: "Cuota24 - Club Atletico",
    c: "Socio Nro 4521",
    v: "$ 8.500,00",
    venc: "05/07/2026",
    icon: GraduationCap,
    cat: "Cuotas escolares",
    e: "Pendiente",
    suscrito: false,
  },
  {
    n: "Mutual San Martin",
    c: "Legajo 11234",
    v: "$ 12.000,00",
    venc: "15/07/2026",
    icon: GraduationCap,
    cat: "Cuotas escolares",
    e: "Proximo",
    suscrito: false,
  },
];

export const cats = [
  "Todos",
  "Servicios publicos",
  "Telefonia e internet",
  "Impuestos",
  "Tarjetas de credito",
  "Cuotas escolares",
];
export const history: TxHist[] = [
  { f: "03/06/2026", s: "Cablevision", cat: "Internet", m: "$ 32.100", e: "Pagado" },
  { f: "01/06/2026", s: "Edesur", cat: "Energia", m: "$ 58.200", e: "Pagado" },
  { f: "28/05/2026", s: "AySA", cat: "Agua", m: "$ 17.900", e: "Pagado" },
  { f: "25/05/2026", s: "ABL CABA", cat: "Impuesto", m: "$ 44.200", e: "Pagado" },
  { f: "22/05/2026", s: "Telecom", cat: "Telefonia", m: "$ 14.800", e: "Pagado" },
  { f: "20/05/2026", s: "Metrogas", cat: "Gas", m: "$ 22.180", e: "Pagado" },
  { f: "18/05/2026", s: "ARBA", cat: "Impuesto", m: "$ 88.230", e: "Pagado" },
  { f: "15/05/2026", s: "Fibertel Empresas", cat: "Internet", m: "$ 88.500", e: "Pagado" },
  { f: "12/05/2026", s: "Edesur", cat: "Energia", m: "$ 58.200", e: "Pagado" },
  { f: "10/05/2026", s: "AySA", cat: "Agua", m: "$ 17.900", e: "Cancelado" },
  { f: "08/05/2026", s: "ABL CABA", cat: "Impuesto", m: "$ 44.200", e: "Vencido" },
  { f: "05/05/2026", s: "Telecom", cat: "Telefonia", m: "$ 14.800", e: "Pagado" },
];

export const remesas: Array<{
  f: string;
  pais: string;
  banco: string;
  mARS: string;
  mDest: string;
  tc: string;
  e: "Completado" | "En proceso" | "Rechazado";
}> = [
  {
    f: "01/06/2026",
    pais: "Colombia",
    banco: "Bancolombia",
    mARS: "$ 850.000",
    mDest: "COP 3.420.000",
    tc: "1 ARS = 4,02 COP",
    e: "Completado",
  },
  {
    f: "28/05/2026",
    pais: "Mexico",
    banco: "BBVA Mexico",
    mARS: "$ 1.200.000",
    mDest: "MXN 20.400",
    tc: "Cripto USDT",
    e: "Completado",
  },
  {
    f: "20/05/2026",
    pais: "Espana",
    banco: "Santander ES",
    mARS: "$ 2.400.000",
    mDest: "EUR 1.860",
    tc: "Bonos AL30/AL30D",
    e: "En proceso",
  },
  {
    f: "15/05/2026",
    pais: "Brasil",
    banco: "Itau",
    mARS: "$ 680.000",
    mDest: "BRL 3.180",
    tc: "P2P",
    e: "Rechazado",
  },
];

export function parseDate(d: string) {
  const [dd, mm, yyyy] = d.split("/").map(Number);
  return new Date(yyyy, mm - 1, dd);
}

export function daysUntil(d: string) {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const t = parseDate(d);
  return Math.ceil((t.getTime() - now.getTime()) / 86400000);
}

export const PREVIEW_LIMIT = 5;
