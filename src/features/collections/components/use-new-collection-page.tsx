import * as XLSX from "xlsx";
import { useNavigate } from "@tanstack/react-router";
import { useEffect,useRef,useState } from "react";
import { format } from "date-fns";
import {
createBatchDB,
generateId,
getLegajoUser,
type Batch,
type MethodPayment,
type RecordDeBatch,
} from "@/features/collections/collections.data";
import { toast } from "sonner";
import { moneyInputToNumber } from "@/shared/lib/money";
import { type CSVRow } from "@/features/collections/new-collection.types";

/** Estado y acciones de NewCollectionPage: el componente solo dibuja. */
export function useNewCollectionPage() {
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState(0);
  const [subiendo, setSubiendo] = useState(false);
  const [csvData, setCsvData] = useState<CSVRow[]>([]);
  const [csvFileName, setCsvFileName] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    setPage(1);
  }, [csvData]);

  // Paso 1 - Parametros generales
  const tomorrow = format(new Date(Date.now() + 86400000), "yyyy-MM-dd");
  const [name, setName] = useState("");
  const [period, setPeriod] = useState(format(new Date(), "yyyy-MM"));
  const [dayProcesamiento, setDayProcesamiento] = useState(15);
  const [rateInteres, setRateInteres] = useState(10);
  const [dateVenc1, setDateVenc1] = useState(tomorrow);
  const [dateVenc2, setDateVenc2] = useState("");
  const [dateVenc3, setDateVenc3] = useState("");
  const [methodsPayment, setMethodsPayment] = useState<MethodPayment[]>([
    "TRANSFERENCIA",
    "TARJETA_CREDITO",
    "TARJETA_DEBITO",
  ]);
  const [paymentsPartials, setPaymentsPartials] = useState(true);
  const [notifications, setNotifications] = useState(false);

  const toggleMethod = (m: MethodPayment) => {
    setMethodsPayment((prev) => (prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]));
  };

  const validatePaso1 = (): boolean => {
    if (!name.trim()) {
      toast.error("El nombre del lote es obligatorio");
      return false;
    }
    if (!period) {
      toast.error("Selecciona el periodo");
      return false;
    }
    if (!dayProcesamiento || dayProcesamiento < 1 || dayProcesamiento > 31) {
      toast.error("El dia de pago debe ser un numero entre 1 y 31");
      return false;
    }
    if (!dateVenc1 || dateVenc1 < tomorrow) {
      toast.error("La primera fecha de vencimiento no puede ser anterior a manana");
      return false;
    }
    if (dateVenc2 && dateVenc2 <= dateVenc1) {
      toast.error("El 2º vencimiento debe ser posterior al 1º");
      return false;
    }
    if (dateVenc3 && dateVenc3 <= dateVenc2) {
      toast.error("El 3º vencimiento debe ser posterior al 2º");
      return false;
    }
    if (methodsPayment.length === 0) {
      toast.error("Selecciona al menos un medio de pago");
      return false;
    }
    return true;
  };

  // Paso 2 - CSV
  const downloadPlantilla = () => {
    const headers = [
      "tipo_entidad",
      "id_entidad",
      "sub_entidad",
      "identificacion_usuario",
      "monto",
      "descripcion",
      "email",
      "periodo_facturacion",
      "id_unico_beneficiario",
      "fecha_vencimiento_1",
      "fecha_vencimiento_2",
      "fecha_vencimiento_3",
      "tasa_interes",
      "medios_de_pago",
      "pagos_parciales_habilitado",
    ];
    const example = [
      "edificio",
      "6",
      "UF 3D",
      "Perez, Juan",
      48200,
      "Expensas mensuales - Edificio 6",
      "juan@email.com",
      "",
      "",
      "2026-04-15",
      "2026-04-30",
      "2026-05-15",
      10,
      "TRANSFERENCIA|TARJETA_CREDITO",
      true,
    ];
    const ws = XLSX.utils.json_to_sheet(
      [Object.fromEntries(headers.map((h, i) => [h, example[i]]))],
      { header: headers },
    );
    ws["!cols"] = headers.map((h) => ({ wch: Math.max(h.length + 2, 18) }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Plantilla");
    XLSX.writeFile(wb, "plantilla-cobros-masivos.xlsx");
    toast.success("Plantilla descargada");
  };

  const procesarFile = (file: File) => {
    setCsvFileName(file.name);
    setSubiendo(true);

    const isXlsx = file.name.endsWith(".xlsx") || file.name.endsWith(".xls");

    const parseRows = (rawRows: Record<string, string>[]) => {
      const rows: CSVRow[] = [];
      for (let i = 0; i < rawRows.length; i++) {
        const row = rawRows[i];
        const amount = moneyInputToNumber(row["monto"] || "0");
        if (amount <= 0) {
          toast.error(`Fila ${i + 1}: el monto debe ser un numero positivo`);
          setSubiendo(false);
          return;
        }
        if (!row["tipo_entidad"] || !row["id_entidad"] || !row["sub_entidad"]) {
          toast.error(`Fila ${i + 1}: tipo_entidad, id_entidad y sub_entidad son obligatorios`);
          setSubiendo(false);
          return;
        }
        if (!row["identificacion_usuario"]) {
          toast.error(`Fila ${i + 1}: identificacion_usuario es obligatorio`);
          setSubiendo(false);
          return;
        }
        rows.push({
          tipo_entidad: row["tipo_entidad"],
          id_entidad: row["id_entidad"],
          sub_entidad: row["sub_entidad"],
          identificacion_usuario: row["identificacion_usuario"],
          monto: amount,
          descripcion: row["descripcion"] || "",
          email: row["email"] || undefined,
          periodo_facturacion: row["periodo_facturacion"] || undefined,
          id_unico_beneficiario: row["id_unico_beneficiario"] || undefined,
          fecha_vencimiento_1: row["fecha_vencimiento_1"] || undefined,
          fecha_vencimiento_2: row["fecha_vencimiento_2"] || undefined,
          fecha_vencimiento_3: row["fecha_vencimiento_3"] || undefined,
          tasa_interes: row["tasa_interes"] ? parseFloat(row["tasa_interes"]) : undefined,
          medios_de_pago: row["medios_de_pago"] || undefined,
          pagos_parciales_habilitado: row["pagos_parciales_habilitado"] || undefined,
        });
      }
      return rows;
    };

    const onSuccess = (rows: CSVRow[]) => {
      setCsvData(rows);
      toast.success(`${rows.length} registros validos cargados`);
      setSubiendo(false);
    };

    const onError = (msg: string) => {
      toast.error(msg);
      setSubiendo(false);
    };

    if (isXlsx) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const wb = XLSX.read(e.target?.result, { type: "array" });
          const ws = wb.Sheets[wb.SheetNames[0]];
          const json = XLSX.utils.sheet_to_json<Record<string, string>>(ws);
          if (json.length === 0) {
            onError("El archivo no contiene datos");
            return;
          }
          const rows = parseRows(json);
          if (rows) onSuccess(rows);
        } catch {
          onError("Error al procesar el archivo XLSX");
        }
      };
      reader.onerror = () => onError("Error al leer el archivo");
      reader.readAsArrayBuffer(file);
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const text = e.target?.result as string;
          const lines = text.split("\n").filter((l) => l.trim());
          if (lines.length < 2) {
            onError("El archivo debe contener al menos un encabezado y una fila de datos");
            return;
          }
          const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
          const rawRows: Record<string, string>[] = [];
          for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(",").map((v) => v.trim());
            const row: Record<string, string> = {};
            headers.forEach((h, idx) => {
              row[h] = values[idx] ?? "";
            });
            rawRows.push(row);
          }
          const rows = parseRows(rawRows);
          if (rows) onSuccess(rows);
        } catch {
          onError("Error al procesar el archivo CSV");
        }
      };
      reader.onerror = () => onError("Error al leer el archivo");
      reader.readAsText(file);
    }
  };

  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    setSaving(true);
    try {
      const batchId = generateId("LOT");
      const now = format(new Date(), "yyyy-MM-dd HH:mm:ss");

      const batch: Batch = {
        id: batchId,
        nombre: name,
        periodo: period,
        diaProcesamiento: String(dayProcesamiento),
        estado: "cargado",
        tasaInteres: rateInteres,
        fechaVencimiento1: dateVenc1,
        fechaVencimiento2: dateVenc2 || null,
        fechaVencimiento3: dateVenc3 || null,
        mediosPago: methodsPayment,
        pagosParcialesHabilitado: paymentsPartials,
        notificacionesHabilitado: notifications,
        createdAt: now,
        fechaInicio: null,
        fechaFinalizacion: null,
      };

      const records: Omit<RecordDeBatch, "createdAt">[] = csvData.map((row) => ({
        id: generateId("REG"),
        loteId: batchId,
        tipoEntidad: row.tipo_entidad,
        idEntidad: row.id_entidad,
        subEntidad: row.sub_entidad,
        identificacionUsuario: row.identificacion_usuario,
        monto: row.monto,
        descripcion: row.descripcion,
        email: row.email ?? null,
        periodoFacturacion: row.periodo_facturacion ?? null,
        idUnicoBeneficiario: row.id_unico_beneficiario ?? null,
        fechaVencimiento1: row.fecha_vencimiento_1 ?? null,
        fechaVencimiento2: row.fecha_vencimiento_2 ?? null,
        fechaVencimiento3: row.fecha_vencimiento_3 ?? null,
        tasaInteres: row.tasa_interes ?? null,
        mediosPago: methodsPayment,
        pagosParcialesHabilitado: paymentsPartials,
        cbuId: null,
        linkDePago: null,
        estado: "pendiente",
        montoPagado: 0,
        fechaPago: null,
        emailEnviado: false,
      }));

      const legajo = await getLegajoUser();
      if (!legajo) {
        toast.error("No se pudo identificar el usuario");
        return;
      }

      const result = await createBatchDB(batch, records, legajo);
      if (!result.ok) {
        toast.error("Error al guardar: " + (result.error ?? "desconocido"));
        return;
      }

      toast.success(`Lote "${name}" creado con ${csvData.length} registros`, {
        description: "El lote quedo en estado Pendiente de procesamiento",
      });
      navigate({ to: "/app/cobros/gestion" });
    } finally {
      setSaving(false);
    }
  };
  return {
    navigate,
    fileRef,
    step,
    setStep,
    subiendo,
    csvData,
    setCsvData,
    csvFileName,
    setCsvFileName,
    page,
    setPage,
    pageSize,
    name,
    setName,
    period,
    setPeriod,
    dayProcesamiento,
    setDayProcesamiento,
    rateInteres,
    setRateInteres,
    dateVenc1,
    setDateVenc1,
    dateVenc2,
    setDateVenc2,
    dateVenc3,
    setDateVenc3,
    methodsPayment,
    paymentsPartials,
    setPaymentsPartials,
    notifications,
    setNotifications,
    toggleMethod,
    validatePaso1,
    downloadPlantilla,
    procesarFile,
    saving,
    handleSubmit,
  };
}

export type NewCollectionPageVm = ReturnType<typeof useNewCollectionPage>;
