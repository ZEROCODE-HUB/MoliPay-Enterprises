export interface CSVRow {
  tipo_entidad: string;
  id_entidad: string;
  sub_entidad: string;
  identificacion_usuario: string;
  monto: number;
  descripcion: string;
  email?: string;
  periodo_facturacion?: string;
  id_unico_beneficiario?: string;
  fecha_vencimiento_1?: string;
  fecha_vencimiento_2?: string;
  fecha_vencimiento_3?: string;
  tasa_interes?: number;
  medios_de_pago?: string;
  pagos_parciales_habilitado?: string;
}
