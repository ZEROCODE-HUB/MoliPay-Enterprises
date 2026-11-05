import { Modal } from "@/shared/ui/modal";
import { useEffect,useRef,useState } from "react";
import { Input } from "@/shared/ui/form-controls";
import { BtnOutline,BtnPrimary } from "@/shared/ui/button";

export function BarcodeScanModal({
  open,
  onClose,
  onDetect,
}: {
  open: boolean;
  onClose: () => void;
  onDetect: (code: string) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [manual, setManual] = useState("");

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const start = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
        const BD = (
          window as unknown as {
            BarcodeDetector?: new () => {
              detect: (s: CanvasImageSource) => Promise<Array<{ rawValue: string }>>;
            };
          }
        ).BarcodeDetector;
        if (BD) {
          const detector = new BD();
          const tick = async () => {
            if (!videoRef.current || cancelled) return;
            try {
              const codes = await detector.detect(videoRef.current);
              if (codes && codes.length) {
                onDetect(codes[0].rawValue);
                onClose();
                return;
              }
            } catch {
              /* ignore */
            }
            if (!cancelled) setTimeout(tick, 500);
          };
          tick();
        }
      } catch {
        /* camara no disponible: el usuario usa el ingreso manual */
      }
    };
    start();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [open, onDetect, onClose]);

  if (!open) return null;

  return (
    <Modal open onClose={onClose} size="custom" className="max-w-md">
      <div className="min-h-0 flex-1 overflow-y-auto p-4 space-y-3">
        <div className="font-semibold">Escanear codigo de barra</div>
        <video
          ref={videoRef}
          className="w-full rounded-md bg-black aspect-video"
          muted
          playsInline
        />
        <p className="text-xs text-muted-foreground">
          Apunta la camara al codigo. Si no se detecta, ingresa el numero manualmente.
        </p>
        <Input
          value={manual}
          onChange={(e) => setManual(e.target.value)}
          placeholder="Numero manual"
        />
        <div className="flex gap-2">
          <BtnOutline className="flex-1" onClick={onClose}>
            Cancelar
          </BtnOutline>
          <BtnPrimary
            className="flex-1"
            onClick={() => {
              if (manual.trim()) {
                onDetect(manual.trim());
                onClose();
              }
            }}
          >
            Usar numero
          </BtnPrimary>
        </div>
      </div>
    </Modal>
  );
}
