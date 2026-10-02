import { describe, expect, it } from "vitest";
import {
  hasPermission,
  requirePermission,
  type Permission,
} from "@/lib/permissions";
import type { Staff } from "@/lib/types";

const owner: Staff = {
  id: "o1",
  name: "Owner",
  role: "Owner",
  active: true,
  permissions: {
    "sale.create": true,
    "sale.return": true,
    "product.create": true,
    "product.edit": true,
    "report.view": true,
    "report.export": true,
    "audit.view": true,
    "debug.view": true,
    "settings.edit": true,
    "staff.manage": true,
    "backup.download": true,
    "backup.restore": true,
  },
};

const cashier: Staff = {
  id: "c1",
  name: "Cashier",
  role: "Cashier",
  active: true,
  permissions: {
    "sale.create": true,
    "sale.return": true,
  },
};

describe("hasPermission - Owner", () => {
  it("grants sale.create", () => {
    expect(hasPermission(owner, "sale.create")).toBe(true);
  });

  it("grants sale.return", () => {
    expect(hasPermission(owner, "sale.return")).toBe(true);
  });

  it("grants product.create and product.edit", () => {
    expect(hasPermission(owner, "product.create")).toBe(true);
    expect(hasPermission(owner, "product.edit")).toBe(true);
  });

  it("grants reporting and audit/debug permissions", () => {
    expect(hasPermission(owner, "report.view")).toBe(true);
    expect(hasPermission(owner, "audit.view")).toBe(true);
    expect(hasPermission(owner, "debug.view")).toBe(true);
  });

  it("grants settings, staff, and backup permissions", () => {
    expect(hasPermission(owner, "settings.edit")).toBe(true);
    expect(hasPermission(owner, "staff.manage")).toBe(true);
    expect(hasPermission(owner, "backup.download")).toBe(true);
  });

  it("grants any defined permission because the role is Owner", () => {
    const allPermissions: Permission[] = [
      "sale.create",
      "sale.return",
      "sale.void",
      "product.create",
      "product.edit",
      "product.delete",
      "expense.create",
      "expense.delete",
      "report.view",
      "report.export",
      "customer.create",
      "customer.edit",
      "supplier.create",
      "supplier.payment",
      "settings.edit",
      "backup.download",
      "backup.restore",
      "dayclose.create",
      "staff.manage",
      "audit.view",
      "debug.view",
    ];

    for (const permission of allPermissions) {
      expect(hasPermission(owner, permission)).toBe(true);
    }
  });
});

describe("hasPermission - Cashier", () => {
  it("allows explicitly granted sales permissions", () => {
    expect(hasPermission(cashier, "sale.create")).toBe(true);
    expect(hasPermission(cashier, "sale.return")).toBe(true);
  });

  it("blocks product.create and expense.create", () => {
    expect(hasPermission(cashier, "product.create")).toBe(false);
    expect(hasPermission(cashier, "expense.create")).toBe(false);
  });

  it("blocks report, audit, and debug access", () => {
    expect(hasPermission(cashier, "report.view")).toBe(false);
    expect(hasPermission(cashier, "audit.view")).toBe(false);
    expect(hasPermission(cashier, "debug.view")).toBe(false);
  });

  it("blocks staff management and backup download", () => {
    expect(hasPermission(cashier, "staff.manage")).toBe(false);
    expect(hasPermission(cashier, "backup.download")).toBe(false);
  });

  it("returns false when a defined permission is missing from staff permissions", () => {
    expect(hasPermission(cashier, "product.edit")).toBe(false);
  });
});

describe("hasPermission - missing staff", () => {
  it("returns false for null staff", () => {
    expect(hasPermission(null, "sale.create")).toBe(false);
  });

  it("returns false for undefined staff", () => {
    expect(hasPermission(undefined, "debug.view")).toBe(false);
  });
});

describe("requirePermission", () => {
  it("returns null when permission is granted", () => {
    expect(requirePermission(cashier, "sale.create")).toBeNull();
  });

  it("returns an error message when permission is denied", () => {
    expect(requirePermission(cashier, "debug.view")).toBe(
      "Aapko ye kaam karne ki ijazat nahi hai: debug.view",
    );
  });

  it("includes the denied permission name in the error message", () => {
    const message = requirePermission(cashier, "backup.download");

    expect(message).toContain("backup.download");
  });
});
