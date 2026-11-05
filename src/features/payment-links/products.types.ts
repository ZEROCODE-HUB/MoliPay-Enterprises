export type DbProducto = {
  id: string;
  nombre: string;
  descripcion: string | null;
  precio: number;
  cantidad: number;
};

export type DbLink = {
  id: string;
  url: string;
  estado: string | null;
  pagos_parciales: boolean | null;
  metodos_pago: string[] | null;
  referencia: string | null;
  notas: string | null;
  created_at: string | null;
  expira_en: string | null;
  vistas: number | null;
  pagos: number | null;
  comercio_id: string | null;
  comercio_nombre: string | null;
};

export type DbLinkDetail = {
  id: string;
  link_id: string;
  producto_id: string | null;
  producto_nombre: string;
  cantidad: number;
  precio_unitario: number;
};

export type MerchantBrand = {
  id: string;
  bandera: string;
  estado: string;
  metodo_key: string | null;
  methodId: string;
};
