import { jsPDF } from "jspdf";
import { autoTable } from "jspdf-autotable";

export type ExportFormat = "csv" | "pdf";

export interface ExportColumn {
  header: string;
  key: string;
}

function todayStamp(): string {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

function safeType(type: string): string {
  return (
    type
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "report"
  );
}

function cellValue(value: unknown): string {
  if (value == null) return "";
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function escapeCsv(value: unknown): string {
  const text = cellValue(value).replace(/"/g, '""');
  return /[",\r\n]/.test(text) ? `"${text}"` : text;
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

function exportCsv(
  type: string,
  data: Record<string, unknown>[],
  columns: ExportColumn[],
): void {
  const header = columns.map((column) => escapeCsv(column.header)).join(",");
  const rows = data.map((row) =>
    columns.map((column) => escapeCsv(row[column.key])).join(","),
  );
  const csv = `\uFEFF${[header, ...rows].join("\r\n")}`;

  downloadBlob(
    new Blob([csv], { type: "text/csv;charset=utf-8" }),
    `report-${safeType(type)}-${todayStamp()}.csv`,
  );
}

function exportPdf(
  type: string,
  data: Record<string, unknown>[],
  columns: ExportColumn[],
): void {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(`Meri Dukaan — ${type} Report`, 14, 16);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`Date: ${todayStamp()}`, 14, 23);

  autoTable(doc, {
    startY: 30,
    head: [columns.map((column) => column.header)],
    body: data.map((row) => columns.map((column) => cellValue(row[column.key]))),
    theme: "grid",
    styles: {
      font: "helvetica",
      fontSize: 8,
      cellPadding: 2.5,
      overflow: "linebreak",
    },
    headStyles: {
      fontStyle: "bold",
    },
    didDrawPage: (pageData) => {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.text(`Page ${pageData.pageNumber}`, pageWidth - 28, pageHeight - 8);
    },
  });

  doc.save(`report-${safeType(type)}-${todayStamp()}.pdf`);
}

export function exportReport(
  type: string,
  format: ExportFormat,
  data: Record<string, unknown>[],
  columns: ExportColumn[],
): void {
  if (format === "csv") {
    exportCsv(type, data, columns);
    return;
  }

  exportPdf(type, data, columns);
}
