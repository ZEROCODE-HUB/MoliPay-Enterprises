/** Comercio asociado al cliente de la sesion. */
export type Merchant = {
  id: string;
  name: string;
  legajo: string;
  /** Texto de la base (p. ej. "Nivel 1"); solo se muestra. */
  level: string;
  /** Texto de la base; solo se muestra (ver statusTone). */
  status: string;
  user: string;
  createdAt: string;
};
