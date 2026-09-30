import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";

type InstallOutcome = "accepted" | "dismissed";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{
    outcome: InstallOutcome;
    platform: string;
  }>;
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
      return;
    }

    const handler = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };

    const handleInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", handleInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) {
      window.alert(
        "Install option abhi available nahi. Chrome mein URL bar ke install icon (⊕) se install karo. Ya 3-dot menu → 'Install page as app' select karo.",
      );
      return;
    }

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      setDeferredPrompt(null);
    }
  };

  if (isInstalled) {
    return (
      <div className="rounded-xl border bg-muted/40 p-3">
        <p className="text-sm font-bold">App installed hai ✅</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Meri Dukaan aapke device par install ho chuki hai.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Apni dukaan app ko home screen par install karo.
      </p>
      <Button type="button" className="rounded-xl" onClick={handleInstall}>
        <Download className="h-4 w-4" />
        Install Meri Dukaan
      </Button>
      {!deferredPrompt ? (
        <p className="text-xs text-muted-foreground">
          Chrome mein URL bar ke install icon (⊕) se install karo, ya 3-dot menu →{" "}
          &apos;Install page as app&apos; select karo.
        </p>
      ) : null}
    </div>
  );
}
