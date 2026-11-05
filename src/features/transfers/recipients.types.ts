export type Recipient = {
  /** id en `destinatarios_frecuentes` (vacío solo para filas efímeras). */
  id: string;
  n: string;
  a: string;
  cbu: string;
  b: string;
  cat: string;
  fav: boolean;
  ult: string;
  ops: number;
};

export type Subaccount = {
  id: string;
  nombre: string;
  cbu: string | null;
  saldo_disponible: number;
};
