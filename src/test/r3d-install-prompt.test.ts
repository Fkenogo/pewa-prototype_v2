import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearDeferredInstallPrompt,
  getDeferredInstallPrompt,
  initializeInstallPromptCapture,
  subscribeInstallPrompt,
} from "@/lib/pewa/install-prompt";

describe("R3-D application-level installation prompt capture", () => {
  beforeEach(() => {
    clearDeferredInstallPrompt();
    initializeInstallPromptCapture();
  });

  it("retains beforeinstallprompt until a later Profile subscriber mounts", () => {
    const prompt = vi.fn(async () => undefined);
    const event = new Event("beforeinstallprompt", { cancelable: true }) as Event & {
      prompt: () => Promise<void>;
      userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
    };
    event.prompt = prompt;
    event.userChoice = Promise.resolve({ outcome: "dismissed" });
    window.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
    expect(getDeferredInstallPrompt()).toBe(event);
    const listener = vi.fn();
    const unsubscribe = subscribeInstallPrompt(listener);
    expect(listener).toHaveBeenLastCalledWith(event);
    unsubscribe();
    clearDeferredInstallPrompt();
    expect(getDeferredInstallPrompt()).toBeNull();
  });
});
