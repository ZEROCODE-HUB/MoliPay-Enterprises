import { UserInfoCard } from "./user-info-card";
import { CompanyInfoCard } from "./company-info-card";
import { CvuInfoCard } from "./cvu-info-card";
import { CbuPreviewModal } from "./cbu-preview-modal";
import { useAccountPage } from "./use-account-page";
import { CheckCircle2,Eye,FileText,Landmark,Upload } from "lucide-react";
import { PageHeader } from "@/shared/ui/page-header";
import { Card } from "@/shared/ui/card";
import { Input,Label } from "@/shared/ui/form-controls";
import { BtnOutline,BtnPrimary } from "@/shared/ui/button";
import { DocPreviewModal } from "@/features/account/components/doc-preview";
import { fmtDateDoc } from "@/features/account/account.rules";

export function AccountPage() {
  const vm = useAccountPage();
  const {
    docPreview,
    setDocPreview,
    kycDocs,
    loadingDocs,
    customer,
    form,
    setForm,
    saving,
    isPJ,
    dir,
    customerToForm,
    setF,
    save,
    stats,
  } = vm;

  return (
    <>
      <PageHeader
        title="Mi cuenta"
        description={
          isPJ
            ? "Datos del titular, documentacion societaria y facturacion."
            : "Datos personales, documentacion KYC y facturacion."
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-6">
        {stats.map((s) => (
          <div key={s.label} className="bg-card border rounded-lg p-2.5">
            <div className="flex items-center gap-1.5 text-[9px] uppercase tracking-wider text-muted-foreground mb-0.5">
              <s.icon size={12} className="shrink-0" />
              {s.label}
            </div>
            <div className="font-display tabular-nums text-sm font-semibold mt-0.5">{s.value}</div>
            {s.sub && <div className="text-[9px] text-muted-foreground">{s.sub}</div>}
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-[1.4fr_1fr] gap-6">
        <div className="space-y-6">
          {/* Informacion del Usuario */}
          <UserInfoCard {...vm} />

          {/* Informacion adicional (PF y PJ) */}
          <Card>
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Landmark size={16} /> Informacion adicional
            </h3>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <Label>Direccion</Label>
                <Input
                  value={form.direccion ?? dir.direccion}
                  onChange={(e) => setF("direccion", e.target.value)}
                />
              </div>
              <div>
                <Label>Ciudad</Label>
                <Input
                  value={form.ciudad ?? dir.ciudad}
                  onChange={(e) => setF("ciudad", e.target.value)}
                />
              </div>
              <div>
                <Label>Provincia</Label>
                <Input
                  value={form.provincia ?? dir.provincia}
                  onChange={(e) => setF("provincia", e.target.value)}
                />
              </div>
              <div>
                <Label>Codigo Postal</Label>
                <Input value={form.cp ?? dir.cp} onChange={(e) => setF("cp", e.target.value)} />
              </div>
              <div className="sm:col-span-2 flex gap-2 justify-end">
                <BtnOutline
                  disabled={saving}
                  onClick={() => customer && setForm(customerToForm(customer))}
                >
                  Cancelar
                </BtnOutline>
                <BtnPrimary disabled={saving} onClick={save}>
                  {saving ? "Guardando…" : "Guardar cambios"}
                </BtnPrimary>
              </div>
            </div>
          </Card>

          {/* Informacion de la Empresa (solo PJ) */}
          <CompanyInfoCard {...vm} />

          {/* Documentacion KYC/KYB */}
          <Card>
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <FileText size={16} /> Documentacion {isPJ ? "KYC / KYB" : "KYC"}
            </h3>
            {loadingDocs ? (
              <p className="text-sm text-muted-foreground">Cargando documentos…</p>
            ) : kycDocs.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Aun no cargaste documentos en tu onboarding.
              </p>
            ) : (
              <div className="divide-y">
                {kycDocs.map((d) => (
                  <div key={d.rawTipo + d.label} className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-3">
                      <CheckCircle2 size={16} className="text-emerald-600" />
                      <div>
                        <div className="text-sm font-semibold">{d.tipo}</div>
                        <div className="text-xs text-muted-foreground">
                          Subido el {fmtDateDoc(d.date)}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <BtnOutline className="h-9 px-2.5 text-xs" onClick={() => setDocPreview(d)}>
                        <Eye size={13} />
                      </BtnOutline>
                      <BtnOutline className="h-9 px-3 text-xs">
                        <Upload size={12} /> Reemplazar
                      </BtnOutline>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Sidebar */}
        <CvuInfoCard {...vm} />
      </div>

      {/* Modal: Constancia CBU */}
      <CbuPreviewModal {...vm} />

      <DocPreviewModal doc={docPreview} onClose={() => setDocPreview(null)} />
    </>
  );
}
