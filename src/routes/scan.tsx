import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState, useCallback } from "react";
import jsQR from "jsqr";
import {
  ArrowLeft,
  Camera,
  Image as ImageIcon,
  KeyRound,
  QrCode,
  Scan,
  ShieldAlert,
  Sparkles,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CustomerNav } from "@/components/pewa/CustomerNav";
import { parsePewaQrPayload, resolveMenuAccess, usePewa } from "@/lib/pewa/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/scan")({
  head: () => ({
    meta: [
      { title: "Scan Menu — PEWA" },
      {
        name: "description",
        content: "Scan table QR codes or enter short codes to view menus instantly.",
      },
    ],
  }),
  component: ScanPage,
});

type CameraStatus = "idle" | "requesting" | "active" | "denied" | "unsupported";

export function ScanPage() {
  const navigate = useNavigate();
  const state = usePewa();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const isScanningRef = useRef<boolean>(false);
  const lastScannedRef = useRef<string | null>(null);
  const isNavigatingRef = useRef<boolean>(false);

  const [cameraStatus, setCameraStatus] = useState<CameraStatus>("idle");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState("");
  const [codeError, setCodeError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"camera" | "code">("camera");

  const accessRefs = state.accessReferences || [];
  const publishedRefs = accessRefs.filter((ref) => {
    const venue = state.venues.find((v) => v.id === ref.venueId);
    const menu = state.menus.find((m) => m.id === ref.menuId);
    return venue && menu && menu.status === "published";
  });

  const stopCamera = useCallback(() => {
    isScanningRef.current = false;
    if (animFrameRef.current !== null) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraStatus("idle");
  }, []);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  const handleProcessPayload = useCallback(
    (rawPayload: string) => {
      if (isNavigatingRef.current) return;
      setScanError(null);
      setCodeError(null);

      // CORR-A: Validate decoded URL or short code against unified menu-access system
      const parsed = parsePewaQrPayload(
        rawPayload,
        typeof window === "undefined" ? undefined : window.location.origin,
      );
      if (!parsed) {
        const errorMsg =
          "Unsupported QR code. Only PEWA menu QR codes or short codes are recognized.";
        setScanError(errorMsg);
        setCodeError(errorMsg);
        toast.error("Unsupported QR code.");
        return;
      }

      const result = resolveMenuAccess({ code: parsed.code, accessId: parsed.accessId }, state);
      if (!result.success) {
        const errorMsg = result.error || "The scanned menu code is invalid or disabled.";
        setScanError(errorMsg);
        setCodeError(errorMsg);
        toast.error(errorMsg);
        return;
      }

      // CORR-A: Stop camera tracks after successful resolution and avoid duplicate navigation
      isNavigatingRef.current = true;
      stopCamera();
      toast.success(`Opening ${result.venue?.name} menu...`);
      navigate({
        to: "/m/$slug",
        params: { slug: result.venue!.slug },
        search: {
          menu: result.menu!.id,
          access: result.reference!.id,
          code: result.reference!.shortCode,
          sp: result.reference!.servicePoint,
          channel: result.reference!.channel,
        },
      });
    },
    [navigate, state, stopCamera],
  );

  const scanFrame = useCallback(() => {
    if (!isScanningRef.current) return;
    const video = videoRef.current;
    if (video && video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0) {
      if (!canvasRef.current) {
        canvasRef.current = document.createElement("canvas");
      }
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        try {
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const decoded = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: "dontInvert",
          });
          if (decoded && decoded.data) {
            const raw = decoded.data.trim();
            if (raw && raw !== lastScannedRef.current && !isNavigatingRef.current) {
              lastScannedRef.current = raw;
              handleProcessPayload(raw);
            }
          }
        } catch {
          // ignore transient canvas frame capture errors
        }
      }
    }
    if (isScanningRef.current) {
      animFrameRef.current = requestAnimationFrame(scanFrame);
    }
  }, [handleProcessPayload]);

  const startCamera = async () => {
    setCameraError(null);
    setScanError(null);
    lastScannedRef.current = null;
    isNavigatingRef.current = false;

    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setCameraStatus("unsupported");
      setCameraError(
        "Camera scanning is not supported by your browser environment. Please enter the short code printed on your table or counter sign below.",
      );
      setActiveTab("code");
      return;
    }

    setCameraStatus("requesting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      setCameraStatus("active");
      isScanningRef.current = true;
      animFrameRef.current = requestAnimationFrame(scanFrame);
    } catch (err: unknown) {
      const error = err as { name?: string };
      stopCamera();
      if (error?.name === "NotAllowedError" || error?.name === "PermissionDeniedError") {
        setCameraStatus("denied");
        setCameraError(
          "Camera access was denied. Please allow camera permissions in your browser settings or enter the short code below.",
        );
      } else {
        setCameraStatus("unsupported");
        setCameraError(
          "Unable to access camera on this device. You can easily enter the menu short code below.",
        );
      }
    }
  };

  const handleImageFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const img = new Image();
    const reader = new FileReader();
    reader.onload = (event) => {
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);
        if (code && code.data) {
          handleProcessPayload(code.data);
        } else {
          setScanError("No QR code detected in the selected image. Please try another image.");
          toast.error("No QR code detected.");
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  return (
    <main className="mx-auto min-h-screen max-w-lg px-4 pb-28 pt-5">
      <header className="mb-4 flex items-center justify-between">
        <Link
          to="/"
          className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
        >
          <ArrowLeft className="h-4 w-4" /> Discover menus
        </Link>
        <span className="text-xs font-medium text-muted-foreground">PEWA Access</span>
      </header>

      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold">Scan or enter code</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Connect directly to table menus, counter ordering, and hotel dining. No app installation
          required.
        </p>
      </div>

      {/* Tabs */}
      <div className="mb-6 grid grid-cols-2 rounded-xl bg-muted p-1">
        <button
          type="button"
          onClick={() => {
            setActiveTab("camera");
            if (cameraStatus === "idle") startCamera();
          }}
          className={cn(
            "flex items-center justify-center gap-2 rounded-lg py-2.5 text-xs font-semibold transition-all",
            activeTab === "camera"
              ? "bg-background text-foreground shadow-xs"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <Camera className="h-4 w-4" />
          Camera Scanner
        </button>
        <button
          type="button"
          onClick={() => {
            stopCamera();
            setActiveTab("code");
          }}
          className={cn(
            "flex items-center justify-center gap-2 rounded-lg py-2.5 text-xs font-semibold transition-all",
            activeTab === "code"
              ? "bg-background text-foreground shadow-xs"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <KeyRound className="h-4 w-4" />
          Enter Code
        </button>
      </div>

      {/* Camera View */}
      {activeTab === "camera" && (
        <section aria-label="Camera scanner" className="space-y-4">
          <div className="relative flex aspect-square w-full flex-col items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-primary/30 bg-muted/30">
            {cameraStatus === "active" ? (
              <>
                <video
                  ref={videoRef}
                  className="h-full w-full object-cover"
                  playsInline
                  autoPlay
                  muted
                />
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <div className="h-48 w-48 rounded-2xl border-2 border-primary shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]" />
                  <div className="absolute h-0.5 w-44 animate-pulse bg-primary" />
                </div>
                <div className="absolute bottom-3 inset-x-0 flex justify-center gap-2 px-3">
                  <Button
                    size="sm"
                    variant="secondary"
                    className="bg-background/80 backdrop-blur-xs text-xs font-medium"
                    onClick={stopCamera}
                  >
                    Stop camera
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="bg-background/80 backdrop-blur-xs text-xs font-medium"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <ImageIcon className="h-3.5 w-3.5 mr-1" />
                    Upload Image
                  </Button>
                </div>
              </>
            ) : cameraStatus === "denied" || cameraStatus === "unsupported" ? (
              <div className="flex flex-col items-center justify-center p-6 text-center">
                <ShieldAlert className="h-12 w-12 text-amber-600 mb-2" />
                <h3 className="font-semibold text-sm">
                  {cameraStatus === "denied"
                    ? "Camera permission denied"
                    : "Camera scanning unavailable"}
                </h3>
                <p className="mt-1 text-xs text-muted-foreground max-w-xs">{cameraError}</p>
                <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                  <Button
                    size="sm"
                    onClick={() => {
                      setActiveTab("code");
                    }}
                  >
                    Use short code instead
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => fileInputRef.current?.click()}>
                    <ImageIcon className="h-3.5 w-3.5 mr-1" /> Scan image file
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-6 text-center">
                <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Scan className="h-8 w-8" />
                </div>
                <h3 className="font-semibold text-sm">Scan Table QR</h3>
                <p className="mt-1 text-xs text-muted-foreground max-w-xs">
                  Point your camera at any PEWA QR code on table stands, counter tents, or room
                  service binders.
                </p>
                <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                  <Button size="sm" onClick={startCamera} disabled={cameraStatus === "requesting"}>
                    {cameraStatus === "requesting" ? "Opening camera..." : "Enable camera"}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => fileInputRef.current?.click()}>
                    <ImageIcon className="h-3.5 w-3.5 mr-1" /> Scan image
                  </Button>
                </div>
              </div>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImageFile}
          />

          {scanError && (
            <div
              role="alert"
              className="rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive flex items-start gap-2"
            >
              <XCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold">Scan Error</p>
                <p className="mt-0.5 text-muted-foreground">{scanError}</p>
              </div>
            </div>
          )}

          {/* Prototype Simulation Section */}
          <div className="rounded-xl border bg-card p-4">
            <div className="flex items-center gap-1.5 text-xs font-bold text-primary">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Demonstration QR Simulator</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Simulate instant camera detection of live prototype access references:
            </p>
            <div className="mt-3 grid gap-2">
              {publishedRefs.map((ref) => (
                <button
                  key={ref.id}
                  type="button"
                  onClick={() => handleProcessPayload(ref.shortCode)}
                  className="flex items-center justify-between rounded-lg border bg-muted/40 p-2 text-left text-xs hover:border-primary hover:bg-muted transition-colors"
                >
                  <div className="min-w-0 pr-2">
                    <p className="font-semibold text-foreground truncate">{ref.label}</p>
                    <p className="text-[11px] text-muted-foreground">
                      Code:{" "}
                      <code className="font-mono font-bold text-primary">{ref.shortCode}</code> ·{" "}
                      {ref.servicePoint || "General"}
                    </p>
                  </div>
                  <span className="shrink-0 rounded bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                    Simulate Scan
                  </span>
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Manual Code View */}
      {activeTab === "code" && (
        <section aria-label="Manual code entry" className="space-y-4">
          <div className="rounded-2xl border bg-card p-5 shadow-xs">
            <div className="flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-primary" />
              <h2 className="font-display text-base font-bold">Enter Menu Code</h2>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Type the short code printed below the QR code (e.g.{" "}
              <code className="font-semibold text-foreground">GGC-BAR</code> or{" "}
              <code className="font-semibold text-foreground">HRZ-POOL</code>).
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleProcessPayload(manualCode);
              }}
              className="mt-4 space-y-3"
            >
              <div>
                <label htmlFor="menu-code-input" className="sr-only">
                  Menu code
                </label>
                <Input
                  id="menu-code-input"
                  value={manualCode}
                  onChange={(e) => {
                    setManualCode(e.target.value.toUpperCase());
                    if (codeError) setCodeError(null);
                  }}
                  placeholder="e.g. GGC-BAR"
                  className="h-12 font-mono text-base tracking-widest text-center uppercase"
                  autoFocus
                  maxLength={16}
                />
              </div>

              {codeError && (
                <div
                  role="alert"
                  className="rounded-lg bg-destructive/10 p-2.5 text-xs text-destructive flex items-start gap-1.5"
                >
                  <XCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{codeError}</span>
                </div>
              )}

              <Button type="submit" className="h-11 w-full font-semibold">
                Open Menu
              </Button>
            </form>
          </div>

          {/* Quick Demo Code Pills */}
          <div className="rounded-xl border bg-muted/30 p-4">
            <h3 className="text-xs font-semibold text-muted-foreground">Available Sample Codes</h3>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {publishedRefs.map((ref) => (
                <button
                  key={ref.id}
                  type="button"
                  onClick={() => {
                    setManualCode(ref.shortCode);
                    handleProcessPayload(ref.shortCode);
                  }}
                  className="rounded-full border bg-background px-2.5 py-1 text-xs font-mono font-medium hover:border-primary hover:text-primary transition-colors"
                >
                  {ref.shortCode}
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      <CustomerNav />
    </main>
  );
}
