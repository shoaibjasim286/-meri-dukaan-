import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type InstallOutcome = "accepted" | "dismissed";
type InstallStatus = "ready" | "cooldown" | "installed" | "manual";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{
    outcome: InstallOutcome;
    platform: string;
  }>;
}

const INSTALL_TIMESTAMP_KEY = "meri-dukaan-install-accepted-at";
const COOLDOWN_MS = 2 * 60 * 60 * 1000;

function getStoredInstallTimestamp(): number | null {
  try {
    const value = window.localStorage.getItem(INSTALL_TIMESTAMP_KEY);
    if (!value) return null;

    const timestamp = Number(value);
    return Number.isFinite(timestamp) ? timestamp : null;
  } catch {
    return null;
  }
}

function formatRemaining(ms: number): string {
  const totalMinutes = Math.ceil(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours > 0) {
    return minutes > 0
      ? `${hours} hour ${minutes} minute`
      : `${hours} hour`;
  }

  return `${Math.max(1, minutes)} minute`;
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  const [guideOpen, setGuideOpen] = useState(false);

  useEffect(() => {
    const syncCooldown = () => {
      const timestamp = getStoredInstallTimestamp();
      if (!timestamp) {
        setCooldownRemaining(0);
        return;
      }

      setCooldownRemaining(
        Math.max(0, timestamp + COOLDOWN_MS - Date.now()),
      );
    };

    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      ("standalone" in navigator &&
        Boolean(
          (navigator as Navigator & { standalone?: boolean }).standalone,
        ));

    if (isStandalone) {
      setIsInstalled(true);
      return;
    }

    const handler = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
      setCooldownRemaining(0);
    };

    const handleInstalled = () => {
      const now = Date.now();
      try {
        window.localStorage.setItem(INSTALL_TIMESTAMP_KEY, String(now));
      } catch {
        // Ignore storage restrictions; install state is still handled in memory.
      }
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    syncCooldown();
    const timer = window.setInterval(syncCooldown, 1000);

    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", handleInstalled);

    return () => {
      window.clearInterval(timer);
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  const status: InstallStatus = isInstalled
    ? "installed"
    : deferredPrompt
      ? "ready"
      : cooldownRemaining > 0
        ? "cooldown"
        : "manual";

  const statusLabel: Record<InstallStatus, string> = {
    ready: "🟢 Ready to install",
    cooldown: "🟡 Cooldown - wait karein",
    installed: "✅ Installed",
    manual: "🔴 Manual install needed",
  };

  const statusClassName: Record<InstallStatus, string> = {
    ready: "border-green-200 bg-green-50 text-green-800",
    cooldown: "border-amber-200 bg-amber-50 text-amber-800",
    installed: "border-green-200 bg-green-50 text-green-800",
    manual: "border-red-200 bg-red-50 text-red-800",
  };

  const cooldownMessage =
    cooldownRemaining > 0
      ? `Recent install attempt ke baad Chrome ka install prompt abhi browser-controlled cooldown mein hai. Local timer ke mutabiq takreeban ${formatRemaining(cooldownRemaining)} baqi hain.`
      : "Chrome ne abhi automatic install prompt available nahi kiya. Ye browser-controlled condition hai.";

  const handleInstall = async () => {
    if (!deferredPrompt) {
      setGuideOpen(true);
      return;
    }

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      try {
        window.localStorage.setItem(
          INSTALL_TIMESTAMP_KEY,
          String(Date.now()),
        );
      } catch {
        // Ignore storage restrictions; browser install can still complete.
      }
      setCooldownRemaining(COOLDOWN_MS);
    }

    setDeferredPrompt(null);
  };

  return (
    <>
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-bold">Install Status</p>
          <Badge variant="outline" className={statusClassName[status]}>
            {statusLabel[status]}
          </Badge>
        </div>

        {isInstalled ? (
          <div className="rounded-xl border bg-muted/40 p-3">
            <p className="text-sm font-bold">App Installed ✅</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Meri Dukaan aapke device par install ho chuki hai.
            </p>
          </div>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              Apni dukaan app ko home screen par install karo.
            </p>

            <Button
              type="button"
              disabled={isInstalled}
              className="rounded-xl"
              onClick={handleInstall}
            >
              <Download className="h-4 w-4" />
              {deferredPrompt
                ? "Install Meri Dukaan (1-click)"
                : "Install Karein"}
            </Button>

            {cooldownRemaining > 0 ? (
              <p className="text-xs font-medium text-amber-700">
                Install option taqreeban {formatRemaining(cooldownRemaining)} mein
                dobara available ho sakta hai.
              </p>
            ) : null}
          </>
        )}
      </div>

      <Dialog open={guideOpen} onOpenChange={setGuideOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>App Install Karein</DialogTitle>
            <DialogDescription>
              One-click install tabhi possible hai jab Chrome{" "}
              <code className="mx-1 rounded bg-muted px-1">
                beforeinstallprompt
              </code>{" "}
              event available kare.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
              <p className="text-sm font-bold text-amber-800">
                ⚠️ Automatic install abhi available nahi
              </p>
              <p className="mt-1 text-xs text-amber-700">{cooldownMessage}</p>
            </div>

            <div>
              <p className="mb-2 text-sm font-bold">
                Abhi install karne ke liye:
              </p>

              <div className="space-y-3">
                <div className="flex gap-3">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                    1
                  </div>
                  <p className="text-sm">
                    Chrome ke <strong>URL bar</strong> mein{" "}
                    <strong>⊕ install icon</strong> dhundo.
                  </p>
                </div>

                <div className="flex gap-3">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                    2
                  </div>
                  <p className="text-sm">
                    Ya <strong>3-dot menu</strong> →{" "}
                    <strong>&quot;Install page as app&quot;</strong> select karo.
                  </p>
                </div>

                <div className="flex gap-3">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                    3
                  </div>
                  <p className="text-sm">
                    Ya <strong>chrome://apps</strong> kholo aur{" "}
                    <strong>Meri Dukaan</strong> search karo.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
              <p className="text-xs text-blue-800">
                💡 <strong>Tip:</strong> Chrome khud decide karta hai ke{" "}
                <code className="mx-1 rounded bg-blue-100 px-1">
                  beforeinstallprompt
                </code>{" "}
                kab available ho. Jab event wapas aaye, yehi button dobara
                one-click install karega.
              </p>
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full rounded-xl"
              onClick={() => setGuideOpen(false)}
            >
              Theek Hai
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
