import ONBOARDING_DDL from "./onboarding-ddl.sql?raw";

export type ProposalBlock =
  | { kind: "p"; text: string }
  | { kind: "h3"; text: string }
  | { kind: "list"; items: string[]; ordered?: boolean }
  | { kind: "table"; head: string[]; rows: string[][] }
  | { kind: "code"; text: string }
  | { kind: "details"; summary: string; text: string }
  | { kind: "erd" };

export type ProposalSection = { id: string; title: string; blocks: ProposalBlock[] };

const COLUMNS = ["Columna", "Tipo", "Restricciones"];

const AUDIT_SQL = `-- Políticas vigentes
select schemaname, tablename, policyname, roles, cmd, qual, with_check
from pg_policies
where (schemaname = 'public' and tablename in ('clientes','documentos','validaciones'))
   or (schemaname = 'storage' and tablename = 'objects');

-- Bucket de KYC
select id, public from storage.buckets where id = 'kyc';

-- Funciones SECURITY DEFINER sin search_path fijo
select p.proname
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.prosecdef
  and not exists (select 1 from unnest(coalesce(p.proconfig, '{}')) c where c like 'search_path=%');

-- Volumen por tipo y estado
select tipo_persona, estado, cuit like '99%' as provisorio, count(*)
from public.clientes group by 1, 2, 3 order by 1, 2, 3;

-- Posibles identidades duplicadas
select coalesce(nullif(cuit_cuil, ''), cuit) as tax_id, count(*)
from public.clientes where tipo_persona = 'fisica'
group by 1 having count(*) > 1;

-- Cuentas sin usuario de autenticación
select count(*)
from public.clientes c
left join auth.users u on lower(u.email) = lower(c.correo)
where u.id is null;`;

export const PROPOSAL_SECTIONS: ProposalSection[] = [
  {
    id: "veredicto",
    title: "Veredicto y correcciones",
    blocks: [
      {
        kind: "p",
        text: "**El modelo escala y sirve para los reportes, siempre que se respeten tres límites:** una identidad por persona, ninguna vinculación automática y datos regulatorios que nunca salgan de lo que el cliente declaró sin revisar. Este documento es solo diseño: no se ejecutó nada, y se basa en las migraciones del repositorio, no en la base real.",
      },
      { kind: "p", text: "Al revisar mi propuesta anterior encontré errores que corregí:" },
      {
        kind: "table",
        head: ["Lo que proponía", "Problema", "Corrección"],
        rows: [
          [
            "Trigger que copiaba `clientes` a `people`",
            "Un cliente podía pisar una identidad ya verificada",
            "Un cambio de la cuenta crea una declaración; solo se aplica al aprobarla",
          ],
          [
            "`company_members.person_id` obligatorio",
            "Obligaba a vincular por CUIL antes de revisar",
            "La relación nace apuntando a la declaración y `person_id` se completa al vincular",
          ],
          [
            "Estados de KYC y documentos en `clientes`",
            "Agrandaba una tabla de 38 columnas y no servía para una revisión periódica",
            "Viven en `onboarding_applications` y `people`",
          ],
          [
            "Sin estado de compliance ni de relación",
            "Faltaban dos de las seis dimensiones",
            "Se agregan",
          ],
          [
            "`documentos.person_id`",
            "Una persona sin vincular no podía tener documentos",
            "`documentos.submission_id`; la persona se obtiene por la declaración",
          ],
          [
            "`people.auth_user_id`",
            "Era espacio para una función que no se va a construir",
            "Se elimina y se agrega `clientes.auth_user_id`, necesario para autorizar por `auth.uid()`",
          ],
          [
            "KYC de clientes existentes sin definir",
            "Podía interpretarse como verificado",
            "Estado `legacy_unverified`; nadie pasa a `passed` por migración",
          ],
        ],
      },
      {
        kind: "p",
        text: "Decisiones confirmadas: los integrantes son solo personas físicas y cada persona tiene como máximo una cuenta PF. `clientes` y `documentos` no se renombran.",
      },
    ],
  },
  {
    id: "ajustes",
    title: "Ajustes de la última revisión",
    blocks: [
      {
        kind: "p",
        text: "La arquitectura no cambia. Estos ajustes cierran los huecos que señaló la revisión, para que las reglas las garantice la base de datos y no solo la aplicación.",
      },
      { kind: "h3", text: "1. La persona de una relación es la de su declaración" },
      {
        kind: "p",
        text: "Antes, nada impedía vincular a Carlos con una declaración hecha sobre Ana. Ahora cada relación se ata a su declaración por dos claves compuestas: una exige que la declaración sea de esa empresa y la otra, que la persona sea la misma. Mientras la persona no está vinculada, la segunda clave no se exige; al vincular, primero se completa la declaración y después la relación. Los beneficiarios finales tienen la misma protección.",
      },
      { kind: "h3", text: "2. Un documento solo se asocia a declaraciones de su cuenta" },
      {
        kind: "p",
        text: "`documentos` suma el identificador de la cuenta. Dos claves compuestas garantizan que el legajo y la cuenta coincidan, y que la declaración asociada sea de esa misma cuenta. Una empresa no puede colgar un documento de una declaración ajena.",
      },
      {
        kind: "p",
        text: "Los documentos personales (DNI, comprobante, selfie, poder) siempre van con una declaración, y los de empresa (estatuto, acta, constancia de AFIP) nunca. Esta regla se activa en el paso 6, cuando el alta y el backoffice ya cargan la declaración, porque antes rompería los flujos actuales. Los enlaces firmados pasan por una única función que comprueba si quien pide es el dueño o tiene permiso.",
      },
      { kind: "h3", text: "3. El usuario no se vincula solo porque coincida el correo" },
      {
        kind: "p",
        text: "En la migración se vincula automáticamente solo si se cumple todo esto: el correo está confirmado en Auth, hay una única cuenta y un único usuario con ese correo, ese usuario no está vinculado a otra cuenta y no pertenece al backoffice. Cualquier otro caso queda en una lista de revisión con su motivo. La vinculación manual exige un responsable y queda registrada, junto con el método usado. En las altas nuevas el usuario sale de la sesión.",
      },
      { kind: "h3", text: "4. El resultado de un control no decide sobre la cuenta" },
      {
        kind: "p",
        text: "Se agrega una tabla, `compliance_cases`, porque esta separación no entraba en las existentes. Un resultado o un evento abre un caso; solo una persona con permiso de Compliance toma la decisión, con motivo y responsable. Las decisiones posibles son: sin acción, pedir información, nueva revisión, restringir operaciones, suspender o cerrar la cuenta. Restringir usa los bloqueos que ya existen en `account_blocks`.",
      },
      {
        kind: "table",
        head: ["Si ocurre esto", "Pasa automáticamente", "La cuenta", "Quién decide"],
        rows: [
          [
            "Coincidencia posible en una lista",
            "Se abre un caso normal por cada cuenta alcanzada",
            "No cambia",
            "Compliance",
          ],
          [
            "Coincidencia confirmada de Ana",
            "Se abre un caso crítico en su cuenta PF y en cada empresa donde participa",
            "No cambia sola",
            "Compliance, cuenta por cuenta",
          ],
          [
            "Vence un documento en una empresa activada",
            "El documento pasa a vencido y se abre un caso",
            "Sigue operando",
            "Compliance decide si pide otro o restringe",
          ],
          [
            "Una persona cambia su declaración PEP",
            "Queda como declaración; al aplicarla se abre un caso en sus cuentas",
            "No cambia",
            "Analista aplica; Compliance decide",
          ],
          [
            "Cambia un dato personal en una cuenta PF",
            "Se crea una declaración y la identidad no se toca",
            "No cambia",
            "Analista",
          ],
          [
            "La empresa queda sin representante legal",
            "Se abre un caso crítico",
            "No cambia sola",
            "Compliance",
          ],
        ],
      },
      {
        kind: "p",
        text: "**Una solicitud aprobada no se reabre, y nadie puede hacerlo.** Si hace falta revisar otra vez, se crea una solicitud nueva y la anterior queda como evidencia. Esto corrige mi versión anterior, que decía que las empresas se reabrían. Los efectos por defecto de esta tabla son una propuesta para que Compliance la confirme.",
      },
      { kind: "h3", text: "5. Restricciones que faltaban" },
      {
        kind: "list",
        items: [
          "**Declaraciones duplicadas:** una cuenta no puede tener dos declaraciones abiertas sobre el mismo CUIT/CUIL. Una relación tampoco se repite por declaración y carácter, o por declaración y tipo de control.",
          "**Declaración aplicada:** lo declarado nunca se edita, y una declaración vinculada no cambia de persona. Sus transiciones quedan limitadas.",
          "**Vincular sin aplicar:** se agrega el estado `linked`. Sirve cuando B declara a Ana con otro domicilio: la relación se vincula y la identidad de Ana no cambia.",
          "**Decisión y estado:** la decisión es obligatoria según el estado, y sobre una persona existente exige responsable y motivo. Quien declaró no puede decidir.",
          "**Documentos y revisiones:** el estado del documento solo lo cambia una revisión, una versión nueva o su vencimiento. Se elimina el estado `in_review` de los documentos, porque no lo generaba ninguna revisión.",
          "**Requisitos documentales:** no se pueden superponer dos requisitos iguales en el mismo período.",
          "**CUIT/CUIL:** se valida el dígito verificador real, no solo los 11 caracteres. Uno inválido no crea una persona.",
          "**Cambios de CUIT o documento:** una persona solo cambia mediante una declaración aplicada por un analista, que queda como historial. El CUIT de una cuenta solo lo cambia el backoffice.",
          "**Participación:** el tope de 100% cuenta las participaciones directas vigentes y pendientes, y bloquea la empresa durante el cálculo para evitar carreras.",
        ],
      },
      { kind: "h3", text: "6. Dos decisiones que se mantienen" },
      {
        kind: "list",
        items: [
          "**El `jsonb` es solo la foto de lo declarado.** Lo que se busca, se restringe o se reporta queda en columnas.",
          "**Revisiones, verificaciones y controles son historial.** Un resultado nuevo se agrega y nunca borra el anterior.",
        ],
      },
      { kind: "h3", text: "7. Seguridad en concreto" },
      {
        kind: "list",
        items: [
          "**Tablas nuevas:** el cliente no tiene acceso directo. Lee y escribe solo por funciones que devuelven lo suyo, sin motivos internos. El backoffice lee según su permiso, y nadie escribe en ellas sin pasar por una función.",
          "**Sin pistas:** los estados `pending_identity` y `pending_review` se le muestran igual a la empresa, para no revelar que una persona ya existía.",
          "**`clientes`:** un trigger bloquea a quien no es del backoffice si intenta cambiar estado, límites, CBU, alias, CUIT, legajo, correo o vínculos. Sigue pudiendo cambiar datos como su teléfono.",
          "**`documentos` y `validaciones`:** el cliente solo lee lo suyo. Pierde la escritura directa.",
          "**Storage:** se elimina la lectura general de KYC. Solo el backoffice con permiso lee directo, y el cliente pasa por `doc-url`.",
          "**Funciones:** todas fijan `search_path`, y se revoca su ejecución a `PUBLIC` y `anon`. Solo se habilitan las que cada rol necesita.",
          "**Separación de funciones:** Analista KYC y Compliance son permisos distintos. Ninguno decide por el otro.",
        ],
      },
      {
        kind: "p",
        text: "**Pruebas negativas previstas:** una empresa no lee personas, declaraciones, integrantes ni documentos de otra; no pide enlaces de archivos ajenos; no aprueba sus propias relaciones, documentos o solicitudes; no cambia su estado, CBU, CUIT o límites; y un anónimo no ejecuta nada.",
      },
      {
        kind: "p",
        text: "**Hasta dónde se probó:** cargué el SQL del anexo en un Postgres temporal con tablas simuladas de `clientes`, Auth y Storage, nunca en tu base. Eso destapó y corrigió tres errores. De 86 comprobaciones pasaron 85; falló pasar a preactivado una empresa aprobada, y no lo investigué, así que queda abierto. No se probaron accesos simultáneos ni la base real.",
      },
      { kind: "h3", text: "Decisiones nuevas para Compliance" },
      {
        kind: "list",
        items: [
          "¿Una coincidencia confirmada en REPET exige bloquear de inmediato, sin esperar una decisión? Si es así, se agrega como regla explícita.",
          "¿Qué plazo hay para reemplazar un documento vencido antes de restringir la cuenta?",
          "¿Un cambio de PEP requiere una revisión nueva de cada empresa donde participa la persona?",
        ],
      },
      {
        kind: "p",
        text: "**Siguiente paso:** con estos ajustes aprobados, se revisa el paso 0 de auditoría sobre la base real. No se ejecutó ninguna migración.",
      },
    ],
  },
  {
    id: "diagrama",
    title: "Diagrama entidad-relación",
    blocks: [
      {
        kind: "p",
        text: "Una persona tiene una sola identidad y puede vincularse a muchas empresas. Las relaciones nacen de una declaración, no de la identidad.",
      },
      { kind: "erd" },
    ],
  },
  {
    id: "tablas",
    title: "Definición de tablas",
    blocks: [
      {
        kind: "p",
        text: "Todas las tablas nuevas usan `id uuid PK DEFAULT gen_random_uuid()` salvo que se indique otra clave, y `created_at timestamptz NOT NULL DEFAULT now()`. Cada una se justifica por el problema que resuelve.",
      },
      { kind: "h3", text: "Cambios en tablas existentes" },
      {
        kind: "p",
        text: "**`clientes`** sigue siendo la cuenta. Se agrega `UNIQUE (id, tipo_persona)`.",
      },
      {
        kind: "table",
        head: ["Columna nueva", "Tipo", "Restricciones"],
        rows: [
          [
            "`auth_user_id`",
            "uuid",
            "FK `auth.users` `ON DELETE SET NULL`; único si no es nulo. Se suman método, fecha y responsable de la vinculación",
          ],
          [
            "`person_id`",
            "uuid",
            "FK `people` `RESTRICT`; único si no es nulo; `CHECK (person_id IS NULL OR tipo_persona = 'fisica')`",
          ],
          [
            "`account_classification`",
            "text",
            "`CHECK IN ('commercial','personal')`; nulo hasta completarse",
          ],
        ],
      },
      {
        kind: "p",
        text: "**`documentos`** sigue guardando lo recibido. `cliente_legajo` pasa a significar la cuenta que lo subió, y se agrega `customer_id` para atarlo a ella con claves compuestas.",
      },
      {
        kind: "table",
        head: ["Columna nueva", "Tipo", "Restricciones"],
        rows: [
          [
            "`submission_id`",
            "uuid",
            "FK `person_submissions` `RESTRICT`; nulo en documentos de empresa",
          ],
          [
            "`status`",
            "text",
            "`CHECK IN ('received','approved','rejected','expired','superseded')`",
          ],
          ["`version`", "integer", "`NOT NULL DEFAULT 1`, mayor que 0"],
          ["`supersedes_id`", "uuid", "FK `documentos`; único si no es nulo"],
          [
            "`mime_type`, `size_bytes`, `content_hash`",
            "text, bigint, text",
            "Se exigen en documentos nuevos",
          ],
          ["`uploaded_by`", "uuid", "Quien lo subió"],
          ["`expires_at`", "timestamptz", "Nulo si no vence"],
        ],
      },
      {
        kind: "p",
        text: "El `CHECK` de `tipo` se amplía con estatuto, acta, poder y constancia de AFIP. Un índice único parcial permite un solo documento vigente por cuenta, tipo y declaración.",
      },
      { kind: "h3", text: "`people`: identidad de una persona física" },
      { kind: "p", text: "Resuelve la duplicación entre cuentas y empresas." },
      {
        kind: "table",
        head: COLUMNS,
        rows: [
          ["`tax_id`", "text", "11 dígitos con verificador válido; único si no es nulo"],
          ["`document_country`", "char(2)", "Va junto con tipo y número"],
          ["`document_type`", "text", "Va junto con país y número"],
          ["`document_number`", "text", "Único por país, tipo y número"],
          ["`first_name`, `last_name`", "text", "`NOT NULL`"],
          ["`birth_date`, `gender`", "date, text", "Nulos solo en datos heredados"],
          ["`nationality`, `residence_country`", "char(2)", "ISO 3166-1"],
          ["`occupation`, `funds_origin`", "text", ""],
          ["`is_pep`", "boolean", "**Nulo significa no declarado**, nunca `false` por defecto"],
          ["`pep_declared_at`", "timestamptz", "Obligatorio si `is_pep` no es nulo"],
          ["`kyc_status`", "text", "Ver estados; solo lo escribe el servidor"],
          ["`compliance_status`", "text", "Ver estados; solo lo escribe el servidor"],
          ["`anonymized_at`", "timestamptz", ""],
          ["`updated_at`", "timestamptz", "`NOT NULL`"],
        ],
      },
      {
        kind: "p",
        text: "`CHECK`: debe existir `tax_id` o documento, salvo que la persona esté anonimizada.",
      },
      { kind: "h3", text: "`person_submissions`: lo declarado sobre una persona" },
      {
        kind: "p",
        text: "Resuelve la separación entre lo declarado y lo verificado. También es el historial de la identidad, porque `people` solo cambia al aplicar una declaración.",
      },
      {
        kind: "table",
        head: COLUMNS,
        rows: [
          ["`submitted_by_customer_id`", "uuid", "`NOT NULL`, FK `clientes` `RESTRICT`"],
          ["`submitted_by_user`", "uuid", "Nulo solo con `source = 'legacy_migration'`"],
          [
            "`source`",
            "text",
            "`CHECK IN ('pf_onboarding','company_onboarding','account_update','legacy_migration','backoffice')`",
          ],
          ["`declared`", "jsonb", "`NOT NULL`"],
          [
            "`declared_tax_id`",
            "text",
            "Generada desde `declared`; indexada para buscar candidatos",
          ],
          ["`person_id`", "uuid", "FK `people` `RESTRICT`; nulo hasta vincular"],
          [
            "`status`",
            "text",
            "`CHECK IN ('pending_match','linked','applied','rejected','superseded')`",
          ],
          ["`match_decision`", "text", "`CHECK IN ('new_person','existing_person')`"],
          [
            "`decided_by`, `decided_at`, `decision_reason`",
            "uuid, timestamptz, text",
            "Quién autorizó y por qué",
          ],
        ],
      },
      {
        kind: "p",
        text: "Cada estado exige sus datos: `linked` y `applied` necesitan persona y decisión, y una decisión sobre una persona existente necesita responsable, distinto de quien declaró. `UNIQUE (id, submitted_by_customer_id)` y `UNIQUE (id, person_id)` sostienen las claves compuestas de las relaciones.",
      },
      { kind: "h3", text: "`company_profiles`: datos de empresa" },
      {
        kind: "p",
        text: "Resuelve que los datos de empresa estén mezclados con los personales en una misma fila.",
      },
      {
        kind: "table",
        head: COLUMNS,
        rows: [
          ["`customer_id`", "uuid", "PK"],
          [
            "`person_kind`",
            "text",
            "`NOT NULL DEFAULT 'juridica'`, `CHECK (person_kind = 'juridica')`",
          ],
          ["`legal_name`", "text", "`NOT NULL`"],
          [
            "`trade_name`, `company_type`, `identification_type`",
            "text",
            "Se exigen al enviar, no en datos heredados",
          ],
          ["`registration_date`", "date", "Igual"],
          ["`activity_code`", "text", "Sistema de códigos a confirmar"],
          ["`updated_at`", "timestamptz", "`NOT NULL`"],
        ],
      },
      {
        kind: "p",
        text: "`FOREIGN KEY (customer_id, person_kind)` a `clientes (id, tipo_persona)` con `RESTRICT`: la base impide un perfil de empresa en una cuenta física. El CUIT, el legajo y el domicilio se quedan en `clientes`, sin duplicarse.",
      },
      { kind: "h3", text: "`company_members`: quién actúa por la empresa" },
      {
        kind: "table",
        head: COLUMNS,
        rows: [
          ["`company_id`", "uuid", "`NOT NULL`, FK `company_profiles` `RESTRICT`"],
          [
            "`submission_id`",
            "uuid",
            "`NOT NULL`; FK compuesta con `company_id` a `person_submissions (id, submitted_by_customer_id)`",
          ],
          ["`person_id`", "uuid", "FK `people` `RESTRICT`; nulo hasta vincular"],
          [
            "`role`",
            "text",
            "`CHECK IN ('holder','co_holder','legal_representative','attorney','signatory')`",
          ],
          [
            "`status`",
            "text",
            "`CHECK IN ('pending_identity','pending_review','active','rejected','ended')`",
          ],
          [
            "`started_at`, `ended_at`",
            "date",
            "`ended_at >= started_at`; `ended` exige `ended_at`",
          ],
          ["`approved_by`, `approved_at`", "uuid, timestamptz", "Exigidos en `active`"],
        ],
      },
      {
        kind: "p",
        text: "Índices: único parcial `(company_id, person_id, role)` en `pending_review` y `active`; único `(company_id, submission_id, role)`; `(person_id)` en activos. Una FK compuesta impide usar la declaración de otra empresa y otra exige que la persona sea la de la declaración. Más adelante se puede admitir una empresa como integrante agregando `member_company_id` y exigiendo un único sujeto, sin rediseñar.",
      },
      { kind: "h3", text: "`company_beneficial_owners`: dueños y controlantes" },
      {
        kind: "p",
        text: "Es una tabla aparte porque responde otra pregunta: quién es dueño o controla, no quién actúa.",
      },
      {
        kind: "table",
        head: COLUMNS,
        rows: [
          ["`company_id`, `submission_id`, `person_id`", "uuid", "Igual que en `company_members`"],
          [
            "`control_type`",
            "text",
            "`CHECK IN ('direct_ownership','indirect_ownership','voting_control','management_control','other')`",
          ],
          [
            "`ownership_pct`",
            "numeric(5,2)",
            "Mayor que 0 y hasta 100; obligatorio en los dos tipos de propiedad",
          ],
          ["`control_detail`", "text", "Obligatorio con `other`"],
          [
            "`status`, `started_at`, `ended_at`, `approved_by`, `approved_at`",
            "",
            "Igual que en `company_members`",
          ],
        ],
      },
      {
        kind: "p",
        text: "Índice único parcial `(company_id, person_id, control_type)` en `pending_review` y `active`.",
      },
      { kind: "h3", text: "`onboarding_applications`: la solicitud de alta o revisión" },
      {
        kind: "p",
        text: "Resuelve las revisiones periódicas y los cambios de integrantes, y evita sumar columnas a `clientes`. Esta tabla no estaba en tu lista: si se descarta, sus estados vuelven a `clientes` y se pierde el historial de solicitudes.",
      },
      {
        kind: "table",
        head: COLUMNS,
        rows: [
          ["`customer_id`", "uuid", "`NOT NULL`, FK `clientes` `RESTRICT`"],
          [
            "`process`",
            "text",
            "`CHECK IN ('initial_onboarding','periodic_review','member_change','legacy_remediation')`",
          ],
          ["`status`", "text", "Ver estados"],
          [
            "`documents_status`, `kyc_status`, `compliance_status`",
            "text",
            "Ver estados; los calcula el servidor",
          ],
          ["`submitted_at`, `review_due_at`", "timestamptz", ""],
          ["`decided_by`, `decided_at`, `internal_reason`", "uuid, timestamptz, text", ""],
          ["`updated_at`", "timestamptz", "`NOT NULL`"],
        ],
      },
      {
        kind: "p",
        text: "Índices: único parcial `(customer_id)` en solicitudes abiertas; `(status, review_due_at)` para la cola de revisión.",
      },
      { kind: "h3", text: "`document_reviews`: decisiones sobre documentos" },
      { kind: "p", text: "Resuelve que recibido no signifique aprobado. Solo admite inserciones." },
      {
        kind: "table",
        head: COLUMNS,
        rows: [
          ["`document_id`", "uuid", "`NOT NULL`, FK `documentos` `RESTRICT`"],
          ["`decision`", "text", "`CHECK IN ('approved','rejected','needs_resubmission')`"],
          ["`internal_reason`", "text", "Obligatorio salvo en `approved`"],
          ["`reviewed_by`", "uuid", "`NOT NULL`, FK `backoffice_users`"],
          ["`reviewed_at`", "timestamptz", "`NOT NULL DEFAULT now()`"],
        ],
      },
      { kind: "p", text: "Índice `(document_id, reviewed_at DESC)`." },
      { kind: "h3", text: "`document_requirements`: qué se exige" },
      {
        kind: "p",
        text: "Resuelve que los requisitos varíen sin tocar código. Su contenido inicial debe aprobarlo Compliance.",
      },
      {
        kind: "table",
        head: COLUMNS,
        rows: [
          ["`process`", "text", "Igual que en la solicitud"],
          ["`customer_kind`", "text", "`CHECK IN ('fisica','juridica')`"],
          ["`subject_kind`", "text", "`CHECK IN ('person','company')`"],
          ["`member_role`", "text", "Nulo si aplica a todos"],
          ["`document_type`", "text", "`NOT NULL`"],
          ["`is_required`", "boolean", "`NOT NULL`"],
          ["`valid_from`, `valid_to`", "date", "`valid_to >= valid_from`"],
        ],
      },
      { kind: "h3", text: "`identity_verifications`: resultado de cada verificación" },
      {
        kind: "p",
        text: "Resuelve que recibir un documento no pruebe la identidad, y deja lista la integración. Sumar RENAPER no requiere cambiar la tabla. Solo admite inserciones.",
      },
      {
        kind: "table",
        head: COLUMNS,
        rows: [
          [
            "`person_id`, `customer_id`",
            "uuid",
            "FK `RESTRICT`; `CHECK (num_nonnulls(person_id, customer_id) = 1)`",
          ],
          [
            "`check_type`",
            "text",
            "`CHECK IN ('identity_document','government_identity','liveness','tax_id')`",
          ],
          ["`method`", "text", "`CHECK IN ('manual','provider')`"],
          [
            "`provider`, `provider_reference`",
            "text",
            "Únicos en conjunto; obligatorios con `provider`",
          ],
          ["`status`", "text", "`CHECK IN ('pending','passed','failed','inconclusive','error')`"],
          ["`result_summary`", "jsonb", "Resultado mínimo, nunca datos biométricos"],
          ["`evidence_document_id`", "uuid", "FK `documentos`"],
          ["`performed_by`", "uuid", "Obligatorio con `manual`"],
          ["`performed_at`, `expires_at`", "timestamptz", ""],
        ],
      },
      {
        kind: "p",
        text: "Índices `(person_id, check_type, performed_at DESC)` y `(customer_id, check_type, performed_at DESC)`.",
      },
      { kind: "h3", text: "`compliance_screenings`: controles contra listas" },
      {
        kind: "p",
        text: "Es una tabla aparte porque se repite en el tiempo aunque la identidad ya esté verificada. Solo admite inserciones: resolver una coincidencia agrega una fila nueva.",
      },
      {
        kind: "table",
        head: COLUMNS,
        rows: [
          ["`person_id`, `customer_id`", "uuid", "Igual que en verificaciones"],
          ["`list_name`, `list_version`", "text", "`list_name NOT NULL`"],
          [
            "`status`",
            "text",
            "`CHECK IN ('pending','clear','potential_match','false_positive','confirmed_match','error')`",
          ],
          ["`matched_entry`", "jsonb", ""],
          ["`resolves_id`", "uuid", "FK a la misma tabla"],
          [
            "`run_by`, `run_at`",
            "uuid, timestamptz",
            "`run_by` nulo si corrió un proceso automático",
          ],
        ],
      },
      { kind: "h3", text: "`compliance_cases`: la decisión sobre la cuenta" },
      {
        kind: "p",
        text: "Resuelve que un resultado no cambie una cuenta por sí solo. Cada caso guarda la cuenta alcanzada, la persona si corresponde, qué lo originó, su prioridad, y al resolverse la decisión, el motivo, el responsable y la fecha. Hay un solo caso abierto por cuenta, origen y persona. Un caso resuelto no se modifica.",
      },
      { kind: "h3", text: "Reportes" },
      {
        kind: "p",
        text: "**`report_code_mappings`** resuelve que un cambio de código oficial no toque las tablas de negocio: `report_type`, `format_version`, `field`, `internal_value`, `official_code`, `valid_from`, `valid_to`, con unicidad por reporte, formato, campo, valor y vigencia.",
      },
      {
        kind: "p",
        text: "**`regulatory_report_runs`** resuelve la trazabilidad de cada generación: `report_type`, `period`, `format_version`, `version`, `status`, `input_snapshot jsonb`, `validation_result jsonb`, `file_path`, `content_hash`, `generated_by`, `generated_at`, `filed_at`, `filed_by`, con `UNIQUE (report_type, period, version)`. BCRA sigue en `bcra_presentaciones`, que ya funciona así.",
      },
      { kind: "h3", text: "Tablas que descarté" },
      {
        kind: "list",
        items: [
          "**Tabla de auditoría nueva:** ya existe `security_events`, y los responsables quedan en cada tabla.",
          "**Historial de `people`:** lo dan las declaraciones aplicadas.",
          "**Filas de reporte aparte:** el `jsonb` repite el patrón de `bcra_presentaciones`.",
          "**Supertipo de personas y empresas:** no hace falta mientras los integrantes sean personas físicas.",
        ],
      },
    ],
  },
  {
    id: "integridad",
    title: "Reglas de integridad",
    blocks: [
      { kind: "p", text: "**Las garantiza el esquema, aunque falle la aplicación:**" },
      {
        kind: "list",
        items: [
          "Una identidad por persona: `tax_id` único e identificación por país, tipo y número única.",
          "Una cuenta PF por persona: `clientes.person_id` único.",
          "Un perfil por empresa, solo en cuentas jurídicas: clave primaria y FK compuesta.",
          "Integrantes y beneficiarios son personas físicas: su FK apunta a `people`.",
          "Sin relaciones activas duplicadas: índices únicos parciales.",
          "La declaración usada pertenece a esa empresa: FK compuesta.",
          "Porcentajes válidos: `CHECK` de rango y de obligatoriedad.",
          "Sujeto único en verificaciones y controles: `num_nonnulls = 1`.",
          "Sin borrado accidental de evidencia: FK con `RESTRICT`.",
        ],
      },
      { kind: "p", text: "**Las garantizan triggers, porque el esquema no puede expresarlas:**" },
      {
        kind: "list",
        items: [
          "Revisiones, verificaciones, controles y reportes generados no se editan ni se borran.",
          "La suma de `direct_ownership` activa por empresa no supera 100%, con bloqueo de la empresa para evitar carreras.",
          "Quien revisa un documento no es quien lo subió.",
          "Los estados calculados no se escriben de forma directa.",
          "Un no admin no cambia `estado`, límites, CBU, alias, CUIT, legajo, correo ni `tipo_persona` en `clientes`.",
          "Una cuenta jurídica no pasa de `registrado` a `preactivado` sin una solicitud aprobada.",
        ],
      },
      {
        kind: "p",
        text: "**Las garantizan funciones de servidor, porque son operaciones de negocio:**",
      },
      {
        kind: "list",
        items: [
          "**Enviar una solicitud:** exige perfil completo, documentos requeridos y al menos un representante legal.",
          "**Vincular persona:** registra quién decidió y por qué. Si existe un candidato, siempre pasa por revisión; solo sin candidato se crea una persona nueva, con KYC `not_started`.",
          "**Aprobar una solicitud:** exige que todos los estados requeridos estén aprobados y deja registrado al responsable.",
          "**Terminar una relación:** completa `ended_at` en lugar de borrar la fila.",
        ],
      },
      {
        kind: "p",
        text: "Cada función usa `SECURITY DEFINER` con `search_path = ''`, valida `auth.uid()` y permisos, revoca la ejecución de `PUBLIC` y `anon`, y registra el evento en `security_events`.",
      },
    ],
  },
  {
    id: "permisos",
    title: "Matriz de permisos",
    blocks: [
      {
        kind: "p",
        text: 'L = leer, C = crear, M = modificar. "Propio" significa de su cuenta, resuelta por `auth.uid()`. En las tablas nuevas, lo que puede hacer un cliente siempre pasa por una función de servidor, nunca por la tabla.',
      },
      {
        kind: "table",
        head: [
          "Recurso",
          "Anónimo",
          "Cuenta PF",
          "Cuenta empresa",
          "Analista KYC",
          "Compliance",
          "Reportes",
        ],
        rows: [
          ["`clientes`: contacto", "—", "L, M propio", "L, M propio", "L, M", "L", "L"],
          [
            "`clientes`: estado, límites, CBU, CUIT",
            "—",
            "L propio",
            "L propio",
            "L; M con permiso",
            "L",
            "L",
          ],
          ["`people`", "—", "Función: la suya", "—", "L", "L", "Vista"],
          [
            "`person_submissions`",
            "—",
            "L, C propias (función)",
            "L, C propias (función)",
            "L, decide",
            "L",
            "—",
          ],
          [
            "`company_profiles`",
            "—",
            "—",
            "L propio; M hasta enviar (función)",
            "L, M",
            "L",
            "Vista",
          ],
          [
            "`company_members`",
            "—",
            "—",
            "L propio; C, termina (función)",
            "L, aprueba",
            "L",
            "Vista",
          ],
          [
            "`company_beneficial_owners`",
            "—",
            "—",
            "L propio; C, termina (función)",
            "L, aprueba",
            "L",
            "Vista",
          ],
          [
            "`onboarding_applications`",
            "—",
            "L, sin motivo interno",
            "L, sin motivo interno",
            "L, M",
            "L, M",
            "—",
          ],
          ["`documentos` y archivos", "—", "L, C propios", "L, C propios", "L", "L", "—"],
          [
            "`document_reviews`",
            "—",
            "Solo el estado resultante",
            "Solo el estado resultante",
            "L, C",
            "L",
            "—",
          ],
          [
            "`identity_verifications`",
            "—",
            "Solo el estado resultante",
            "Solo el estado de la relación",
            "L, C",
            "L",
            "—",
          ],
          ["`compliance_screenings`", "—", "—", "—", "L", "L, C", "—"],
          ["`document_requirements`", "—", "L", "L", "L", "L, M", "—"],
          ["`report_code_mappings`", "—", "—", "—", "—", "L", "L, M"],
          ["`regulatory_report_runs`", "—", "—", "—", "—", "L", "L, C"],
        ],
      },
      {
        kind: "p",
        text: "Nadie elimina filas de estas tablas desde el frontend. El superadmin hereda los permisos del backoffice, pero tampoco puede alterar las tablas de solo inserción.",
      },
      { kind: "p", text: "**Reglas de privacidad:**" },
      {
        kind: "list",
        items: [
          "Una empresa ve lo que ella declaró y el estado resumido de su integrante, nunca `people` directamente.",
          "El mensaje a una cuenta nunca revela si un CUIL ya existe ni el motivo de un rechazo.",
          "Los archivos no se leen desde Storage de forma directa: `doc-url` firma el enlace después de validar propietario o permiso.",
          "Se suben con un enlace emitido por el servidor, en la ruta `{legajo}/{document_id}.{ext}`.",
        ],
      },
      { kind: "p", text: "**Correcciones de seguridad previas al modelo:**" },
      {
        kind: "list",
        items: [
          "Eliminar `kyc_select_authenticated`, que deja leer todos los documentos a cualquier usuario autenticado.",
          "Reemplazar en `doc-url` la regla de correo `@mollypay.com` por `es_backoffice()` y un permiso.",
          "Quitar la escritura del cliente en `validaciones` y `documentos`.",
          "Hacer que `crear-cliente` tome la identidad de la sesión.",
          "Comprobar si `cleanup`, `test-sign` y `turl` están desplegadas, y retirarlas.",
        ],
      },
      {
        kind: "p",
        text: "Se agregan tres permisos RBAC: `customers.kyc.review`, `customers.compliance.review` y `reports.afip.generate`.",
      },
    ],
  },
  {
    id: "estados",
    title: "Estados y transiciones",
    blocks: [
      { kind: "p", text: "Cada estado responde una sola pregunta y tiene un único responsable." },
      {
        kind: "table",
        head: ["Estado", "Dónde vive", "Quién lo cambia", "Transiciones permitidas"],
        rows: [
          [
            "Cuenta",
            "`clientes.estado`",
            "Backoffice",
            "`pendiente_verificacion` → `registrado` → `preactivado` → `activado` ↔ `suspendido`; → `deshabilitado`",
          ],
          [
            "Onboarding",
            "`onboarding_applications.status`",
            "Cliente al enviar; analista al decidir",
            "`draft` → `submitted` → `in_review` → `approved` / `rejected` / `changes_requested`; `changes_requested` → `submitted`; `draft` → `cancelled`",
          ],
          [
            "Documento",
            "`documentos.status`",
            "Revisión o nueva versión",
            "`received` → `approved` / `rejected`; `approved` → `expired`; cualquiera → `superseded`",
          ],
          [
            "Documentación de la solicitud",
            "`documents_status`",
            "Calculado",
            "`missing` ↔ `received` → `approved` / `rejected`; `approved` → `expired`",
          ],
          [
            "KYC de la persona",
            "`people.kyc_status`",
            "Calculado desde verificaciones",
            "`not_started` / `legacy_unverified` → `pending` → `passed` / `failed`; `failed` → `pending`; `passed` → `expired` → `pending`",
          ],
          [
            "KYC de la solicitud",
            "`kyc_status`",
            "Calculado",
            "`pending` → `passed` / `failed`; `passed` solo si pasan todas las personas requeridas",
          ],
          [
            "Compliance",
            "`people.compliance_status`, `compliance_status`",
            "Calculado desde controles",
            "`not_screened` → `pending` → `clear` / `potential_match`; `potential_match` → `clear` / `confirmed_match`; `clear` → `pending` al repetir el control",
          ],
          [
            "Relación",
            "`status` de integrantes y beneficiarios",
            "Analista",
            "`pending_identity` → `pending_review` → `active` → `ended`; pendiente → `rejected`",
          ],
        ],
      },
      { kind: "p", text: "**Aprobar una empresa exige todo esto a la vez:**" },
      {
        kind: "list",
        ordered: true,
        items: [
          "Perfil de empresa completo.",
          "Al menos un `legal_representative` activo.",
          "Documentos requeridos aprobados, de la empresa y de cada persona.",
          "KYC `passed` en cada persona requerida.",
          "Compliance `clear` en la empresa y sus personas requeridas.",
        ],
      },
      {
        kind: "p",
        text: "Ana puede tener su KYC `passed` y su relación con la empresa B en `pending_review`: una identidad verificada no aprueba sus relaciones. Si un control de Ana pasa a `confirmed_match`, se abre un caso en cada cuenta alcanzada, sin cambiar ninguna hasta que Compliance decida. Una solicitud cerrada no se reabre.",
      },
      {
        kind: "p",
        text: "Los valores `activo` y `rechazado` de `clientes.estado` son heredados. Se dejan de escribir, pero se retiran solo cuando no queden filas ni consumidores. Mientras haya pantallas antiguas, `estado_onboarding` y `onboarding_completo` se mantienen desde la solicitud.",
      },
    ],
  },
  {
    id: "ejemplo-ana",
    title: "Ejemplo: Ana con cuenta PF y dos empresas",
    blocks: [
      {
        kind: "p",
        text: "Ana tiene cuenta PF, es representante legal de la empresa A y apoderada de la empresa B. Los datos son ficticios.",
      },
      {
        kind: "table",
        head: ["Paso", "Qué ocurre", "Filas que quedan"],
        rows: [
          [
            "1. Ana abre su cuenta PF",
            "Declara su CUIL y no hay candidato, así que se crea la persona. El flujo PF no cambia",
            "`people` P1, KYC `not_started`; `person_submissions` S1 `applied`; `clientes` LPF con `person_id = P1`",
          ],
          [
            "2. El analista revisa su DNI",
            "Registra el resultado",
            "`document_reviews` en `approved`; `identity_verifications` en `passed`; P1 con KYC `passed`",
          ],
          [
            "3. La empresa A declara a Ana",
            "El CUIL coincide con P1, pero no se vincula solo. La empresa no recibe ningún aviso de la coincidencia",
            "S2 `pending_match`; `company_members` M1 en `pending_identity`, sin persona",
          ],
          [
            "4. El analista vincula",
            "Compara los datos y decide",
            "S2 `applied`, `existing_person`, con responsable; M1 con `person_id = P1`, en `pending_review`",
          ],
          ["5. Se aprueba la relación", "La empresa A pasa sus controles", "M1 en `active`"],
          [
            "6. La empresa B declara a Ana con otro domicilio",
            "Mismo proceso. El domicilio distinto no pisa P1",
            "S3 pendiente; `company_members` M2, rol `attorney`; poder subido por B",
          ],
          [
            "7. El analista vincula sin aplicar el domicilio",
            "La relación queda vinculada, pero B sigue pendiente de sus documentos",
            "S3 `linked`, con motivo; M2 en `pending_review`",
          ],
        ],
      },
      { kind: "p", text: "El resultado es una sola identidad y dos relaciones independientes:" },
      {
        kind: "code",
        text: `people: P1 (Ana)
├─ clientes: LPF-27...            person_id = P1
├─ company_members M1: empresa A, legal_representative, active
└─ company_members M2: empresa B, attorney, pending_review`,
      },
      { kind: "p", text: "**Qué ve cada uno:**" },
      {
        kind: "table",
        head: ["Actor", "Ve", "No ve"],
        rows: [
          ["Ana, en su cuenta PF", "Su identidad y sus documentos", "Las declaraciones de A y B"],
          [
            "Empresa A",
            "S2, sus documentos y el estado de M1",
            "P1, S3, el poder de B, la cuenta PF",
          ],
          [
            "Empresa B",
            "S3, sus documentos y el estado de M2",
            "P1, S2, los documentos de A, si Ana ya tenía KYC",
          ],
          ["Analista", "Todo lo necesario para decidir", "Nada oculto"],
        ],
      },
      {
        kind: "p",
        text: "Decidir si el KYC de P1 se reutiliza para B o se repite es una decisión de Compliance. El modelo soporta ambas opciones.",
      },
      {
        kind: "p",
        text: "**Límite actual:** la sesión usa un correo por cuenta, así que Ana necesita un correo distinto en cada cuenta a la que entre. El acceso con un solo usuario se puede agregar después, sin cambiar estas tablas.",
      },
    ],
  },
  {
    id: "reportes",
    title: "Ejemplo: datos regulatorios",
    blocks: [
      {
        kind: "p",
        text: "Las tablas guardan el negocio, y cada reporte se arma en capas, sin columnas con forma de formulario:",
      },
      {
        kind: "code",
        text: "tablas -> vista por reporte -> códigos oficiales -> validación -> foto versionada -> archivo",
      },
      {
        kind: "p",
        text: "**Ejemplo con los integrantes de la empresa A, período noviembre de 2026:**",
      },
      {
        kind: "p",
        text: "**1. Vista.** `v_report_company_members` une `company_members`, `people` y `clientes`. Toma las relaciones vigentes en el período por sus fechas, no las activas de hoy, y solo personas vinculadas y aprobadas.",
      },
      {
        kind: "table",
        head: [
          "Empresa",
          "Carácter interno",
          "Tipo de documento",
          "Documento",
          "Apellido y nombre",
        ],
        rows: [["30-XXXXXXXX-X", "`legal_representative`", "DNI", "XXXXXXXX", "Pérez, Ana"]],
      },
      {
        kind: "p",
        text: "**2. Códigos.** `report_code_mappings` traduce `legal_representative` al código oficial de esa versión del formato. Si falta una equivalencia, la generación se marca como fallida y no se inventa un valor.",
      },
      {
        kind: "p",
        text: "**3. Validación.** Se registra en `validation_result`: datos obligatorios vacíos, equivalencias faltantes o empresas sin representante.",
      },
      {
        kind: "p",
        text: "**4. Foto.** `regulatory_report_runs` guarda los datos usados, la versión del formato, quién generó el reporte y el hash del archivo. Una corrección crea otra versión y nunca altera la anterior.",
      },
      { kind: "p", text: "**De dónde sale cada grupo de datos:**" },
      {
        kind: "table",
        head: ["Reporte", "Dato", "Origen"],
        rows: [
          ["F.8126, titular", "Identificación, fecha de alta, legajo", "`clientes`, `people`"],
          [
            "F.8126, registro 04",
            "Carácter, documento, nombre, nacionalidad",
            "`company_members`, `people`",
          ],
          ["F.8125", "Rubro de actividad", "`company_profiles.activity_code`"],
          ["BCRA, padrón", "Tipo societario, código postal", "`company_profiles`, `clientes.cp`"],
          ["BCRA, Apartado B", "Clasificación de la cuenta", "`clientes.account_classification`"],
          ["BCRA, clientes registrados", "Cantidades", "`clientes`, sin contar integrantes"],
          [
            "PLAFT, a confirmar",
            "Beneficiarios finales y controles",
            "`company_beneficial_owners`, `compliance_screenings`",
          ],
        ],
      },
      {
        kind: "p",
        text: "**Regla central:** un reporte nunca usa `person_submissions` sin aplicar, salvo que Compliance decida lo contrario, y marcándolo como dato declarado.",
      },
      {
        kind: "p",
        text: "**Esta tabla no prueba cumplimiento.** Sale de tu documento y del código actual. Las pantallas actuales de F.8125 y F.8126 usan filas de ejemplo, y todavía hay que contrastar los campos con las especificaciones oficiales y con Compliance.",
      },
    ],
  },
  {
    id: "migracion",
    title: "Plan de migración",
    blocks: [
      {
        kind: "p",
        text: "Cada paso se aprueba por separado. Aprobar este diseño no autoriza ejecutar ninguno, y las ejecuciones en producción las haces tú.",
      },
      {
        kind: "table",
        head: ["Paso", "Qué hace", "Criterio para avanzar", "Criterio para revertir o frenar"],
        rows: [
          [
            "0. Auditoría",
            "Solo lectura, con las consultas de abajo",
            "Resultados revisados y respaldo con restauración probada",
            "Hallazgos que contradigan este diseño: se ajusta antes de seguir",
          ],
          [
            "1. Seguridad",
            "Corrige políticas, `doc-url`, `crear-cliente` y funciones de prueba",
            "Pruebas por rol: cada cliente lee solo lo suyo, y el backoffice sigue operando",
            "Se rompe el login, el alta o el backoffice: se restauran las políticas guardadas, sin reabrir la lectura global de KYC",
          ],
          [
            "2. Estructura",
            "Crea tablas y columnas, sin consumidores",
            "Migración aplicada y RLS activo en todas las tablas nuevas",
            "Falla la migración: una transacción deja todo como estaba",
          ],
          [
            "3. Datos",
            "Migra con un script repetible",
            "Los conteos cierran sin diferencias",
            "Diferencias sin explicar: se vacían las tablas nuevas y se corrige",
          ],
          [
            "4. Revisión",
            "Resuelve duplicados e incompletos",
            "Cola revisada por el backoffice y Compliance",
            "Datos dudosos: quedan en la cola, nunca se fuerzan",
          ],
          [
            "5. Empresas nuevas",
            "Flujo nuevo detrás de un interruptor",
            "Alta completa en entorno de prueba y luego con pocos casos",
            "Errores en el alta: se apaga el interruptor y se conservan las filas",
          ],
          [
            "6. Escritura PF",
            "El servidor también crea la declaración, sin cambios de pantalla. Se activa la regla de documentos personales y de empresa",
            "Flujo PF idéntico, con conteos al día",
            "Falla el alta PF: se apaga la doble escritura",
          ],
          [
            "7. Lecturas",
            "Backoffice y reportes leen el modelo nuevo, módulo por módulo",
            "Reportes comparados con los anteriores",
            "Diferencias: ese módulo vuelve a leer lo anterior",
          ],
          [
            "8. Retiro",
            "Elimina columnas viejas",
            "Sin consumidores en código ni en base, con tu confirmación aparte",
            "Es irreversible, por eso requiere un respaldo nuevo",
          ],
        ],
      },
      { kind: "p", text: "**Reglas para migrar los datos:**" },
      {
        kind: "table",
        head: ["Dato existente", "Regla"],
        rows: [
          [
            "Cuenta física con CUIT válido",
            "Crea persona, declaración `legacy_migration` y vínculo; KYC `legacy_unverified`",
          ],
          ["CUIT provisorio que empieza con 99", "No se migra: el alta todavía no terminó"],
          ["CUIT duplicado o con verificador inválido", "Va a revisión manual; no crea persona"],
          ["Cuenta jurídica", "Crea `company_profiles` con `coalesce(nombre_legal, nombre)`"],
          [
            "Representante de una empresa existente",
            "**No se inventa.** Se abre una solicitud `legacy_remediation`",
          ],
          [
            "`es_pep` y nacimiento en cuentas jurídicas",
            "No se copian, porque no se sabe de quién son",
          ],
          [
            "Documentos personales de cuentas jurídicas",
            "Sin persona asignada hasta completar al representante",
          ],
          [
            "`es_pep` en cuentas físicas",
            "Se copia solo si Compliance confirma que `false` significa declarado; si no, queda nulo",
          ],
          [
            "`auth_user_id`",
            "Solo con correo confirmado, una única cuenta y usuario, y sin vínculos previos. El resto va a revisión",
          ],
          [
            "`validaciones` existentes",
            "Se conservan y no se convierten en verificaciones, porque hoy solo registran el alta",
          ],
        ],
      },
      {
        kind: "p",
        text: "Las empresas existentes siguen operando durante la remediación, salvo que Compliance fije otra cosa.",
      },
      { kind: "p", text: "**Controles que deben cerrar en el paso 3:**" },
      {
        kind: "list",
        items: [
          "Cuentas físicas reales = personas vinculadas + cola de revisión.",
          "Cuentas jurídicas = `company_profiles`.",
          "Cada persona creada tiene al menos una declaración aplicada.",
          "Ninguna persona quedó con KYC `passed`.",
          "`clientes` y `documentos` no perdieron filas.",
        ],
      },
      { kind: "p", text: "**Consultas de auditoría del paso 0.** Son de solo lectura:" },
      { kind: "code", text: AUDIT_SQL },
    ],
  },
  {
    id: "riesgos",
    title: "Riesgos y decisiones pendientes",
    blocks: [
      { kind: "h3", text: "Decisiones de Compliance" },
      {
        kind: "p",
        text: "Ninguna de estas se da por aprobada. El modelo admite cualquiera de las opciones.",
      },
      {
        kind: "table",
        head: ["#", "Decisión", "Qué bloquea"],
        rows: [
          [
            "1",
            "¿Se acepta la revisión manual de KYC hasta tener proveedores?",
            "Aprobar empresas nuevas",
          ],
          [
            "2",
            "¿Sirve la selfie de un integrante subida por el representante?",
            "Definir la carga de integrantes",
          ],
          [
            "3",
            "¿Se reutiliza el KYC de una persona entre empresas? ¿Por cuánto tiempo es válido?",
            "`expires_at` y el caso de Ana",
          ],
          [
            "4",
            "¿Debe avisarse o pedirse consentimiento a quien es declarado por una empresa?",
            "Vinculación de personas",
          ],
          [
            "5",
            "¿Qué documentos exige cada tipo de persona, carácter y proceso?",
            "`document_requirements`",
          ],
          [
            "6",
            "¿Cuál es el umbral y la definición de beneficiario final?",
            "`company_beneficial_owners`",
          ],
          [
            "7",
            "¿Qué plazo tienen las empresas existentes para completar a su representante?",
            "Remediación",
          ],
          [
            "8",
            "¿Qué se hace con los clientes ya activados, sin KYC registrado?",
            "`legacy_unverified`",
          ],
          [
            "9",
            "¿Qué se conserva, cuánto tiempo y qué se borra en un alta no concretada?",
            "Borrado y anonimización",
          ],
          ["10", '¿Qué ocurre al vencer las 24 horas de "En validación"?', "`review_due_at`"],
          ["11", "¿Los campos alcanzan para F.8125, F.8126 y BCRA?", "Reportes"],
        ],
      },
      { kind: "h3", text: "Riesgos técnicos" },
      {
        kind: "table",
        head: ["Riesgo", "Consecuencia", "Mitigación"],
        rows: [
          [
            "El diseño no se contrastó con la base real",
            "Puede haber políticas o datos distintos",
            "Paso 0 antes de escribir migraciones",
          ],
          [
            "Sesión resuelta por correo",
            "Cambiar un correo puede cortar el acceso",
            "`auth_user_id` en tablas nuevas; lo anterior se migra aparte",
          ],
          [
            "El backoffice escribe `clientes` desde el frontend",
            "Las transiciones no son atómicas",
            "Trigger de protección ahora; funciones de servidor después",
          ],
          [
            "`documentos` y otras tablas borran en cascada con el cliente",
            "Se puede perder evidencia",
            "Cambiar a `RESTRICT` junto con la decisión 9",
          ],
          [
            "`legajo` es clave natural sin `ON UPDATE CASCADE`",
            "Corregir un CUIT puede fallar",
            "Tablas nuevas con `customer_id`; se corrige aparte",
          ],
          [
            "Datos personales en `declared` y en el borrador del navegador",
            "Mayor exposición",
            "RLS estricto, y reducir el borrador antes del flujo PJ",
          ],
          [
            "Datos duplicados durante la transición",
            "Lecturas distintas según el módulo",
            "Una fuente definida por dato y retiro en el paso 8",
          ],
          [
            "Clientes de prueba con CUIT inválido",
            "Engrosan la cola de revisión",
            "Se limpian o se excluyen con tu aprobación",
          ],
        ],
      },
      { kind: "h3", text: "Por qué escala" },
      {
        kind: "table",
        head: ["Crecimiento", "Qué cambia"],
        rows: [
          [
            "Más integrantes, empresas o relaciones",
            "Solo filas, con índices por empresa y persona",
          ],
          ["Un carácter o documento nuevo", "Se amplía una lista o se agrega un requisito"],
          [
            "RENAPER, prueba de vida, AFIP o REPET",
            "Filas con `method = 'provider'` y una Edge Function",
          ],
          ["Revisiones periódicas", "Una solicitud nueva"],
          ["Un formato de reporte nuevo", "Una vista y sus códigos"],
          ["Una empresa como integrante", "Una columna y un `CHECK`"],
          ["Un solo usuario con varias cuentas", "Una tabla de accesos, sin tocar la identidad"],
        ],
      },
      {
        kind: "p",
        text: "**Fuera de este diseño:** integraciones reales, acceso de integrantes al portal, renombre de tablas y cambio de `legajo` como clave.",
      },
    ],
  },
  {
    id: "anexo-sql",
    title: "Anexo: SQL de referencia",
    blocks: [
      {
        kind: "p",
        text: "Es el esquema que implementaría esta propuesta, para que tu dev lo revise. No es una migración y no se ejecutó en tu base. Antes de convertirlo en una, hay que contrastarlo con la auditoría del paso 0 y resolver la comprobación pendiente.",
      },
      {
        kind: "details",
        summary: "Ver tablas, restricciones, triggers, funciones y permisos",
        text: ONBOARDING_DDL,
      },
    ],
  },
];
