export function registerServiceWorker(): void {
  if (typeof window === "undefined") return;
  if (!("serviceWorker" in navigator)) return;

  const register = (): void => {
    void navigator.serviceWorker
      .register("/sw.js")
      .catch((error: unknown) => {
        console.error("Service worker registration failed", error);
      });
  };

  if (document.readyState === "complete") {
    register();
    return;
  }

  window.addEventListener("load", register, { once: true });
}
