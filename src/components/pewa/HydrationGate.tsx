import { useEffect, useState, type ReactNode } from "react";
import { usePewa } from "@/lib/pewa/store";

export function HydrationGate({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    Promise.resolve(usePewa.persist.rehydrate()).finally(() => setReady(true));
    const sync = (event: StorageEvent) => {
      if (event.key === "pewa-prototype-v1") void usePewa.persist.rehydrate();
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);
  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <span className="font-display text-3xl text-primary">pewa</span>
      </div>
    );
  }
  return <>{children}</>;
}
