/** Deja solo los digitos (CUIT, CBU/CVU, documentos). Sin valor: "". */
export function onlyDigits(value: string | null | undefined): string {
  return (value ?? "").replace(/\D/g, "");
}
