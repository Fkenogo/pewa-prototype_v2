import { useState, useEffect } from "react";
import { WifiOff, Wifi } from "lucide-react";
import { usePewa } from "@/lib/pewa/store";
import { Button } from "@/components/ui/button";

export function OfflineBanner() {
  const { simulatedOffline, setSimulatedOffline } = usePewa();
  // Always initialize to false for deterministic SSR matching
  const [browserOffline, setBrowserOffline] = useState(false);

  useEffect(() => {
    if (typeof navigator !== "undefined" && typeof navigator.onLine === "boolean") {
      setBrowserOffline(!navigator.onLine);
    }
    const handleOnline = () => setBrowserOffline(false);
    const handleOffline = () => setBrowserOffline(true);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const isOffline = simulatedOffline || browserOffline;

  if (!isOffline) return null;

  return (
    <aside
      role="status"
      aria-live="polite"
      className="sticky top-0 z-50 flex items-center justify-between gap-3 border-b border-amber-500/40 bg-amber-500/15 px-4 py-2 text-xs font-medium text-amber-950 backdrop-blur dark:bg-amber-950/40 dark:text-amber-200"
    >
      <div className="flex items-center gap-2">
        <WifiOff className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
        <span>
          <b>Offline mode active.</b> Menus & cart remain cached. Order submissions will be held
          until connection is restored.
        </span>
      </div>
      {simulatedOffline && (
        <Button
          size="sm"
          variant="outline"
          onClick={() => setSimulatedOffline(false)}
          className="h-7 shrink-0 text-[11px] font-semibold border-amber-600/40 hover:bg-amber-600/10"
        >
          <Wifi className="mr-1 h-3 w-3" /> Restore online
        </Button>
      )}
    </aside>
  );
}
