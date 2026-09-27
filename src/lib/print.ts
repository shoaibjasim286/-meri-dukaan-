export type PrintFormat = "report" | "receipt";

const PRINT_STYLE_ID = "meri-dukaan-print-runtime-style";

export function printElement(elementId: string): void {
  const target = document.getElementById(elementId);

  if (!target) {
    throw new Error(`Print target not found: ${elementId}`);
  }

  const format: PrintFormat =
    target.dataset.printFormat === "receipt" ? "receipt" : "report";

  document.getElementById(PRINT_STYLE_ID)?.remove();

  const style = document.createElement("style");
  style.id = PRINT_STYLE_ID;
  style.textContent =
    format === "receipt"
      ? "@page { size: 80mm auto; margin: 0; }"
      : "@page { size: A4 portrait; margin: 10mm; }";

  document.head.appendChild(style);
  target.classList.add("print-target");
  target.dataset.printFormat = format;
  document.body.classList.add("printing");
  document.documentElement.classList.add("printing-root");

  let cleaned = false;
  const cleanup = () => {
    if (cleaned) return;
    cleaned = true;
    target.classList.remove("print-target");
    target.removeAttribute("data-print-format");
    document.body.classList.remove("printing");
    document.documentElement.classList.remove("printing-root");
    style.remove();
    window.removeEventListener("afterprint", cleanup);
  };

  window.addEventListener("afterprint", cleanup, { once: true });

  window.requestAnimationFrame(() => {
    window.print();
    window.setTimeout(cleanup, 1500);
  });
}
