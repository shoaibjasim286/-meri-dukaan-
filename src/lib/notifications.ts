import type { AppNotification } from "./types";

const BACKUP_KEY = "meri-dukaan-last-backup";
const BACKUP_REMINDER_MS = 7 * 24 * 60 * 60 * 1000;
const LOW_STOCK_THRESHOLD = 5;
const OVERDUE_DAYS = 30;

export function generateNotifications(state: {
  products: Array<{
    id: string;
    name: string;
    stock: number;
    active: boolean;
  }>;
  customers: Array<{
    id: string;
    name: string;
    balance: number;
    lastActivity: string;
  }>;
}): AppNotification[] {
  const now = new Date().toISOString();
  const notifications: AppNotification[] = [];

  state.products.forEach((product) => {
    if (
      product.active &&
      product.stock > 0 &&
      product.stock <= LOW_STOCK_THRESHOLD
    ) {
      notifications.push({
        id: "low-stock-" + product.id,
        date: now,
        title: "Kam stock",
        body: product.name + " ka stock sirf " + product.stock + " bacha hai",
        read: false,
        type: "Low Stock",
      });
    }
  });

  state.products.forEach((product) => {
    if (product.active && product.stock === 0) {
      notifications.push({
        id: "out-of-stock-" + product.id,
        date: now,
        title: "Stock khatam",
        body: product.name + " ka stock khatam ho gaya",
        read: false,
        type: "Low Stock",
      });
    }
  });

  state.customers.forEach((customer) => {
    if (customer.balance > 0) {
      const lastActivity = new Date(customer.lastActivity).getTime();
      const days =
        (Date.now() - lastActivity) / (1000 * 60 * 60 * 24);

      if (days >= OVERDUE_DAYS) {
        notifications.push({
          id: "overdue-" + customer.id,
          date: now,
          title: "Udhaar overdue",
          body:
            customer.name +
            " ka Rs " +
            customer.balance +
            " udhaar " +
            Math.floor(days) +
            " din se baqi hai",
          read: false,
          type: "Udhaar",
        });
      }
    }
  });

  if (typeof localStorage !== "undefined") {
    try {
      const lastBackup = localStorage.getItem(BACKUP_KEY);
      const lastBackupTime = lastBackup ? Number(lastBackup) : 0;

      if (
        !lastBackupTime ||
        Date.now() - lastBackupTime > BACKUP_REMINDER_MS
      ) {
        notifications.push({
          id: "backup-reminder",
          date: now,
          title: "Backup lena zaroori",
          body:
            "Aapne 7 din se backup nahi liya. Data loss se bachne ke liye backup lein.",
          read: false,
          type: "Backup",
        });
      }
    } catch {
      // Ignore storage access failures; other notifications still work.
    }
  }

  return notifications;
}

export function markBackupDone(): void {
  if (typeof localStorage === "undefined") return;

  try {
    localStorage.setItem(BACKUP_KEY, String(Date.now()));
  } catch {
    // Ignore storage access failures.
  }
}
