type ErdBox = { name: string; x: number; y: number; w: number; lines: string[]; tone?: "existing" };
type ErdEdge = { d: string; label: string; lx: number; ly: number };

const BOX_HEIGHT = 112;

const BOXES: ErdBox[] = [
  {
    name: "people",
    x: 40,
    y: 60,
    w: 260,
    lines: ["PK id", "UQ tax_id", "UQ país + tipo + número"],
  },
  {
    name: "clientes (existente)",
    x: 400,
    y: 60,
    w: 260,
    tone: "existing",
    lines: ["PK id · UQ (id, tipo_persona)", "FK person_id → people", "UQ legajo, auth_user_id"],
  },
  {
    name: "onboarding_applications",
    x: 760,
    y: 60,
    w: 260,
    lines: ["PK id · FK customer_id", "UQ parcial: una abierta", "4 estados del proceso"],
  },
  {
    name: "person_submissions",
    x: 40,
    y: 250,
    w: 260,
    lines: [
      "PK id · FK person_id (nulo)",
      "FK submitted_by_customer_id",
      "UQ (id, submitted_by_customer_id)",
    ],
  },
  {
    name: "company_profiles",
    x: 400,
    y: 250,
    w: 260,
    lines: ["PK customer_id", "FK (customer_id, person_kind)", "→ clientes (id, tipo_persona)"],
  },
  {
    name: "documentos (existente)",
    x: 760,
    y: 250,
    w: 260,
    tone: "existing",
    lines: ["PK id · FK cliente_legajo", "FK submission_id (nulo)", "FK supersedes_id"],
  },
  {
    name: "company_members",
    x: 40,
    y: 440,
    w: 260,
    lines: [
      "PK id · FK company_id",
      "FK submission_id, person_id",
      "UQ parcial: empresa + persona + rol",
    ],
  },
  {
    name: "company_beneficial_owners",
    x: 400,
    y: 440,
    w: 260,
    lines: [
      "PK id · FK company_id",
      "FK submission_id, person_id",
      "UQ parcial: empresa + persona + control",
    ],
  },
  {
    name: "document_reviews",
    x: 760,
    y: 440,
    w: 260,
    lines: ["PK id · FK document_id", "FK reviewed_by", "Solo inserciones"],
  },
];

const SUPPORT: ErdBox[] = [
  {
    name: "identity_verifications",
    x: 56,
    y: 668,
    w: 300,
    lines: ["FK person_id o customer_id, uno solo", "Solo inserciones"],
  },
  {
    name: "compliance_screenings",
    x: 380,
    y: 668,
    w: 300,
    lines: ["FK person_id o customer_id, uno solo", "Solo inserciones"],
  },
  {
    name: "onboarding_requirements",
    x: 704,
    y: 668,
    w: 300,
    lines: ["Catálogo, sin FK", "Por proceso, persona y rol"],
  },
  {
    name: "report_code_mappings",
    x: 56,
    y: 768,
    w: 300,
    lines: ["UQ reporte + formato + campo + valor"],
  },
  {
    name: "regulatory_report_runs",
    x: 380,
    y: 768,
    w: 300,
    lines: ["UQ reporte + período + versión"],
  },
];

SUPPORT.push({
  name: "compliance_cases",
  x: 704,
  y: 768,
  w: 300,
  lines: ["FK customer_id · decisión con responsable"],
});

SUPPORT.push(
  { name: "record_versions", x: 56, y: 868, w: 300, lines: ["Foto de cada cambio, con vigencia"] },
  {
    name: "onboarding_statistics",
    x: 380,
    y: 868,
    w: 300,
    lines: ["Totales, sin identificadores"],
  },
);

const EDGES: ErdEdge[] = [
  { d: "M300 116 H400", label: "1 : 0..1", lx: 350, ly: 106 },
  { d: "M660 116 H760", label: "1 : N", lx: 710, ly: 106 },
  { d: "M170 172 V250", label: "0..1 : N", lx: 178, ly: 216 },
  { d: "M450 172 V211 H260 V250", label: "1 : N", lx: 355, ly: 203 },
  { d: "M530 172 V250", label: "1 : 0..1", lx: 538, ly: 216 },
  { d: "M620 172 V211 H890 V250", label: "1 : N", lx: 755, ly: 203 },
  { d: "M170 362 V440", label: "1 : N", lx: 178, ly: 406 },
  { d: "M450 362 V401 H260 V440", label: "1 : N", lx: 355, ly: 393 },
  { d: "M530 362 V440", label: "1 : N", lx: 538, ly: 406 },
  { d: "M890 362 V440", label: "1 : N", lx: 898, ly: 406 },
  { d: "M40 116 H20 V496 H40", label: "0..1 : N", lx: 26, ly: 310 },
];

function Box({ box, height }: { box: ErdBox; height: number }) {
  return (
    <g>
      <rect
        x={box.x}
        y={box.y}
        width={box.w}
        height={height}
        rx={8}
        className={
          box.tone === "existing" ? "fill-muted stroke-primary" : "fill-card stroke-border"
        }
        strokeWidth={box.tone === "existing" ? 2 : 1}
      />
      <text
        x={box.x + 12}
        y={box.y + 24}
        fontSize={14}
        fontWeight={600}
        className="fill-foreground"
      >
        {box.name}
      </text>
      {box.lines.map((line, i) => (
        <text
          key={line}
          x={box.x + 12}
          y={box.y + 46 + i * 19}
          fontSize={12}
          className="fill-muted-foreground"
        >
          {line}
        </text>
      ))}
    </g>
  );
}

export function ProposalErd() {
  return (
    <div className="my-4 overflow-x-auto rounded-lg border bg-background p-2">
      <svg
        viewBox="0 0 1040 960"
        role="img"
        aria-label="Modelo relacional de personas, cuentas, empresas y KYC"
        className="min-w-[760px] w-full"
      >
        <defs>
          <marker
            id="erd-arrow"
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M0 0L10 5L0 10z" className="fill-muted-foreground" />
          </marker>
        </defs>
        <text x={20} y={32} fontSize={15} fontWeight={600} className="fill-foreground">
          Una identidad, varias relaciones: todo vínculo nace de una declaración
        </text>
        {EDGES.map((edge) => (
          <g key={edge.d}>
            <path
              d={edge.d}
              fill="none"
              strokeWidth={1.5}
              className="stroke-muted-foreground"
              markerEnd="url(#erd-arrow)"
            />
            <text x={edge.lx} y={edge.ly} fontSize={11} className="fill-muted-foreground">
              {edge.label}
            </text>
          </g>
        ))}
        {BOXES.map((box) => (
          <Box key={box.name} box={box} height={BOX_HEIGHT} />
        ))}
        <rect
          x={40}
          y={620}
          width={980}
          height={324}
          rx={8}
          fill="none"
          strokeDasharray="5 4"
          className="stroke-border"
        />
        <text x={56} y={648} fontSize={13} fontWeight={600} className="fill-foreground">
          Historial, requisitos y reportes
        </text>
        {SUPPORT.map((box) => (
          <Box key={box.name} box={box} height={box.lines.length > 1 ? 88 : 66} />
        ))}
      </svg>
    </div>
  );
}
