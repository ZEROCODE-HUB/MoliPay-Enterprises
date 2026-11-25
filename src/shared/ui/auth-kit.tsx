import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type InputHTMLAttributes,
  type Ref,
} from "react";
import { PASSWORD_RULES } from "@/shared/validation/password";
import { Link } from "@tanstack/react-router";
import {
  Check,
  Eye,
  EyeOff,
  UploadCloud,
  Camera,
  FileText,
  X,
  ShieldCheck,
  Loader2,
} from "lucide-react";
import { MollyLogo } from "@/shared/ui/molly-logo";
import loginBg from "@/assets/login-hero.jpg";

/* ============ AuthShell (split-screen) ============ */

export function AuthShell({
  children,
  leftEyebrow = "MoliPay · Onboarding",
  leftTitle = "Tus datos están protegidos bajo normativa BCRA",
  leftBody,
  step,
}: {
  children: ReactNode;
  leftEyebrow?: string;
  leftTitle?: string;
  leftBody?: string;
  step?: string;
}) {
  return (
    <div className="min-h-screen grid lg:grid-cols-2 overflow-x-hidden bg-plata-50">
      <aside className="relative hidden lg:flex flex-col justify-between p-10 xl:p-12 overflow-hidden select-none text-white">
        <div className="absolute inset-0">
          <img src={loginBg} alt="" aria-hidden className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-br from-black/85 via-black/70 to-black/50" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/20" />
        </div>

        <div className="relative z-10">
          <Link to="/" className="inline-flex">
            <span className="bg-card rounded-md px-3.5 py-2 shadow-sm">
              <MollyLogo size={30} />
            </span>
          </Link>
          <div className="mt-12">
            <div className="flex items-center gap-2 mb-6">
              <span className="w-6 h-px bg-red-400/60" />
              <span className="font-sans text-xs font-medium text-red-400/80">{leftEyebrow}</span>
            </div>
            <h2 className="text-[clamp(1.5rem,2vw,2rem)] font-light leading-[1.12] tracking-tight max-w-[22ch] text-white">
              {leftTitle}
            </h2>
            {leftBody && (
              <p className="mt-5 max-w-[34ch] text-white/65 leading-relaxed text-sm">{leftBody}</p>
            )}
          </div>
        </div>

        <div className="relative z-10 space-y-5">
          <div className="inline-flex items-center gap-2.5 px-3 py-2 border border-red-400/30 rounded-md bg-red-500/5 backdrop-blur">
            <ShieldCheck size={13} strokeWidth={1.5} className="text-red-400" />
            <span className="font-sans text-xs font-medium text-red-400">Registrado ante BCRA</span>
          </div>
          {step && <p className="text-white/45 font-sans text-xs font-medium">{step}</p>}
          <p className="text-white/35 text-[11px]">© {new Date().getFullYear()} MoliPay</p>
        </div>
      </aside>

      <main className="flex flex-col">
        <div className="lg:hidden px-6 py-4 flex items-center justify-between bg-black text-white">
          <Link to="/" className="inline-flex items-center gap-2">
            <span className="bg-card rounded-md px-2.5 py-1.5">
              <MollyLogo size={24} />
            </span>
          </Link>
        </div>

        <div className="flex-1 flex items-start lg:items-center justify-center px-5 sm:px-8 py-8 lg:py-16 overflow-x-hidden">
          <div className="w-full max-w-[480px]">{children}</div>
        </div>

        <footer className="px-6 py-4 text-center text-xs text-muted-foreground">
          ¿Necesitás ayuda?{" "}
          <a
            href="mailto:soporte@molipay.com.ar"
            className="underline underline-offset-2 hover:text-red-500 transition-colors"
          >
            soporte@molipay.com.ar
          </a>
        </footer>
      </main>
    </div>
  );
}

/* ============ Stepper ============ */

export function Stepper({ steps, current }: { steps: string[]; current: number }) {
  return (
    <ol className="flex items-center gap-2 mb-8 overflow-x-auto pb-2">
      {steps.map((label, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={label} className="flex items-center gap-2 shrink-0">
            <span
              className={`inline-flex items-center justify-center w-7 h-7 text-xs font-medium rounded-full ${
                done
                  ? "bg-success text-white"
                  : active
                    ? "bg-red-500 text-white"
                    : "bg-transparent text-muted-foreground border border-border"
              }`}
            >
              {done ? <Check size={14} /> : i + 1}
            </span>
            <span
              className={`text-xs ${active ? "font-medium text-foreground" : "text-muted-foreground"}`}
            >
              {label}
            </span>
            {i < steps.length - 1 && <span className="w-6 h-px bg-black-100" />}
          </li>
        );
      })}
    </ol>
  );
}

/* ============ Headings ============ */

export function FormTitle({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="mb-7">
      {eyebrow && <p className="mb-2 font-sans text-xs font-medium text-red-500">{eyebrow}</p>}
      <h1 className="text-[clamp(1.5rem,2.4vw,1.9rem)] font-medium leading-[1.15] text-foreground">
        {title}
      </h1>
      {subtitle && <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{subtitle}</p>}
    </div>
  );
}

/* ============ Inputs ============ */

type FieldProps = InputHTMLAttributes<HTMLInputElement> & {
  /** React 19: llega como prop y va al input (sirve para register() de react-hook-form). */
  ref?: Ref<HTMLInputElement>;
  label: string;
  error?: string;
  hint?: string;
};

export function Field({ label, error, hint, className = "", ...rest }: FieldProps) {
  return (
    <label className="block">
      <span className="block mb-1.5 text-xs font-medium text-foreground">{label}</span>
      <input
        {...rest}
        className={`w-full h-11 px-3 bg-card text-sm text-foreground outline-none transition-colors rounded-md ${
          error ? "border-red-500" : "border-border"
        } border focus:border-navy-500 focus:ring-2 focus:ring-navy-100 placeholder:text-muted-foreground ${className}`}
      />
      {error ? (
        <span className="mt-1 block text-xs text-red-500">{error}</span>
      ) : hint ? (
        <span className="mt-1 block text-xs text-muted-foreground">{hint}</span>
      ) : null}
    </label>
  );
}

export function SelectField({
  label,
  value,
  onChange,
  options,
  error,
  placeholder = "Seleccioná…",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  error?: string;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="block mb-1.5 text-xs font-medium text-foreground">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full h-11 px-3 bg-card text-sm outline-none rounded-md ${
          error ? "border-red-500" : "border-border"
        } border focus:border-navy-500 focus:ring-2 focus:ring-navy-100 ${
          value ? "text-foreground font-medium" : "text-muted-foreground"
        }`}
      >
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
      {error && <span className="mt-1 block text-xs text-red-500">{error}</span>}
    </label>
  );
}

/* ============ Password ============ */

export function PasswordField({
  label,
  value,
  onChange,
  showRules = false,
  error,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  showRules?: boolean;
  error?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div>
      <label className="block">
        <span className="block mb-1.5 text-xs font-medium text-foreground">{label}</span>
        <div
          className={`flex items-center bg-card rounded-md border ${
            error ? "border-red-500" : "border-border"
          } focus-within:border-navy-500 focus-within:ring-2 focus-within:ring-navy-100`}
        >
          <input
            type={show ? "text" : "password"}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="flex-1 h-11 px-3 bg-transparent text-sm outline-none text-foreground placeholder:text-muted-foreground"
          />
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            className="px-3 text-muted-foreground hover:text-foreground"
            aria-label={show ? "Ocultar contraseña" : "Mostrar contraseña"}
          >
            {show ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
        {error && <span className="mt-1 block text-xs text-red-500">{error}</span>}
      </label>
      {showRules && (
        <ul className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-y-1 gap-x-3">
          {PASSWORD_RULES.map((r) => {
            const ok = r.test(value);
            return (
              <li
                key={r.id}
                className={`flex items-center gap-1.5 text-[11px] ${ok ? "text-success" : "text-muted-foreground"}`}
              >
                <Check size={12} />
                {r.label}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/* ============ Buttons ============ */

export function PrimaryButton({
  children,
  disabled,
  type = "button",
  onClick,
  className = "",
}: {
  children: ReactNode;
  disabled?: boolean;
  type?: "button" | "submit";
  onClick?: () => void;
  className?: string;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`w-full h-11 rounded-md text-white text-sm font-medium tracking-wide transition-colors duration-150 ${
        disabled ? "opacity-40 cursor-not-allowed" : "hover:bg-red-400 active:bg-red-700"
      } bg-red-500 ${className}`}
    >
      {children}
    </button>
  );
}

export function SecondaryButton({
  children,
  onClick,
  type = "button",
}: {
  children: ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      className="h-11 px-5 rounded-md text-sm font-medium transition-colors border border-border text-foreground hover:bg-muted"
    >
      {children}
    </button>
  );
}

export function WizardNav({
  onBack,
  nextLabel = "Siguiente",
  onNext,
  nextDisabled,
  nextType = "button",
}: {
  onBack?: () => void;
  nextLabel?: string;
  onNext?: () => void;
  nextDisabled?: boolean;
  nextType?: "button" | "submit";
}) {
  return (
    <div className="mt-8 flex flex-col sm:flex-row gap-3">
      {onBack && <SecondaryButton onClick={onBack}>Atrás</SecondaryButton>}
      <div className="flex-1">
        <PrimaryButton type={nextType} onClick={onNext} disabled={nextDisabled}>
          {nextLabel}
        </PrimaryButton>
      </div>
    </div>
  );
}

/* ============ FileUpload ============ */

export function FileUpload({
  label,
  hint,
  value,
  onChange,
  accept = "image/*,application/pdf",
}: {
  label: string;
  hint?: string;
  value: { name: string; url?: string; file?: File } | null | undefined;
  onChange: (f: { name: string; url: string; file?: File } | null) => void;
  accept?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);

  const handle = (file: File | null) => {
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      alert("El archivo supera el máximo de 8 MB.");
      return;
    }
    const url = URL.createObjectURL(file);
    onChange({ name: file.name, url, file });
  };

  useEffect(() => {
    return () => {
      if (value?.url && value.url.startsWith("blob:")) URL.revokeObjectURL(value.url);
    };
  }, [value?.url]);

  const isImage = (() => {
    if (value?.file?.type?.startsWith("image/")) return true;
    const n = (value?.name || value?.url || "").toLowerCase();
    return /\.(png|jpe?g|webp|gif|bmp|heic|avif)$/.test(n);
  })();
  const isExisting = !!value?.url && !value?.file;

  if (value) {
    return (
      <div>
        <span className="block mb-1.5 text-xs font-medium text-foreground">{label}</span>
        <div className="flex items-center gap-3 bg-card px-3 py-3 rounded-md border border-border">
          {isImage ? (
            <img
              src={value.url}
              alt={value.name}
              className="w-12 h-12 rounded-md object-cover shrink-0 bg-black-50 ring-1 ring-black-100"
            />
          ) : (
            <FileText size={18} className="text-muted-foreground shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm truncate text-foreground">
              {isImage ? "Imagen cargada" : "Documento cargado"}{" "}
              {isExisting && <span className="text-[10px] text-muted-foreground">(existente)</span>}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {isExisting ? "Se mantendrá si no la reemplazás" : "Listo para enviar"}
            </p>
            <p className="text-[11px] text-muted-foreground truncate">{value.name}</p>
          </div>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="text-xs font-medium text-foreground hover:text-red-500 transition-colors"
          >
            Reemplazar
          </button>
          <button
            type="button"
            onClick={() => onChange(null)}
            className="text-muted-foreground hover:text-red-500"
            aria-label="Quitar"
          >
            <X size={16} />
          </button>
          <input
            ref={inputRef}
            type="file"
            accept={accept}
            className="hidden"
            onChange={(e) => handle(e.target.files?.[0] ?? null)}
          />
        </div>
      </div>
    );
  }

  return (
    <div>
      <span className="block mb-1.5 text-xs font-medium text-foreground">{label}</span>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          handle(e.dataTransfer.files?.[0] ?? null);
        }}
        className={`w-full flex flex-col items-center justify-center gap-2 py-8 px-4 text-center transition-colors rounded-md ${
          drag ? "border-red-500 bg-red-50/20" : "border-border bg-card"
        } border-dashed border`}
      >
        <div className="w-10 h-10 flex items-center justify-center bg-black text-red-400 rounded-full">
          <Camera size={18} />
        </div>
        <span className="text-sm font-medium text-foreground">
          <UploadCloud size={14} className="inline mr-1" />
          Arrastrá o hacé clic para subir
        </span>
        {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
        <span className="text-[11px] text-muted-foreground">JPG · PNG · PDF · máx 8MB</span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => handle(e.target.files?.[0] ?? null)}
      />
    </div>
  );
}

/* ============ Empty table row ============ */

export function EmptyRow({
  colSpan = 12,
  message = "No hay información disponible",
}: {
  colSpan?: number;
  message?: string;
}) {
  return (
    <tr>
      <td
        colSpan={colSpan}
        className="px-4 py-12 text-center text-sm text-muted-foreground bg-card"
      >
        {message}
      </td>
    </tr>
  );
}

/* ============ SuccessCard ============ */

export function SuccessCard({
  title,
  body,
  children,
  variant = "success",
}: {
  title: string;
  body?: ReactNode;
  children?: ReactNode;
  variant?: "success" | "info" | "error" | "loading";
}) {
  const color = variant === "success" ? "#1E8E3E" : variant === "error" ? "#DC2626" : "#324595";
  const Icon = variant === "error" ? X : variant === "loading" ? Loader2 : Check;
  return (
    <div className="bg-card p-8 sm:p-10 text-center rounded-md border border-border">
      <div
        className="mx-auto mb-6 inline-flex items-center justify-center w-16 h-16 rounded-full"
        style={{ background: `${color}14`, color }}
      >
        <Icon
          size={30}
          strokeWidth={2.5}
          className={variant === "loading" ? "animate-spin" : undefined}
        />
      </div>
      <h1 className="text-[1.75rem] font-medium text-foreground leading-tight">{title}</h1>
      {body && <div className="mt-4 text-sm text-muted-foreground leading-relaxed">{body}</div>}
      {children && <div className="mt-8 space-y-3">{children}</div>}
    </div>
  );
}
