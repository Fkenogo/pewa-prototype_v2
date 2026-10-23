export type DeferredInstallPrompt = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

let deferredPrompt: DeferredInstallPrompt | null = null;
let captureInstalled = false;
const listeners = new Set<(prompt: DeferredInstallPrompt | null) => void>();

function publishPrompt() {
  listeners.forEach((listener) => listener(deferredPrompt));
}

/** Called by the application root so the non-replayed browser event is captured at startup. */
export function initializeInstallPromptCapture() {
  if (captureInstalled || typeof window === "undefined") return;
  captureInstalled = true;
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredPrompt = event as DeferredInstallPrompt;
    publishPrompt();
  });
}

export function getDeferredInstallPrompt() {
  return deferredPrompt;
}

export function subscribeInstallPrompt(listener: (prompt: DeferredInstallPrompt | null) => void) {
  listeners.add(listener);
  listener(deferredPrompt);
  return () => {
    listeners.delete(listener);
  };
}

export function clearDeferredInstallPrompt() {
  deferredPrompt = null;
  publishPrompt();
}
