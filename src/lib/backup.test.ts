import { describe, expect, it } from "vitest";
import {
  APP_VERSION,
  BACKUP_VERSION,
  BackupError,
  isFutureBackupVersion,
  parseBackupFile,
} from "@/lib/backup";

function makeValidBackup() {
  return {
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    appVersion: APP_VERSION,
    data: {
      products: [{ id: "p1", name: "Test", stock: 10, salePrice: 100, purchasePrice: 80 }],
      sales: [{ id: "s1", items: [], total: 0, paid: 0, mode: "Cash" }],
      customers: [{ id: "c1", name: "Test", balance: 0 }],
      suppliers: [{ id: "sup1", name: "Supplier" }],
      purchases: [],
      expenses: [],
      payments: [],
      returns: [],
      heldCarts: [],
      staff: [],
      audit: [],
      adjustments: [],
      closings: [],
      notifications: [],
      supplierPayments: [],
      settings: { storeName: "Test Store" },
      currentStaffId: "",
      locked: false,
    },
  };
}

function makeFile(value: unknown): File {
  return new File([JSON.stringify(value)], "backup.json", {
    type: "application/json",
  });
}

async function expectInvalidBackup(
  backup: unknown,
  message: string,
): Promise<void> {
  await expect(parseBackupFile(makeFile(backup))).rejects.toMatchObject({
    name: "BackupError",
    code: "INVALID_SCHEMA",
    message: expect.stringContaining(message),
  });
}

describe("parseBackupFile validation", () => {
  it("accepts a valid backup with required arrays and fields", async () => {
    const result = await parseBackupFile(makeFile(makeValidBackup()));

    expect(result.version).toBe(BACKUP_VERSION);
    expect(result.data.products[0]).toMatchObject({
      id: "p1",
      name: "Test",
      stock: 10,
      salePrice: 100,
      purchasePrice: 80,
    });
  });

  it.each([
    "products",
    "sales",
    "customers",
    "suppliers",
    "purchases",
    "expenses",
    "payments",
    "returns",
    "heldCarts",
    "staff",
    "audit",
    "adjustments",
    "closings",
    "notifications",
    "supplierPayments",
  ])("rejects a backup with a missing %s array", async (field) => {
    const backup = makeValidBackup();
    delete (backup.data as Record<string, unknown>)[field];

    await expectInvalidBackup(backup, `${field} missing or not array`);
  });

  it("rejects a product without an id", async () => {
    const backup = makeValidBackup();
    delete (backup.data.products[0] as Record<string, unknown>).id;

    await expectInvalidBackup(backup, "Product ID invalid");
  });

  it("rejects a product with NaN stock", async () => {
    const backup = makeValidBackup();
    (backup.data.products[0] as { stock: number }).stock = NaN;

    await expectInvalidBackup(backup, "Product stock invalid");
  });

  it("rejects a product without a sale price", async () => {
    const backup = makeValidBackup();
    delete (backup.data.products[0] as Record<string, unknown>).salePrice;

    await expectInvalidBackup(backup, "Product salePrice invalid");
  });

  it("rejects a product without a purchase price", async () => {
    const backup = makeValidBackup();
    delete (backup.data.products[0] as Record<string, unknown>).purchasePrice;

    await expectInvalidBackup(backup, "Product purchasePrice invalid");
  });

  it("rejects a product with a negative sale price", async () => {
    const backup = makeValidBackup();
    (backup.data.products[0] as { salePrice: number }).salePrice = -1;

    await expectInvalidBackup(backup, "Product salePrice invalid");
  });

  it("rejects a sale without an id", async () => {
    const backup = makeValidBackup();
    delete (backup.data.sales[0] as Record<string, unknown>).id;

    await expectInvalidBackup(backup, "Sale ID invalid");
  });

  it("rejects a sale with a string total", async () => {
    const backup = makeValidBackup();
    (backup.data.sales[0] as Record<string, unknown>).total = "100";

    await expectInvalidBackup(backup, "Sale total invalid");
  });

  it("rejects a sale with an invalid payment mode", async () => {
    const backup = makeValidBackup();
    (backup.data.sales[0] as Record<string, unknown>).mode = "Easypaisa";

    await expectInvalidBackup(backup, "Sale mode invalid");
  });

  it("rejects a customer without an id", async () => {
    const backup = makeValidBackup();
    delete (backup.data.customers[0] as Record<string, unknown>).id;

    await expectInvalidBackup(backup, "Customer ID invalid");
  });

  it("rejects a customer with an invalid balance", async () => {
    const backup = makeValidBackup();
    (backup.data.customers[0] as Record<string, unknown>).balance = "100";

    await expectInvalidBackup(backup, "Customer balance invalid");
  });

  it.each(["sales", "customers"])(
    "rejects an invalid nested structure in %s",
    async (field) => {
      const backup = makeValidBackup();
      (backup.data as unknown as Record<string, unknown[]>)[field] = [{}];

      await expectInvalidBackup(
        backup,
       `${field.slice(0, -1).replace(/^./, (char) => char.toUpperCase())} ID invalid`,
      );
    },
  );

  it.each(["products", "suppliers"])(
    "rejects an invalid nested structure in %s",
    async (field) => {
      const backup = makeValidBackup();
      (backup.data as unknown as Record<string, unknown[]>)[field] = [{}];

      await expectInvalidBackup(
        backup,
       `${field.slice(0, -1).replace(/^./, (char) => char.toUpperCase())} ID invalid`,
      );
    },
  );
});
