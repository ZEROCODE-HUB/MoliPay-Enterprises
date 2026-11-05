import { type DocReal } from "./account.types";

export const KIND_LABEL: Record<string, string> = {
  id_frente: "DNI Frente",
  id_dorso: "DNI Dorso",
  servicio: "Comprobante de servicio",
  selfie: "Selfie con DNI",
};

export const IMG_EXT = [
  "png",
  "jpg",
  "jpeg",
  "jpe",
  "jfif",
  "jif",
  "webp",
  "gif",
  "bmp",
  "heic",
  "avif",
  "tiff",
  "tif",
];

export function kindOf(label: string, url: string): DocReal["kind"] {
  const ext = (label || url).split(".").pop()?.toLowerCase() ?? "";
  if (IMG_EXT.includes(ext)) return "image";
  if (ext === "pdf") return "pdf";
  return "file";
}

export function fmtDateDoc(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function fmtArs(v: any) {
  if (v == null || v === "") return "—";
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(Number(v));
}
