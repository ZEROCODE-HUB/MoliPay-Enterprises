import { type LucideIcon } from "lucide-react";

export type Item = {
  n: string;
  c: string;
  v: string;
  venc: string;
  icon: LucideIcon;
  cat: string;
  e: "Pendiente" | "Proximo" | "Vencido";
  suscrito: boolean;
};

export type TxHist = {
  f: string;
  s: string;
  cat: string;
  m: string;
  e: "Pagado" | "Vencido" | "Cancelado";
};

export type Tab = "servicios" | "remesas";
export type SectionTab = "proximos" | "suscritos" | "disponibles" | "historial";
