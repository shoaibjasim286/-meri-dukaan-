import type {
  AppNotification,
  AuditEntry,
  CreditPayment,
  Customer,
  DayClosing,
  Expense,
  HeldCart,
  Product,
  Purchase,
  ReturnRecord,
  Sale,
  Settings,
  Staff,
  StockAdjustment,
  Supplier,
} from "./types";

export const BACKUP_VERSION = "1.0";
export const APP_VERSION = "1.0.0";
export const MAX_BACKUP_BYTES = 50 * 1024 * 1024;

export interface BackupData {
  products: Product[];
  sales: Sale[];
  customers: Customer[];
  purchases: Purchase[];
  expenses: Expense[];
  payments: CreditPayment[];
  returns: ReturnRecord[];
  supplierPayments: unknown[];
  settings: Settings;
  staff: Staff[];
  suppliers: Supplier[];
  heldCarts: HeldCart[];
  audit: AuditEntry[];
  adjustments: StockAdjustment[];
  closings: DayClosing[];
  notifications: AppNotification[];
  currentStaffId: string;
  locked: boolean;
  [key: string]: unknown;
}

export interface BackupEnvelope {
  version: string;
  exportedAt: string;
  appVersion: string;
  data: BackupData;
}

export class BackupError extends Error {
  readonly code: "TOO_LARGE" | "INVALID_JSON" | "INVALID_SCHEMA" | "READ_ERROR";

  constructor(
    code: BackupError["code"],
    message: string,
  ) {
    super(message);
    this.name = "BackupError";
    this.code = code;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStringArrayField(data: Record<string, unknown>, key: string): boolean {
  const value = data[key];
  return Array.isArray(value);
}

export function isFutureBackupVersion(version: string): boolean {
  const [major = 0, minor = 0] = version.split(".").map((part) => Number(part));
  const [currentMajor = 0, currentMinor = 0] = BACKUP_VERSION.split(".").map((part) =>
    Number(part),
  );

  if (!Number.isFinite(major) || !Number.isFinite(minor)) return false;
  return major > currentMajor || (major === currentMajor && minor > currentMinor);
}

function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new BackupError("READ_ERROR", "Backup file read nahi ho saka"));
      }
    };

    reader.onerror = () => {
      reject(new BackupError("READ_ERROR", "Backup file read nahi ho saka"));
    };

    reader.readAsText(file);
  });
}

export async function parseBackupFile(file: File): Promise<BackupEnvelope> {
  if (file.size > MAX_BACKUP_BYTES) {
    throw new BackupError("TOO_LARGE", "Backup file 50MB se zyada hai");
  }

  let parsed: unknown;

  try {
    const raw = await readFileAsText(file);
    parsed = JSON.parse(raw);
  } catch (error) {
    if (error instanceof BackupError) throw error;
    throw new BackupError("INVALID_JSON", "Invalid backup file");
  }

  if (!isRecord(parsed)) {
    throw new BackupError("INVALID_SCHEMA", "Invalid backup file");
  }

  const { version, data } = parsed;

  if (
    typeof version !== "string" ||
    !isRecord(data) ||
    !isStringArrayField(data, "products") ||
    !isStringArrayField(data, "sales") ||
    !isStringArrayField(data, "customers")
  ) {
    throw new BackupError("INVALID_SCHEMA", "Invalid backup file");
  }

  return {
    version,
    exportedAt: typeof parsed.exportedAt === "string" ? parsed.exportedAt : new Date().toISOString(),
    appVersion: typeof parsed.appVersion === "string" ? parsed.appVersion : APP_VERSION,
    data: data as BackupData,
  };
}

export function downloadBackup(data: BackupData): void {
  const envelope: BackupEnvelope = {
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    appVersion: APP_VERSION,
    data,
  };

  const json = JSON.stringify(envelope, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const stamp = new Date();
  const pad = (value: number) => String(value).padStart(2, "0");
  const filename =
    `meri-dukaan-backup-${stamp.getFullYear()}-${pad(stamp.getMonth() + 1)}-${pad(
      stamp.getDate(),
    )}-${pad(stamp.getHours())}${pad(stamp.getMinutes())}.json`;

  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}
