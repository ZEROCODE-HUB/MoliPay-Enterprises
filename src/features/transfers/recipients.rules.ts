import { type FrequentRecipient } from "@/features/transfers/transfer-store";
import { type Recipient } from "./recipients.types";

/**
 * Agenda real: `destinatarios_frecuentes` (migración 1012), misma tabla que
 * usa la pantalla de transferencias. Antes acá había data de ejemplo hardcodeada.
 */
export function aRecipient(f: FrequentRecipient): Recipient {
  return {
    id: f.id,
    n: f.nombre,
    a: f.alias || "",
    cbu: f.cbu,
    b: f.banco || "—",
    cat: "Destinatario frecuente",
    fav: false,
    ult: "",
    ops: 0,
  };
}

export const categories = [
  { n: "Todos", c: 24, active: true },
  { n: "Proveedores", c: 12 },
  { n: "Empleados", c: 8 },
  { n: "Servicios", c: 3 },
  { n: "Favoritos", c: 5 },
];
