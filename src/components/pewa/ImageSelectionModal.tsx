import { useState, useRef, useEffect } from "react";
import {
  Upload,
  Image as ImageIcon,
  Search,
  Check,
  X,
  Crop,
  RotateCcw,
  Sparkles,
  Camera,
} from "lucide-react";
import { toast } from "sonner";
import {
  IMAGE_LIBRARY_CATEGORIES,
  searchImageLibrary,
  processImageUpload,
  cropAndCompressImage,
  PROTOTYPE_IMAGE_LIBRARY,
  type CuratedLibraryImage,
} from "@/lib/pewa/taxonomy";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export function ImageSelectionModal({
  open,
  onOpenChange,
  currentImage,
  currentSource,
  onSelectImage,
  onRemoveImage,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentImage?: string | undefined;
  currentSource?: "library" | "upload" | undefined;
  onSelectImage: (dataUrl: string, source: "library" | "upload") => void;
  onRemoveImage: () => void;
}) {
  const [activeTab, setActiveTab] = useState<"library" | "upload">("library");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  // Upload & Crop State
  const [rawUploadUrl, setRawUploadUrl] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [aspectRatio, setAspectRatio] = useState<number>(4 / 3);
  const [isProcessing, setIsProcessing] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const filteredLibrary = searchImageLibrary(searchQuery, selectedCategory);

  // When a raw upload is chosen, draw to live preview canvas
  useEffect(() => {
    if (!rawUploadUrl || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      const targetW = 320;
      const targetH = Math.round(targetW / aspectRatio);
      canvas.width = targetW;
      canvas.height = targetH;

      ctx.clearRect(0, 0, targetW, targetH);

      const imgAspect = img.width / img.height;
      let baseW = img.width;
      let baseH = img.height;

      if (imgAspect > aspectRatio) {
        baseW = img.height * aspectRatio;
        baseH = img.height;
      } else {
        baseW = img.width;
        baseH = img.width / aspectRatio;
      }

      const effectiveZoom = Math.max(1, zoom);
      const cropW = baseW / effectiveZoom;
      const cropH = baseH / effectiveZoom;

      const maxOffsetW = (img.width - cropW) / 2;
      const maxOffsetH = (img.height - cropH) / 2;

      const centerX = img.width / 2;
      const centerY = img.height / 2;

      const offsetX = (panX / 50) * maxOffsetW;
      const offsetY = (panY / 50) * maxOffsetH;

      let srcX = centerX - cropW / 2 + offsetX;
      let srcY = centerY - cropH / 2 + offsetY;

      srcX = Math.max(0, Math.min(img.width - cropW, srcX));
      srcY = Math.max(0, Math.min(img.height - cropH, srcY));

      ctx.drawImage(img, srcX, srcY, cropW, cropH, 0, 0, targetW, targetH);
    };
    img.src = rawUploadUrl;
  }, [rawUploadUrl, zoom, panX, panY, aspectRatio]);

  const handleFilePicked = async (file: File) => {
    try {
      setIsProcessing(true);
      // Validate file and load downscaled version for cropping
      const { dataUrl } = await processImageUpload(file);
      setRawUploadUrl(dataUrl);
      setZoom(1);
      setPanX(0);
      setPanY(0);
      setActiveTab("upload");
      toast.info("Adjust crop and position below, then tap Attach.");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load photo.";
      toast.error(msg);
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
      if (cameraInputRef.current) cameraInputRef.current.value = "";
    }
  };

  const applyCropAndAttach = async () => {
    if (!rawUploadUrl) return;
    try {
      setIsProcessing(true);
      const { dataUrl } = await cropAndCompressImage(rawUploadUrl, {
        zoom,
        panX,
        panY,
        aspectRatio,
      });
      onSelectImage(dataUrl, "upload");
      setRawUploadUrl(null);
      toast.success("Merchant photo attached and cropped successfully!");
      onOpenChange(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Crop compression failed.";
      toast.error(msg);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="max-h-[92vh] overflow-y-auto rounded-t-3xl sm:mx-auto sm:max-w-lg focus:outline-none"
      >
        <SheetHeader className="text-left pb-2">
          <SheetTitle className="font-display text-2xl flex items-center justify-between">
            <span>Offering Photography</span>
          </SheetTitle>
          <SheetDescription className="text-xs">
            Choose a representative photo from our curated library, or upload and crop your own
            merchant photography.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4 pt-2 pb-safe">
          {/* Active Image Status Bar */}
          {currentImage && (
            <div className="flex items-center justify-between rounded-xl border bg-muted/30 p-2.5">
              <div className="flex items-center gap-3">
                <img
                  src={currentImage}
                  alt="Current item"
                  className="h-12 w-12 rounded-lg object-cover border"
                />
                <div>
                  <p className="text-xs font-semibold">Active Photo Attached</p>
                  <p className="text-[11px] text-muted-foreground">
                    Provenance:{" "}
                    <span className="font-medium text-foreground">
                      {currentSource === "upload" ? "Merchant upload" : "Curated library"}
                    </span>
                  </p>
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  onRemoveImage();
                  toast.info("Photo removed");
                }}
                className="h-8 text-xs text-destructive hover:bg-destructive/10"
              >
                <X className="h-3.5 w-3.5 mr-1" /> Remove
              </Button>
            </div>
          )}

          {/* Navigation Tabs */}
          <div className="flex rounded-xl border bg-muted/40 p-1">
            <button
              type="button"
              onClick={() => setActiveTab("library")}
              className={cn(
                "flex-1 rounded-lg py-2 text-xs font-semibold transition-all flex items-center justify-center gap-1.5",
                activeTab === "library"
                  ? "bg-primary text-primary-foreground shadow-2xs"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <ImageIcon className="h-3.5 w-3.5" /> Curated Library
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("upload")}
              className={cn(
                "flex-1 rounded-lg py-2 text-xs font-semibold transition-all flex items-center justify-center gap-1.5",
                activeTab === "upload"
                  ? "bg-primary text-primary-foreground shadow-2xs"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Upload className="h-3.5 w-3.5" /> Upload & Crop
            </button>
          </div>

          {/* TAB 1: CURATED PROTOTYPE LIBRARY */}
          {activeTab === "library" && (
            <div className="space-y-3">
              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search food photos (e.g. cappuccino, burger, croissant)..."
                  className="h-10 pl-9 text-xs"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                    aria-label="Clear search"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Category Pills */}
              <div className="no-scrollbar flex gap-1.5 overflow-x-auto pb-1">
                {IMAGE_LIBRARY_CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCategory(cat.id)}
                    className={cn(
                      "shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition-all active:scale-95",
                      selectedCategory === cat.id
                        ? "border-primary bg-primary text-primary-foreground font-semibold shadow-2xs"
                        : "border-border bg-card text-foreground hover:bg-muted",
                    )}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* Photos Grid */}
              {filteredLibrary.length === 0 ? (
                <div className="rounded-xl border border-dashed p-6 text-center text-xs text-muted-foreground">
                  No photos found matching “{searchQuery}”. Try another keyword or browse all photos.
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2 max-h-[46vh] overflow-y-auto p-1">
                  {filteredLibrary.map((item) => {
                    const isSelected = currentImage === item.url;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          onSelectImage(item.url, "library");
                          toast.success(`Attached "${item.title}"`);
                          onOpenChange(false);
                        }}
                        className={cn(
                          "group relative flex flex-col items-start rounded-xl border p-1 text-left transition-all active:scale-98",
                          isSelected
                            ? "border-primary ring-2 ring-primary/40 bg-primary/5"
                            : "hover:border-primary/50 bg-card",
                        )}
                      >
                        <div className="relative h-24 w-full overflow-hidden rounded-lg">
                          <img
                            src={item.url}
                            alt={item.title}
                            className="h-full w-full object-cover transition-transform group-hover:scale-105 duration-300"
                          />
                          <span className="absolute bottom-1 right-1 rounded bg-black/60 px-1.5 py-0.5 text-[9px] font-medium text-white backdrop-blur">
                            Representative
                          </span>
                          {isSelected && (
                            <span className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground shadow">
                              <Check className="h-3 w-3 stroke-[3]" />
                            </span>
                          )}
                        </div>
                        <span className="mt-1 line-clamp-1 text-xs font-medium group-hover:text-primary">
                          {item.title}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: DEVICE UPLOAD & CROP */}
          {activeTab === "upload" && (
            <div className="space-y-4">
              {!rawUploadUrl ? (
                <div className="rounded-2xl border-2 border-dashed p-6 text-center space-y-3 bg-muted/10">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <Upload className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold">Select Photo from Device</h3>
                    <p className="text-xs text-muted-foreground max-w-xs mx-auto mt-0.5">
                      Choose from your photo library or take a new picture. Max 5MB. Automatic
                      compression ensures fast loading.
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2 justify-center pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="h-11 text-xs font-semibold gap-1.5"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <ImageIcon className="h-4 w-4 text-primary" />
                      Photo Library
                    </Button>
                    <Button
                      type="button"
                      className="h-11 text-xs font-semibold gap-1.5"
                      onClick={() => cameraInputRef.current?.click()}
                    >
                      <Camera className="h-4 w-4" />
                      Take Photo
                    </Button>
                  </div>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFilePicked(file);
                    }}
                  />
                  <input
                    ref={cameraInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFilePicked(file);
                    }}
                  />
                </div>
              ) : (
                /* Crop and Reposition Canvas View */
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold flex items-center gap-1.5">
                      <Crop className="h-3.5 w-3.5 text-primary" />
                      Adjust Crop & Reposition
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setRawUploadUrl(null);
                        setZoom(1);
                        setPanX(0);
                        setPanY(0);
                      }}
                      className="h-6 text-xs text-muted-foreground"
                    >
                      Change photo
                    </Button>
                  </div>

                  {/* Live Canvas View */}
                  <div className="flex justify-center overflow-hidden rounded-xl border bg-black/5 p-2">
                    <canvas
                      ref={canvasRef}
                      className="max-h-56 max-w-full rounded-lg object-contain shadow-sm"
                    />
                  </div>

                  {/* Controls: Aspect Ratio */}
                  <div className="flex items-center justify-between gap-2 border-b pb-2.5">
                    <span className="text-xs text-muted-foreground">Aspect Ratio:</span>
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => setAspectRatio(4 / 3)}
                        className={cn(
                          "rounded-lg px-2.5 py-1 text-xs font-medium border transition-colors",
                          aspectRatio === 4 / 3
                            ? "bg-primary text-primary-foreground font-semibold"
                            : "bg-card text-foreground",
                        )}
                      >
                        4:3 (Standard Card)
                      </button>
                      <button
                        type="button"
                        onClick={() => setAspectRatio(1)}
                        className={cn(
                          "rounded-lg px-2.5 py-1 text-xs font-medium border transition-colors",
                          aspectRatio === 1
                            ? "bg-primary text-primary-foreground font-semibold"
                            : "bg-card text-foreground",
                        )}
                      >
                        1:1 (Square)
                      </button>
                    </div>
                  </div>

                  {/* Controls: Zoom Slider */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <Label className="text-xs text-muted-foreground">Zoom / Scale:</Label>
                      <span className="font-semibold text-primary">{zoom.toFixed(1)}x</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="2.5"
                      step="0.05"
                      value={zoom}
                      onChange={(e) => setZoom(parseFloat(e.target.value))}
                      className="w-full accent-primary h-2 bg-muted rounded-lg"
                    />
                  </div>

                  {/* Controls: Pan Sliders */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-[11px] text-muted-foreground">Pan Horizontal:</Label>
                      <input
                        type="range"
                        min="-50"
                        max="50"
                        step="1"
                        value={panX}
                        onChange={(e) => setPanX(parseInt(e.target.value, 10))}
                        className="w-full accent-primary h-2 bg-muted rounded-lg"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px] text-muted-foreground">Pan Vertical:</Label>
                      <input
                        type="range"
                        min="-50"
                        max="50"
                        step="1"
                        value={panY}
                        onChange={(e) => setPanY(parseInt(e.target.value, 10))}
                        className="w-full accent-primary h-2 bg-muted rounded-lg"
                      />
                    </div>
                  </div>

                  {/* Reset Controls */}
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        setZoom(1);
                        setPanX(0);
                        setPanY(0);
                      }}
                      className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1"
                    >
                      <RotateCcw className="h-3 w-3" /> Reset positioning
                    </button>
                  </div>

                  {/* Apply Crop & Attach Button */}
                  <Button
                    type="button"
                    disabled={isProcessing}
                    onClick={applyCropAndAttach}
                    className="h-11 w-full font-semibold gap-2 shadow-xs"
                  >
                    <Check className="h-4 w-4" />
                    <span>Apply Crop & Attach Photo</span>
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
