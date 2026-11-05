export type LinkData = {
  id: string;
  url: string;
  estado: string;
  referencia: string | null;
  notas: string | null;
  expira_en: string | null;
  pagos_parciales: boolean;
  metodos_pago: string[];
  cliente_legajo: string;
  monto: number;
  detalle: Array<{ producto_nombre: string; cantidad: number; precio_unitario: number }>;
  comercio_id: string | null;
  comercio_nombre: string | null;
};
