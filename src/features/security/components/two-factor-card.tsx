import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { QrCode, ShieldCheck, Smartphone, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { mfaKeys, useAuthActions, useMfaState } from "@/features/auth/auth.hooks";
import { useSessionUser } from "@/features/session/session.hooks";
import type { TotpEnrollment } from "@/infrastructure/auth/auth-client";
import { applyServerErrors } from "@/shared/forms/apply-server-errors";
import { FieldError } from "@/shared/forms/field-error";
import { useZodForm } from "@/shared/forms/use-zod-form";
import { userMessage } from "@/shared/lib/errors";
import { Badge } from "@/shared/ui/badge";
import { BtnOutline, BtnPrimary } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { useConfirm } from "@/shared/ui/confirm-provider";
import { Input, Label } from "@/shared/ui/form-controls";
import { totpCodeSchema } from "../security.schema";

/** Alta del TOTP: QR de Supabase + verificacion del primer codigo. */
function TotpEnrollmentForm({
  enrollment,
  onVerified,
  onCancel,
}: {
  enrollment: TotpEnrollment;
  onVerified: () => Promise<void>;
  onCancel: () => void;
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
    await onVerified();
  });

  return (
    <form noValidate onSubmit={submit} className="mt-4 rounded-lg border bg-muted/40 p-4">
      <ol className="mb-4 list-decimal space-y-1 pl-4 text-xs text-muted-foreground">
        <li>Instalá una app de autenticación (Google Authenticator, Authy o 1Password).</li>
        <li>Escaneá el código QR, o cargá la clave a mano.</li>
        <li>Ingresá el código de 6 dígitos que te muestra la app.</li>
      </ol>
      <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-[auto_minmax(0,1fr)]">
        <div className="grid h-36 w-36 shrink-0 place-items-center rounded-md border bg-white">
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
          <div className="text-[11px] text-muted-foreground">Clave para cargar a mano:</div>
          <div className="mt-1 break-all rounded border bg-card p-2 font-mono text-xs">
            {enrollment.secret}
          </div>
          <div className="mt-3">
            <Label htmlFor="totp-code">Código de verificación</Label>
            <Input
              id="totp-code"
              placeholder="123 456"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={7}
              {...form.register("code")}
            />
            <FieldError message={errors.code?.message ?? errors.root?.server?.message} />
          </div>
          <div className="mt-3 flex gap-2">
            <BtnOutline type="button" onClick={onCancel} disabled={isSubmitting}>
              Cancelar
            </BtnOutline>
            <BtnPrimary type="submit" className="flex-1" disabled={isSubmitting}>
              {isSubmitting ? "Verificando…" : "Activar verificación en dos pasos"}
            </BtnPrimary>
          </div>
        </div>
      </div>
    </form>
  );
}

/**
 * Verificacion en dos pasos con app de autenticacion (TOTP de Supabase Auth).
 * Muestra el estado real: con un factor activo, el inicio de sesion pide el codigo.
 */
export function TwoFactorCard() {
  const { enrollTotp, unenrollFactor } = useAuthActions();
  const mfa = useMfaState();
  const userId = useSessionUser().user?.id ?? "";
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const [enrollment, setEnrollment] = useState<TotpEnrollment | null>(null);
  const [busy, setBusy] = useState(false);
  const factors = mfa.data?.factors ?? [];
  const active = factors.length > 0;

  const refresh = () => queryClient.invalidateQueries({ queryKey: mfaKeys.state(userId) });

  const start = async () => {
    setBusy(true);
    try {
      setEnrollment(await enrollTotp());
    } catch (e) {
      toast.error(userMessage(e, "No se pudo iniciar la configuración."));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (factorId: string, name: string) => {
    const last = factors.length === 1;
    const ok = await confirm({
      title: last ? "Desactivar la verificación en dos pasos" : "Quitar este dispositivo",
      message: last
        ? "Tu cuenta va a quedar protegida solo con la contraseña. Te recomendamos mantenerla activa."
        : `${name} ya no va a poder generar códigos para tu cuenta.`,
      confirmLabel: last ? "Desactivar" : "Quitar",
      variant: "danger",
    });
    if (!ok) return;
    setBusy(true);
    try {
      await unenrollFactor(factorId);
      await refresh();
      toast.success(last ? "Verificación en dos pasos desactivada" : "Dispositivo quitado");
    } catch (e) {
      toast.error(userMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="flex min-w-0 items-center gap-2 font-semibold">
          <Smartphone size={16} className="shrink-0" />{" "}
          <span className="truncate">Verificación en dos pasos (2FA)</span>
        </h3>
        {mfa.isPending ? null : (
          <Badge tone={active ? "success" : "warn"}>{active ? "Activa" : "Desactivada"}</Badge>
        )}
      </div>
      <p className="text-sm text-muted-foreground">
        {active
          ? "Al iniciar sesión, después de la contraseña te pedimos el código de tu app de autenticación."
          : "Sumá un código de tu celular al iniciar sesión: aunque alguien tenga tu contraseña, no va a poder entrar."}
      </p>

      {mfa.isError && (
        <p className="mt-3 text-sm text-red-600">No pudimos leer el estado de tu 2FA.</p>
      )}

      {active && (
        <ul className="mt-4 divide-y rounded-lg border">
          {factors.map((f) => (
            <li key={f.id} className="flex items-center gap-3 px-3 py-2.5 text-sm">
              <ShieldCheck size={16} className="shrink-0 text-emerald-600" aria-hidden />
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">{f.name}</div>
                <div className="text-xs text-muted-foreground">
                  Activada el {new Date(f.createdAt).toLocaleDateString("es-AR")}
                </div>
              </div>
              <button
                type="button"
                disabled={busy}
                onClick={() => void remove(f.id, f.name)}
                className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-red-600 disabled:opacity-50"
                aria-label={`Quitar ${f.name}`}
              >
                <Trash2 size={15} />
              </button>
            </li>
          ))}
        </ul>
      )}

      {!enrollment && (
        <div className="mt-4">
          <BtnPrimary
            className="w-full"
            onClick={() => void start()}
            disabled={busy || mfa.isPending}
          >
            {busy
              ? "Preparando…"
              : active
                ? "Agregar otro dispositivo (respaldo)"
                : "Activar con app de autenticación"}
          </BtnPrimary>
          {active && factors.length === 1 && (
            <p className="mt-2 text-xs text-muted-foreground">
              Si perdés el celular no vas a poder entrar: sumá un segundo dispositivo de respaldo.
            </p>
          )}
        </div>
      )}

      {enrollment && (
        <TotpEnrollmentForm
          enrollment={enrollment}
          onCancel={() => setEnrollment(null)}
          onVerified={async () => {
            setEnrollment(null);
            await refresh();
            toast.success("Verificación en dos pasos activada");
          }}
        />
      )}
    </Card>
  );
}
