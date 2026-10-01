import type { Staff } from "./types";
import { debugLog } from "./debug-log";

export type Permission =
  | "sale.create" | "sale.return" | "sale.void"
  | "product.create" | "product.edit" | "product.delete"
  | "expense.create" | "expense.delete"
  | "report.view" | "report.export"
  | "customer.create" | "customer.edit"
  | "supplier.create" | "supplier.payment"
  | "settings.edit" | "backup.download" | "backup.restore"
  | "dayclose.create" | "staff.manage" | "audit.view" | "debug.view";

export const LEGACY_PERMISSION_ALIASES: Record<string, string[]> = {
  "sale.create": ["Create Sales"], "sale.return": [], "sale.void": ["Delete Sales"],
  "product.create": ["Manage Stock"], "product.edit": ["Manage Stock"], "product.delete": ["Manage Stock"],
  "expense.create": [], "expense.delete": [], "report.view": ["View Sales"], "report.export": ["View Sales"],
  "customer.create": ["Manage Customers"], "customer.edit": ["Manage Customers"],
  "supplier.create": ["Manage Suppliers"], "supplier.payment": ["Manage Suppliers"],
  "settings.edit": ["Manage Settings"], "backup.download": ["Manage Settings"],
  "audit.view": [], "debug.view": [],
  "backup.restore": ["Manage Settings"], "dayclose.create": ["Manage Settings"], "staff.manage": ["Manage Settings"],
};

export function hasPermission(staff: Staff | null | undefined, permission: Permission): boolean {
  if (!staff) return false;
  if (staff.role === "Owner" || (staff.role as string) === "Admin") return true;
  if (staff.permissions[permission] === true) return true;
  return (LEGACY_PERMISSION_ALIASES[permission] ?? []).some((p) => staff.permissions[p] === true);
}

export function requirePermission(staff: Staff | null | undefined, permission: Permission): string | null {
  if (hasPermission(staff, permission)) return null;
  debugLog.warning("Permission", `${permission} denied`, { staff: staff?.name });
  return "Aapko ye kaam karne ki ijazat nahi hai: " + permission;
}
