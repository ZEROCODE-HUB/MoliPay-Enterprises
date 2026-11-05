/**
 * Formato de valores para mostrar en pantalla (es-AR).
 * Solo presentacion: no redondea ni calcula importes.
 */

const MONEY_FORMAT: Intl.NumberFormatOptions = {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
};

/** "$ 1.234,56". Sin valor: "—". */
export function formatMoney(value: number | null | undefined): string {
  if (value == null) return "—";
  return `$ ${value.toLocaleString("es-AR", MONEY_FORMAT)}`;
}
