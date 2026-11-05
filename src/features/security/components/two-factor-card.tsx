import { useState,type ReactNode } from "react";
import { Mail,QrCode,Smartphone } from "lucide-react";
import { toast } from "sonner";
import { useAuthActions } from "@/features/auth/auth.hooks";
import type { TotpEnrollment } from "@/infrastructure/auth/auth-client";
import { applyServerErrors } from "@/shared/forms/apply-server-errors";
import { FieldError } from "@/shared/forms/field-error";
import { useZodForm } from "@/shared/forms/use-zod-form";
import { userMessage } from "@/shared/lib/errors";
import { Badge } from "@/shared/ui/badge";
import { BtnOutline,BtnPrimary } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { Input,Label } from "@/shared/ui/form-controls";
import { totpCodeSchema } from "../security.schema";

type Method = "email" | "totp";

function MethodOption({
  active,
  onSelect,
  icon,
  title,
  description,
}: {
  active: boolean;
  onSelect: () => void;
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`rounded-lg border p-3 text-left transition ${
        active ? "border-primary bg-[color:var(--brand-soft)]" : "bg-card hover:border-primary/50"
      }`}
    >
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-sm font-semibold">{title}</span>
        {active && <Badge tone="success">Activo</Badge>}
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{description}</p>
    </button>
  );
}

/** Alta del TOTP: QR real de Supabase + verificacion del primer codigo. */
function TotpEnrollmentForm({
  enrollment,
  onVerified,
}: {
  enrollment: TotpEnrollment;
  onVerified: () => void;
}) {
  const { verifyTotp } = useAuthActions();
  const form = useZodForm(totpCodeSchema, { defaultValues: { code: "" } });
  const { errors, isSubmitting } = form.formState;

  const submit = form.handleSubmit(async ({ code }) => {
    try {
      await verifyTotp(enrollment.factorId, code);
    } catch (e) {
      applyServerErrors(form, e);
      return;
    }
    toast.success("2FA TOTP activado correctamente");
    onVerified();
  });

  return (
    <form noValidate onSubmit={submit} className="mt-4 rounded-lg border bg-muted/40 p-4">
      <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-[auto_minmax(0,1fr)]">
        <div className="grid h-32 w-32 shrink-0 place-items-center rounded-md border bg-white">
          {/* qr_code de Supabase es una data URL SVG: como imagen, sin inyectar HTML. */}
          {enrollment.qrSvg ? (
            <img
              src={enrollment.qrSvg}
              alt="Código QR para tu app de autenticación"
              className="h-full w-full p-1"
            />
          ) : (
            <QrCode size={96} strokeWidth={1} className="text-foreground" />
          )}
        </div>
        <div className="min-w-0">
          <div className="text-xs text-muted-foreground">
            Escaneá el QR con Google Authenticator
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground">
            O ingresá manualmente la clave:
          </div>
          <div className="mt-1 break-all rounded border bg-card p-2 font-mono text-xs">
            {enrollment.secret}
          </div>
          <div className="mt-3">
            <Label htmlFor="totp-code">Código de verificación</Label>
            <Input
              id="totp-code"
              placeholder="123 456"
              inputMode="numeric"
              maxLength={7}
              {...form.register("code")}
            />
            <FieldError message={errors.code?.message ?? errors.root?.server?.message} />
          </div>
          <BtnPrimary type="submit" className="mt-3 w-full" disabled={isSubmitting}>
            {isSubmitting ? "Verificando…" : "Activar 2FA"}
          </BtnPrimary>
        </div>
      </div>
    </form>
  );
}

export function TwoFactorCard() {
  const { enrollTotp } = useAuthActions();
  const [method, setMethod] = useState<Method>("email");
  const [enrollment, setEnrollment] = useState<TotpEnrollment | null>(null);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (method === "email") {
      // Sin backend todavia: ver PENDIENTES (2FA por email).
      toast.success("Método 2FA por email configurado");
      return;
    }
    setSaving(true);
    try {
      setEnrollment(await enrollTotp());
      toast.success("Escaneá el QR y verificá el código para activar TOTP");
    } catch (e) {
      toast.error(userMessage(e, "No se pudo configurar 2FA"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="flex min-w-0 items-center gap-2 font-semibold">
          <Smartphone size={16} className="shrink-0" />{" "}
          <span className="truncate">Doble factor (2FA)</span>
        </h3>
        <Badge tone="success">Activo</Badge>
      </div>
      <p className="text-sm text-muted-foreground">
        Elegí el método de verificación en dos pasos que preferís usar al iniciar sesión desde un
        dispositivo nuevo.
      </p>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <MethodOption
          active={method === "email"}
          onSelect={() => setMethod("email")}
          icon={<Mail size={16} className="shrink-0 text-primary" />}
          title="Código por email"
          description="Enviamos un código de 8 dígitos a tu correo corporativo."
        />
        <MethodOption
          active={method === "totp"}
          onSelect={() => setMethod("totp")}
          icon={<QrCode size={16} className="shrink-0 text-primary" />}
          title="Google Authenticator"
          description="Código TOTP de 6 dígitos generado en tu app (Google / 1Password / Authy)."
        />
      </div>

      <div className="mt-4 flex gap-2">
        <BtnPrimary className="flex-1" onClick={save} disabled={saving}>
          {saving ? "Guardando…" : "Guardar método 2FA"}
        </BtnPrimary>
        <BtnOutline onClick={() => toast.success("Códigos de respaldo enviados a tu correo")}>
          Códigos de respaldo
        </BtnOutline>
      </div>

      {enrollment && (
        <TotpEnrollmentForm enrollment={enrollment} onVerified={() => setEnrollment(null)} />
      )}
    </Card>
  );
}
