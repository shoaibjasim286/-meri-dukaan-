import { toast } from "sonner";

export async function shareContent(
  title: string,
  text: string,
  url?: string,
): Promise<"shared" | "copied" | "whatsapp" | "cancelled"> {
  const shareData: ShareData = {
    title,
    text,
    ...(url ? { url } : {}),
  };

  if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
    try {
      await navigator.share(shareData);
      toast.success("Share kar diya");
      return "shared";
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return "cancelled";
      }
    }
  }

  const combined = [text, url].filter(Boolean).join("\n");

  if (
    typeof navigator !== "undefined" &&
    navigator.clipboard &&
    typeof navigator.clipboard.writeText === "function"
  ) {
    try {
      await navigator.clipboard.writeText(combined);
      toast.success("Copy ho gaya");
      return "copied";
    } catch {
      // WhatsApp fallback below.
    }
  }

  window.open(
    `https://wa.me/?text=${encodeURIComponent(combined)}`,
    "_blank",
    "noopener,noreferrer",
  );
  toast.success("WhatsApp share khol diya");
  return "whatsapp";
}
