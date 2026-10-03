import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  demoAdjustments,
  demoAudit,
  demoClosings,
  demoCustomers,
  demoExpenses,
  demoHeldCarts,
  demoNotifications,
  demoPayments,
  demoProducts,
  demoPurchases,
  demoReturns,
  demoSales,
  demoSettings,
  demoStaff,
  demoSuppliers,
} from "./demo-data";
import { money } from "./format";
import { debugLog } from "./debug-log";
import { calculateDailyClosing, dateKey } from "./selectors";
import { generateNotifications, markBackupDone } from "./notifications";
import { downloadBackup as createBackupDownload, isFutureBackupVersion, parseBackupFile } from "./backup";
import { toast } from "sonner";
import { requirePermission, type Permission } from "./permissions";
import {
  createPinSalt,
  getRemainingLockoutSeconds,
  hashPin,
  MAX_ATTEMPTS,
  recordFailedAttempt,
  resetAttempts,
  verifyPin,
} from "./auth";
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
  ReturnedSaleItem,
  Sale,
  SaleItem,
  Settings,
  Staff,
  StockAdjustment,
  Supplier,
  SupplierPayment,
  SupplierPaymentMethod,
  RefundMode,
  ReturnLine,
} from "./types";

interface State {
  products: Product[];
  customers: Customer[];
  suppliers: Supplier[];
  sales: Sale[];
  purchases: Purchase[];
  expenses: Expense[];
  payments: CreditPayment[];
  returns: ReturnRecord[];
  heldCarts: HeldCart[];
  staff: Staff[];
  audit: AuditEntry[];
  adjustments: StockAdjustment[];
  closings: DayClosing[];
  notifications: AppNotification[];
  supplierPayments: SupplierPayment[];
  settings: Settings;
  currentStaffId: string;
  locked: boolean;
}

const GENERATED_NOTIFICATION_PREFIXES = [
  "low-stock-",
  "out-of-stock-",
  "overdue-",
  "backup-reminder",
];

function getMergedNotifications(
  currentState: Pick<State, "products" | "customers" | "notifications">,
): AppNotification[] {
  const generated = generateNotifications({
    products: currentState.products,
    customers: currentState.customers,
  });
  const savedById = new Map(currentState.notifications.map((n) => [n.id, n]));

  const mergedGenerated = generated.map((notification) => {
    const saved = savedById.get(notification.id);
    return {
      ...notification,
      date: saved?.date ?? notification.date,
      read: saved?.read ?? false,
    };
  });

  const generatedIds = new Set(generated.map((notification) => notification.id));
  const savedOnly = currentState.notifications.filter(
    (notification) =>
      !GENERATED_NOTIFICATION_PREFIXES.some((prefix) =>
        notification.id.startsWith(prefix),
      ) && !generatedIds.has(notification.id),
  );

  return [...mergedGenerated, ...savedOnly].sort((a, b) =>
    b.date.localeCompare(a.date),
  );
}

const initialState = (): State => ({
  products: demoProducts,
  customers: demoCustomers,
  suppliers: demoSuppliers,
  sales: demoSales,
  purchases: demoPurchases,
  expenses: demoExpenses,
  payments: demoPayments,
  returns: demoReturns,
  heldCarts: demoHeldCarts,
  staff: demoStaff,
  audit: demoAudit,
  adjustments: demoAdjustments,
  closings: demoClosings,
  notifications: demoNotifications,
  supplierPayments: [],
  settings: { ...demoSettings, pin: undefined, isDemoMode: true },
  currentStaffId: "st1",
  locked: false,
});

const blankInitialState = (): State => ({
  products: [],
  customers: [],
  suppliers: [],
  sales: [],
  purchases: [],
  expenses: [],
  payments: [],
  returns: [],
  heldCarts: [],
  staff: [
    {
      id: "owner-default",
      name: "Owner",
      role: "Owner",
      pin: undefined,
      active: true,
      permissions: {
        "sale.create": true,
        "sale.return": true,
        "sale.void": true,
        "product.create": true,
        "product.edit": true,
        "product.delete": true,
        "expense.create": true,
        "expense.delete": true,
        "report.view": true,
        "report.export": true,
        "customer.create": true,
        "customer.edit": true,
        "supplier.create": true,
        "supplier.payment": true,
        "settings.edit": true,
        "backup.download": true,
        "backup.restore": true,
        "dayclose.create": true,
        "staff.manage": true,
        "audit.view": true,
        "debug.view": true,
      },
    },
  ],
  audit: [],
  adjustments: [],
  closings: [],
  notifications: [],
  supplierPayments: [],
  settings: {
    storeName: "Meri Dukaan",
    phone: "",
    address: "",
    theme: "system",
    pinLock: true,
    pin: undefined,
    receiptSize: "80mm",
    receiptFooter: "Shukriya! Dobara tashreef layein.",
    showStoreNameOnReceipt: true,
    isDemoMode: false,
  },
  currentStaffId: "owner-default",
  locked: true,
});

const resolveInitialState = (): State => {
  // Hydration se pehle fallback: backward-compatible demo state.
  return initialState();
};


export function getCustomerPaymentValidationError(
  amount: number,
  balance: number,
): string | null {
  if (amount > balance) {
    return `Payment Rs ${balance} se zyada nahi ho sakti`;
  }
  return null;
}
const STORAGE_KEY = "dukaanflow-state-v1";
const id = (): string => {
  if (
    typeof globalThis.crypto !== "undefined" &&
    typeof globalThis.crypto.randomUUID === "function"
  ) {
    return globalThis.crypto.randomUUID();
  }
  throw new Error("Secure random ID generation is unavailable");
};
const now = () => new Date().toISOString();

interface StoreValue extends State {
  currentStaff: Staff;
  setLocked: (v: boolean) => void;
  signInStaff: (
    staffId: string,
    pin: string,
  ) => Promise<{ ok: true } | { ok: false; error: string }>;
  addProduct: (p: Omit<Product, "id" | "active">) => void;
  updateProduct: (id: string, patch: Partial<Product>) => void;
  adjustStock: (productId: string, change: number, reason: string) => void;
  addCustomer: (c: Pick<Customer, "name" | "phone" | "address">) =>
    | { ok: true; customer: Customer }
    | { ok: false; error: string };
  addSupplier: (s: Pick<Supplier, "name" | "phone" | "company">) =>
    | { ok: true; supplier: Supplier }
    | { ok: false; error: string };
  completeSale: (input: {
    items: SaleItem[];
    discount: number;
    customerId: string | null;
    mode: Sale["mode"];
    paid: number;
  }) => Promise<import("./types").CompleteSaleResult>;
  holdCart: (items: SaleItem[], customerId: string | null, label: string) => void;
  removeHeldCart: (id: string) => void;
  addPurchase: (input: Omit<Purchase, "id" | "date">) =>
    | { ok: true; purchaseId: string }
    | { ok: false; error: string };
  addExpense: (input: Omit<Expense, "id">) =>
    | { ok: true; expenseId: string }
    | { ok: false; error: string };
  addPayment: (input: Omit<CreditPayment, "id" | "date" | "customerName">) =>
    | { ok: true; paymentId: string }
    | { ok: false; error: string };
  addReturn: (input: Omit<ReturnRecord, "id" | "date">) =>
    | { ok: true; returnId: string }
    | { ok: false; error: string };
  processReturn: (
    saleId: string,
    itemsToReturn: Array<{ productId: string; qty: number }>,
    reason: string,
  ) => { ok: true; returnId: string; refundAmount: number; refundMode: RefundMode; } | { ok: false; error: string };
  updateStaff: (id: string, patch: Partial<Staff>) => void;
  addStaff: (
    s: Pick<Staff, "name" | "role" | "pin">,
  ) => Promise<{ ok: true; staffId: string } | { ok: false; error: string }>;
  closeDay: (
    date: string,
    actualCash: number,
  ) => import("./types").CloseDayResult;
  updateSettings: (patch: Partial<Settings>) => void;
  changeCurrentStaffPin: (
    pin: string,
  ) => Promise<{ ok: true } | { ok: false; error: string }>;
  markNotificationsRead: () => void;
  resetData: () => void;
  loadDemoData: () => void;
  log: (action: string, detail: string) => void;
  getSupplierBalance: (supplierId: string) => number;
  recordSupplierPayment: (
    supplierId: string,
    amount: number,
    method: SupplierPaymentMethod,
    note?: string,
    purchaseId?: string,
  ) => { ok: true; paymentId: string } | { ok: false; error: string };
  downloadBackup: () => void;
  restoreBackup: (file: File) => Promise<void>;
}

const StoreContext = createContext<StoreValue | null>(null);

function validateStateShape(data: unknown): { valid: boolean; error?: string } {
  if (typeof data !== "object" || data === null) {
    return { valid: false, error: "Not an object" };
  }

  const obj = data as Record<string, unknown>;
  const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === "object" && value !== null && !Array.isArray(value);

  const requiredArrays = [
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
  ];

  for (const key of requiredArrays) {
    if (obj[key] !== undefined && !Array.isArray(obj[key])) {
      return { valid: false, error: `${key} is not an array` };
    }
  }

  if (obj.settings !== undefined) {
    if (
      typeof obj.settings !== "object" ||
      obj.settings === null ||
      Array.isArray(obj.settings)
    ) {
      return { valid: false, error: "settings is not an object" };
    }
  }

  const products = obj.products as unknown[] | undefined;
  if (products) {
    for (const [index, value] of products.entries()) {
      if (!isRecord(value)) {
        return { valid: false, error: `Product at index ${index} is not an object` };
      }
      if (typeof value.id !== "string" || !value.id) {
        return { valid: false, error: `Product at index ${index} missing id` };
      }
      if (typeof value.name !== "string") {
        return { valid: false, error: `Product at index ${index} invalid name` };
      }
      if (typeof value.stock !== "number" || !Number.isFinite(value.stock)) {
        return { valid: false, error: `Product at index ${index} invalid stock` };
      }
      if (
        typeof value.salePrice !== "number" ||
        !Number.isFinite(value.salePrice) ||
        value.salePrice < 0
      ) {
        return { valid: false, error: `Product at index ${index} invalid salePrice` };
      }
      if (
        typeof value.purchasePrice !== "number" ||
        !Number.isFinite(value.purchasePrice) ||
        value.purchasePrice < 0
      ) {
        return { valid: false, error: `Product at index ${index} invalid purchasePrice` };
      }
    }
  }

  const sales = obj.sales as unknown[] | undefined;
  if (sales) {
    for (const [index, value] of sales.entries()) {
      if (!isRecord(value)) {
        return { valid: false, error: `Sale at index ${index} is not an object` };
      }
      if (typeof value.id !== "string" || !value.id) {
        return { valid: false, error: `Sale at index ${index} missing id` };
      }
      if (!Array.isArray(value.items)) {
        return { valid: false, error: `Sale at index ${index} invalid items` };
      }
      if (typeof value.total !== "number" || !Number.isFinite(value.total)) {
        return { valid: false, error: `Sale at index ${index} invalid total` };
      }
      if (
        typeof value.paid !== "number" ||
        !Number.isFinite(value.paid) ||
        value.paid < 0
      ) {
        return { valid: false, error: `Sale at index ${index} invalid paid` };
      }
      if (!["Cash", "Udhaar", "Mixed"].includes(value.mode as string)) {
        return { valid: false, error: `Sale at index ${index} invalid mode` };
      }
    }
  }

  const customers = obj.customers as unknown[] | undefined;
  if (customers) {
    for (const [index, value] of customers.entries()) {
      if (!isRecord(value)) {
        return { valid: false, error: `Customer at index ${index} is not an object` };
      }
      if (typeof value.id !== "string" || !value.id) {
        return { valid: false, error: `Customer at index ${index} missing id` };
      }
      if (typeof value.name !== "string") {
        return { valid: false, error: `Customer at index ${index} invalid name` };
      }
      if (typeof value.balance !== "number" || !Number.isFinite(value.balance)) {
        return { valid: false, error: `Customer at index ${index} invalid balance` };
      }
    }
  }

  const suppliers = obj.suppliers as unknown[] | undefined;
  if (suppliers) {
    for (const [index, value] of suppliers.entries()) {
      if (!isRecord(value)) {
        return { valid: false, error: `Supplier at index ${index} is not an object` };
      }
      if (typeof value.id !== "string" || !value.id) {
        return { valid: false, error: `Supplier at index ${index} missing id` };
      }
      if (typeof value.name !== "string") {
        return { valid: false, error: `Supplier at index ${index} invalid name` };
      }
    }
  }

  const staff = obj.staff as unknown[] | undefined;
  if (staff) {
    for (const [index, value] of staff.entries()) {
      if (!isRecord(value)) {
        return { valid: false, error: `Staff at index ${index} is not an object` };
      }
      if (typeof value.id !== "string" || !value.id) {
        return { valid: false, error: `Staff at index ${index} missing id` };
      }
      if (typeof value.name !== "string") {
        return { valid: false, error: `Staff at index ${index} invalid name` };
      }
      if (typeof value.active !== "boolean") {
        return { valid: false, error: `Staff at index ${index} invalid active` };
      }
    }
  }

  const idOnlyArrays = [
    ["purchases", "Purchase"],
    ["expenses", "Expense"],
    ["payments", "Payment"],
    ["returns", "Return"],
    ["heldCarts", "Held cart"],
    ["audit", "Audit"],
    ["adjustments", "Adjustment"],
    ["closings", "Closing"],
    ["notifications", "Notification"],
    ["supplierPayments", "Supplier payment"],
  ] as const;

  for (const [key, label] of idOnlyArrays) {
    const values = obj[key] as unknown[] | undefined;
    if (!values) continue;

    for (const [index, value] of values.entries()) {
      if (!isRecord(value)) {
        return { valid: false, error: `${label} at index ${index} is not an object` };
      }
      if (typeof value.id !== "string" || !value.id) {
        return { valid: false, error: `${label} at index ${index} missing id` };
      }
    }
  }

  return { valid: true };
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>(resolveInitialState);
  const [hydrated, setHydrated] = useState(false);
  const [skipPersistence, setSkipPersistence] = useState(false);
  const [storageWarned, setStorageWarned] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        // FIRST TIME USER — blank state
        const blank = blankInitialState();
        setState(blank);

        try {
          window.localStorage.setItem(STORAGE_KEY, JSON.stringify(blank));
        } catch {
          /* ignore */
        }

        setHydrated(true);
        return;
      }

      let parsed: unknown;

      try {
        parsed = JSON.parse(raw);
      } catch (parseError) {
        console.error("[Storage] Corrupt data:", parseError);

        const timestamp = Date.now();
        const corruptedKey = `${STORAGE_KEY}-corrupted-${timestamp}`;

        try {
          window.localStorage.setItem(corruptedKey, raw);
        } catch (backupError) {
          console.error("[Storage] Failed to preserve corrupt data:", backupError);
        }

        setSkipPersistence(true);
        toast.error(
          `Data corrupt hai. Backup se restore karein. Corrupted copy save: ${corruptedKey}`,
          { duration: 15000, id: "storage-corrupt" },
        );
        setHydrated(true);
        return;
      }

      const validation = validateStateShape(parsed);
      if (!validation.valid) {
        console.error("[Storage] Invalid structure:", validation.error);

        const timestamp = Date.now();
        const invalidKey = `${STORAGE_KEY}-invalid-${timestamp}`;

        try {
          window.localStorage.setItem(invalidKey, raw);
        } catch (backupError) {
          console.error("[Storage] Failed to preserve invalid data:", backupError);
        }

        setSkipPersistence(true);
        toast.error(
          `Data structure invalid hai: ${validation.error}. Backup se restore karein.`,
          { duration: 15000, id: "storage-invalid" },
        );
        setHydrated(true);
        return;
      }

      const fallback = initialState();
      const nextState = {
        ...fallback,
        ...(parsed as Partial<State>),
        settings: {
          ...fallback.settings,
          ...((parsed as Partial<State>).settings ?? {}),
        },
      };

      if (nextState.settings.isDemoMode === undefined) {
        // Purane saved users ke liye migration: apna existing data assume karein.
        nextState.settings.isDemoMode = false;
      }

      if (nextState.settings) {
        delete nextState.settings.pin;
      }

      if (nextState.staff.length === 0) {
        nextState.locked = false;
      } else {
        const validStaff = nextState.staff.some(
          (staff) => staff.id === nextState.currentStaffId,
        );
        if (!validStaff) {
          nextState.currentStaffId = nextState.staff[0].id;
        }
        nextState.locked = nextState.settings?.pinLock === true;
      }

      setState(nextState);
    } catch (error) {
      console.error("[Storage] Hydration error:", error);
      setSkipPersistence(true);
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated || skipPersistence || typeof window === "undefined") return;

    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      if (storageWarned) setStorageWarned(false);
    } catch (error) {
      const err = error as { name?: string };
      console.error("localStorage save failed:", error);

      if (storageWarned) return;

      debugLog.error("Storage", "localStorage save failed", { name: err?.name ?? "UnknownError", isQuota: err?.name === "QuotaExceededError" });

      if (err?.name === "QuotaExceededError") {
        toast.error(
          "Storage full hai! Backup download karein aur purana data clean karein.",
          { duration: 10000, id: "storage-full" },
        );
      } else {
        toast.error(
          "Data save nahi ho saka. Refresh se pehle backup lein.",
          { duration: 10000, id: "storage-error" },
        );
      }
      setStorageWarned(true);
    }
  }, [state, hydrated, storageWarned]);

  // theme
  useEffect(() => {
    if (typeof document === "undefined") return;
    const t = state.settings.theme;
    const prefersDark =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-color-scheme: dark)").matches;
    const dark = t === "dark" || (t === "system" && prefersDark);
    document.documentElement.classList.toggle("dark", !!dark);
  }, [state.settings.theme]);

  const patch = useCallback((fn: (s: State) => Partial<State>) => {
    setState((s) => ({ ...s, ...fn(s) }));
  }, []);

  const logEntry = useCallback(
    (s: State, action: string, detail: string): AuditEntry[] => [
      {
        id: id(),
        date: now(),
        staff: s.staff.find((x) => x.id === s.currentStaffId)?.name ?? "Ali",
        action,
        detail,
      },
      ...s.audit,
    ],
    [],
  );

  const value = useMemo<StoreValue>(() => {
    const currentStaff = (state.staff.find((s) => s.id === state.currentStaffId) ??
      state.staff[0])!;

    const permissionError = (permission: Permission): string | null => {
      const message = requirePermission(currentStaff, permission);
      if (!message) return null;
      patch((s) => ({
        audit: logEntry(s, "Permission Denied", message + " · Staff: " + currentStaff.name),
      }));
      return "Permission denied: " + permission + ". Aapke paas ye permission nahi hai. Admin se rabta karein.";
    };

    const mergedNotifications = getMergedNotifications(state);

    return {
      ...state,
      notifications: mergedNotifications,
      currentStaff,
      getSupplierBalance: (supplierId: string): number => {
        const supplier = state.suppliers.find((s) => s.id === supplierId);
        if (!supplier) return 0;

        const purchaseTotal = state.purchases
          .filter((p) => p.supplierId === supplierId)
          .reduce((sum, p) => sum + (p.total - p.paid), 0);

        const paymentTotal = state.supplierPayments
          .filter((sp) => sp.supplierId === supplierId)
          .reduce((sum, sp) => sum + sp.amount, 0);

        return purchaseTotal - paymentTotal;
      },
      setLocked: (v) => patch(() => ({ locked: v })),
      signInStaff: async (staffId, pin) => {
        const staff = state.staff.find((item) => item.id === staffId);

        if (!staff || !staff.active) {
          return { ok: false, error: "Staff nahi mila" };
        }

        const remaining = getRemainingLockoutSeconds(staffId);
        if (remaining > 0) {
          return {
            ok: false,
            error:
              "Bahut zyada ghalat koshishein. " +
              remaining +
              " second baad try karein.",
          };
        }

        let valid = false;
        let nextStaff = staff;
        let firstPinSetup = false;

        try {
          if (staff.pinHash && staff.pinSalt) {
            valid = await verifyPin(pin, staff.pinSalt, staff.pinHash);
          } else if (staff.pin) {
            valid = pin === staff.pin;

            if (valid) {
              const pinSalt = createPinSalt(staff.id);
              const pinHash = await hashPin(pin, pinSalt);
              const { pin: _legacyPin, ...withoutLegacyPin } = staff;
              nextStaff = { ...withoutLegacyPin, pinHash, pinSalt };
            }
          } else if (/^\d{4}$/.test(pin)) {
            const pinSalt = createPinSalt(staff.id);
            const pinHash = await hashPin(pin, pinSalt);
            nextStaff = { ...staff, pin: undefined, pinHash, pinSalt };
            valid = true;
            firstPinSetup = true;
          }
        } catch {
          return { ok: false, error: "PIN secure tarike se setup nahi ho saka" };
        }

        if (!valid) {
          const attempt = recordFailedAttempt(staffId);

          if (attempt.lockedUntil) {
            return {
              ok: false,
              error: "Bahut zyada ghalat koshishein. 30 second ke liye locked.",
            };
          }

          const left = MAX_ATTEMPTS - attempt.count;
          return {
            ok: false,
            error: "Ghalat PIN. " + left + " koshish baaki.",
          };
        }

        resetAttempts(staffId);
        debugLog.success("Auth", "PIN verified", { staffId });

        if (firstPinSetup) {
          toast.success("Pehla PIN set ho gaya. Ye PIN ab aapki dukaan ko protect karega.");
        }

        setState((s) => ({
          ...s,
          currentStaffId: staffId,
          locked: false,
          staff: s.staff.map((item) =>
            item.id === staffId ? nextStaff : item,
          ),
          audit: logEntry(
            { ...s, currentStaffId: staffId },
            "Staff Login",
            staff.name,
          ),
        }));

        return { ok: true };
      },
      log: (action, detail) => patch((s) => ({ audit: logEntry(s, action, detail) })),
      addProduct: (p) => {
        const denied = permissionError("product.create");
        if (denied) { toast.error(denied); return; }
        patch((s) => ({
          products: [{ ...p, id: id(), active: true }, ...s.products],
          audit: logEntry(s, "Product Added", p.name),
        }));
        debugLog.success("Product", "Product added", { name: p.name });
      },
      updateProduct: (pid, pt) => {
        const denied = permissionError("product.edit");
        if (denied) { toast.error(denied); return; }
        const productName = state.products.find((p) => p.id === pid)?.name ?? "";
        patch((s) => ({
          products: s.products.map((p) => (p.id === pid ? { ...p, ...pt } : p)),
          audit: logEntry(
            s,
            "Product Updated",
            s.products.find((p) => p.id === pid)?.name ?? "",
          ),
        }));
        debugLog.success("Product", "Product updated", { name: productName });
      },
      adjustStock: (productId, change, reason) => {
        const denied = permissionError("product.edit");
        if (denied) { toast.error(denied); return; }
        patch((s) => {
          const prod = s.products.find((p) => p.id === productId);
          if (!prod) return {};
          return {
            products: s.products.map((p) =>
              p.id === productId ? { ...p, stock: Math.max(0, p.stock + change) } : p,
            ),
            adjustments: [
              {
                id: id(),
                productId,
                productName: prod.name,
                change,
                reason,
                date: now(),
                staff: currentStaff.name,
              },
              ...s.adjustments,
            ],
            audit: logEntry(
              s,
              "Stock Updated",
              `${prod.name} ${change > 0 ? "+" : ""}${change}`,
            ),
          };
        });
      },
      addCustomer: (c) => {
        const denied = permissionError("customer.create");
        if (denied) {
          toast.error(denied);
          return { ok: false, error: denied };
        }

        const customer: Customer = {
          ...c,
          id: id(),
          balance: 0,
          lastActivity: now(),
        };
        patch((s) => ({
          customers: [customer, ...s.customers],
          audit: logEntry(s, "Customer Added", c.name),
        }));
        return { ok: true, customer };
      },
      addSupplier: (sp) => {
        const denied = permissionError("supplier.create");
        if (denied) {
          toast.error(denied);
          return { ok: false, error: denied };
        }

        const supplier: Supplier = {
          ...sp,
          id: id(),
          balance: 0,
          lastPurchase: now(),
        };
        patch((s) => ({
          suppliers: [supplier, ...s.suppliers],
          audit: logEntry(s, "Supplier Added", sp.name),
        }));
        return { ok: true, supplier };
      },
      completeSale: async ({ items, discount, customerId, mode, paid }) => {
        const saleFail = (error: string) => {
          debugLog.error("Sale", `Sale failed: ${error}`, { error });
          return { ok: false as const, error };
        };
        const denied = permissionError("sale.create");
        if (denied) { toast.error(denied); return saleFail(denied); }
        if (items.length === 0) {
          return saleFail("Cart khali hai");
        }

        const validModes: Sale["mode"][] = ["Cash", "Udhaar", "Mixed"];
        if (!validModes.includes(mode)) {
          return saleFail("Payment mode invalid hai");
        }

        if (!Number.isFinite(discount) || discount < 0) {
          return saleFail("Discount valid nahi hai");
        }

        if (!Number.isFinite(paid) || paid < 0) {
          return saleFail("Paid amount valid nahi hai");
        }

        if (mode === "Cash" && paid !== money(paid)) {
          return saleFail("Paid amount valid nahi hai");
        }

        const quantities = new Map<string, number>();
        let subtotal = 0;

        for (const item of items) {
          if (!Number.isFinite(item.qty) || item.qty <= 0) {
            return saleFail(`${item.name || "Samaan"} ki quantity valid nahi hai`);
          }

          if (!Number.isFinite(item.price) || item.price < 0) {
            return saleFail(`${item.name || "Samaan"} ka price valid nahi hai`);
          }

          const nextQty = (quantities.get(item.productId) ?? 0) + item.qty;
          quantities.set(item.productId, nextQty);
          subtotal += item.price * item.qty;
        }

        const normalizedSubtotal = money(subtotal);
        if (discount > normalizedSubtotal) {
          return saleFail("Discount subtotal se zyada nahi ho sakta");
        }

        const total = money(normalizedSubtotal - discount);

        if (paid > total) {
          return saleFail("Paid amount total se zyada nahi ho sakta");
        }

        if (mode === "Cash" && paid !== total) {
          return saleFail("Cash sale mein poori payment zaroori hai");
        }

        if (mode === "Udhaar" && paid !== 0) {
          return saleFail("Udhaar sale mein paid amount 0 hona chahiye");
        }

        if (mode !== "Cash" && !customerId) {
          return saleFail("Is payment mode ke liye customer chunein");
        }

        const customer = customerId
          ? state.customers.find((c) => c.id === customerId)
          : undefined;

        if (customerId && !customer) {
          return saleFail("Customer nahi mila");
        }

        for (const [productId, qty] of quantities) {
          const product = state.products.find((p) => p.id === productId);

          if (!product) {
            return saleFail("Samaan nahi mila");
          }

          if (!product.active) {
            return saleFail(`${product.name} inactive hai`);
          }

          if (qty > product.stock) {
            return saleFail(`Stock khatam: ${product.name}`);
          }
        }

        const saleId = id();
        const saleDate = now();
        const number =
          state.sales.reduce((maxNumber, existing) => Math.max(maxNumber, existing.number), 1000) + 1;

        const sale: Sale = {
          id: saleId,
          number,
          date: saleDate,
          items,
          discount,
          total,
          paid: money(paid),
          mode,
          customerId,
          customerName: customer?.name ?? "Walk-in Customer",
          staff: currentStaff.name,
        };

        const baqi = money(total - paid);

        patch((s) => ({
          sales: [sale, ...s.sales],
          products: s.products.map((product) => {
            const qty = quantities.get(product.id);
            return qty
              ? { ...product, stock: product.stock - qty }
              : product;
          }),
          customers: s.customers.map((existingCustomer) =>
            existingCustomer.id === customerId
              ? {
                  ...existingCustomer,
                  balance: money(existingCustomer.balance + baqi),
                  lastActivity: saleDate,
                }
              : existingCustomer,
          ),
          audit: logEntry(s, "New Sale", `Sale #${number} · Rs ${total}`),
        }));

        debugLog.success("Sale", `Sale #${number} complete`, { total, mode, items: items.length });
        return { ok: true, saleId, sale };
      },
      holdCart: (items, customerId, label) =>
        patch((s) => ({
          heldCarts: [
            { id: id(), items, customerId, label, heldAt: now() },
            ...s.heldCarts,
          ],
          audit: logEntry(s, "Cart Held", label),
        })),
      removeHeldCart: (hid) =>
        patch((s) => ({ heldCarts: s.heldCarts.filter((h) => h.id !== hid) })),
      addPurchase: (input) => {
        const purchaseFail = (error: string) => {
          debugLog.warning("Purchase", `Purchase rejected: ${error}`);
          return { ok: false as const, error };
        };
        const denied = permissionError("supplier.create");
        if (denied) {
          toast.error(denied);
          return purchaseFail(denied);
        }

        // ===== VALIDATION START =====

        const supplier = state.suppliers.find((s) => s.id === input.supplierId);
        if (!supplier) {
          return purchaseFail("Supplier nahi mila");
        }

        if (!input.items || input.items.length === 0) {
          return purchaseFail("Koi item add nahi kiya");
        }

        if (!Number.isFinite(input.total) || input.total <= 0) {
          return purchaseFail("Total amount valid nahi hai");
        }

        if (!Number.isFinite(input.paid) || input.paid < 0) {
          return purchaseFail("Paid amount valid nahi hai");
        }

        if (input.paid > input.total) {
          return purchaseFail("Paid amount total se zyada nahi ho sakta");
        }

        if (!Number.isFinite(input.discount) || input.discount < 0) {
          return purchaseFail("Discount valid nahi hai");
        }

        if (input.discount > input.total) {
          return purchaseFail("Discount total se zyada nahi ho sakta");
        }

        for (const item of input.items) {
          if (!item.productId || !item.name) {
            return purchaseFail("Item details incomplete hain");
          }
          if (!Number.isFinite(item.qty) || item.qty <= 0) {
            return purchaseFail(`${item.name} ki quantity valid nahi hai`);
          }
          if (!Number.isInteger(item.qty)) {
            return purchaseFail(`${item.name} ki quantity poori number honi chahiye`);
          }
          if (!Number.isFinite(item.price) || item.price < 0) {
            return purchaseFail(`${item.name} ka price valid nahi hai`);
          }
        }

        // ===== VALIDATION END =====

        const purchaseId = id();
        patch((s) => {
          const purchase: Purchase = { ...input, id: purchaseId, date: now() };
          const baqi = money(input.total - input.paid);
          return {
            purchases: [purchase, ...s.purchases],
            products: s.products.map((p) => {
              const it = input.items.find((i) => i.productId === p.id);
              return it
                ? { ...p, stock: p.stock + it.qty, purchasePrice: it.price }
                : p;
            }),
            suppliers: s.suppliers.map((sp) =>
              sp.id === input.supplierId
                ? {
                    ...sp,
                    balance: money(sp.balance + Math.max(0, baqi)),
                    lastPurchase: now(),
                  }
                : sp,
            ),
            audit: logEntry(s, "Purchase Added", `${input.supplierName} ${input.invoiceNo}`),
          };
        });
        return { ok: true, purchaseId };
      },
      recordSupplierPayment: (supplierId, amount, method, note, purchaseId) => {
        const paymentFail = (error: string) => debugLog.warning("Supplier", `Payment failed: ${error}`);
        const denied = permissionError("supplier.payment");
        if (denied) {
          toast.error(denied);
          return { ok: false, error: denied };
        }

        const supplier = state.suppliers.find((s) => s.id === supplierId);
        if (!supplier) { paymentFail("Supplier nahi mila"); return { ok: false, error: "Supplier nahi mila" }; }

        if (!Number.isFinite(amount) || amount <= 0) {
          paymentFail("Amount valid nahi hai");
          return { ok: false, error: "Amount valid nahi hai" };
        }

        const validMethods: SupplierPaymentMethod[] = [
          "Cash",
          "Bank",
          "Cheque",
          "Online",
        ];
        if (!validMethods.includes(method)) {
          paymentFail("Payment method valid nahi hai");
          return { ok: false, error: "Payment method valid nahi hai" };
        }

        if (amount > supplier.balance) {
          paymentFail("Payment balance se zyada nahi ho sakti");
          return { ok: false, error: "Payment balance se zyada nahi ho sakti" };
        }

        if (purchaseId) {
          const purchase = state.purchases.find((p) => p.id === purchaseId);
          if (!purchase) {
            paymentFail("Purchase nahi mili");
            return { ok: false, error: "Purchase nahi mili" };
          }
          if (purchase.supplierId !== supplierId) {
            paymentFail("Ye purchase is supplier ki nahi hai");
            return {
              ok: false,
              error: "Ye purchase is supplier ki nahi hai",
            };
          }

          const remaining = purchase.total - purchase.paid;
          if (amount > remaining) {
            const error = `Purchase remaining Rs ${remaining} se zyada nahi`;
            paymentFail(error);
            return { ok: false, error };
          }
        }

        const paymentId = id();
        const paymentDate = now();
        const payment: SupplierPayment = {
          id: paymentId,
          supplierId,
          supplierName: supplier.name,
          amount: money(amount),
          date: paymentDate,
          method,
          note: note?.trim() || undefined,
          staff: currentStaff.name,
          purchaseId,
        };

        patch((s) => ({
          supplierPayments: [payment, ...s.supplierPayments],
          suppliers: s.suppliers.map((item) =>
            item.id === supplierId
              ? { ...item, balance: money(item.balance - amount) }
              : item,
          ),
          purchases: purchaseId
            ? s.purchases.map((p) =>
                p.id === purchaseId
                  ? { ...p, paid: money(p.paid + amount) }
                  : p,
              )
            : s.purchases,
          audit: logEntry(
            s,
            "Supplier Payment",
            `Rs ${amount} to ${supplier.name} (${method})`,
          ),
        }));

        debugLog.success("Supplier", `Payment to ${supplier.name}`, { amount });
        return { ok: true, paymentId };
      },
      addExpense: (input) => {
        const denied = permissionError("expense.create");
        if (denied) {
          return { ok: false, error: denied };
        }

        if (!Number.isFinite(input.amount) || input.amount <= 0) {
          return { ok: false, error: "Amount valid nahi" };
        }

        const expenseId = id();
        const expenseDate = now();

        const expense: Expense = {
          ...input,
          id: expenseId,
          date: expenseDate,
        };

        patch((s) => ({
          expenses: [expense, ...s.expenses],
          audit: logEntry(
            s,
            "Expense Added",
            `${input.category} Rs ${input.amount}`,
          ),
        }));

        return { ok: true, expenseId };
      },
      addPayment: (input) => {
        const denied = permissionError("customer.edit");
        if (denied) {
          toast.error(denied);
          return { ok: false, error: denied };
        }

        const customer = state.customers.find((c) => c.id === input.customerId);
        if (!customer) {
          toast.error("Customer nahi mila");
          return { ok: false, error: "Customer nahi mila" };
        }

        const validationError = getCustomerPaymentValidationError(
          input.amount,
          customer.balance,
        );
        if (validationError) {
          toast.error(validationError);
          return { ok: false, error: validationError };
        }

        const paymentId = id();
        patch((s) => ({
          payments: [
            {
              ...input,
              id: paymentId,
              date: now(),
              customerName: customer.name,
            },
            ...s.payments,
          ],
          customers: s.customers.map((c) =>
            c.id === input.customerId
              ? {
                  ...c,
                  balance: money(c.balance - input.amount),
                  lastActivity: now(),
                }
              : c,
          ),
          audit: logEntry(
            s,
            "Udhaar Jama",
            `${customer.name} Rs ${input.amount}`,
          ),
        }));
        return { ok: true, paymentId };
      },
      addReturn: (input) => {
        const denied = permissionError("sale.return");
        if (denied) {
          toast.error(denied);
          return { ok: false, error: denied };
        }
        if (input.kind === "supplier") {
          const product = state.products.find((p) => p.id === input.productId);
          if (!product) {
            toast.error("Product nahi mila");
            return { ok: false, error: "Product nahi mila" };
          }
          if (!Number.isInteger(input.qty) || input.qty <= 0) {
            toast.error("Quantity valid nahi hai");
            return { ok: false, error: "Quantity valid nahi hai" };
          }
          if (input.qty > product.stock) {
            const error = "Sirf " + product.stock + " stock available hai";
            toast.error(error);
            return { ok: false, error };
          }
          if (!Number.isFinite(input.amount) || input.amount < 0) {
            toast.error("Amount valid nahi hai");
            return { ok: false, error: "Amount valid nahi hai" };
          }
        }

        const returnId = id();
        patch((s) => {
          const supplier = input.supplierId
            ? s.suppliers.find((item) => item.id === input.supplierId)
            : undefined;

          return {
            returns: [
              {
                ...input,
                id: returnId,
                date: now(),
                ...(input.kind === "supplier" && supplier
                  ? { partyName: supplier.name }
                  : {}),
                ...(input.kind === "supplier"
                  ? { staff: currentStaff.name }
                  : {}),
              },
              ...s.returns,
            ],
            products: s.products.map((p) =>
              p.id === input.productId
                ? {
                    ...p,
                    stock:
                      input.kind === "customer"
                        ? p.stock + input.qty
                        : p.stock - input.qty,
                  }
                : p,
            ),
            suppliers:
              input.kind === "supplier" && input.supplierId
                ? s.suppliers.map((item) =>
                    item.id === input.supplierId
                      ? { ...item, balance: money(item.balance - input.amount) }
                      : item,
                  )
                : s.suppliers,
            audit: logEntry(
              s,
              input.kind === "customer" ? "Customer Return" : "Supplier Return",
              `${input.productName} x${input.qty}${input.kind === "supplier" ? ` · Rs ${input.amount}` : ""}`,
            ),
          };
        });
        return { ok: true, returnId };
      },
      processReturn: (saleId, itemsToReturn, reason) => {
        const returnFail = (error: string) => {
          debugLog.warning("Return", `Return failed: ${error}`);
          return { ok: false as const, error };
        };
        const denied = permissionError("sale.return");
        if (denied) { toast.error(denied); return returnFail(denied); }
        const sale = state.sales.find((item) => item.id === saleId);
        if (!sale) {
          return returnFail("Sale nahi mili");
        }

        if (!reason.trim()) {
          return returnFail("Return reason likhein");
        }

        if (itemsToReturn.length === 0) {
          return returnFail("Return item chunein");
        }

        const previousReturned = sale.returnedItems ?? [];
        const previousMap = new Map(
          previousReturned.map((item) => [item.productId, item.returnedQty]),
        );

        const requestedMap = new Map<string, number>();
        for (const input of itemsToReturn) {
          if (!Number.isInteger(input.qty) || input.qty <= 0) {
            return returnFail("Return quantity 1, 2, 3 jaisi poori number honi chahiye");
          }

          requestedMap.set(
            input.productId,
            (requestedMap.get(input.productId) ?? 0) + input.qty,
          );
        }

        const saleItemsByProduct = new Map(
          sale.items.map((item) => [item.productId, item]),
        );
        const returnLines: ReturnLine[] = [];

        for (const [productId, qty] of requestedMap) {
          const saleItem = saleItemsByProduct.get(productId);
          if (!saleItem) {
            return returnFail("Ye item is sale mein nahi hai");
          }

          const alreadyReturned = previousMap.get(productId) ?? 0;
          const remaining = saleItem.qty - alreadyReturned;

          if (remaining <= 0) {
            return returnFail(`${saleItem.name} poora return ho chuka hai`);
          }

          if (qty > remaining) {
            return returnFail(`${saleItem.name} ki sirf ${remaining} quantity return ho sakti hai`);
          }

          returnLines.push({
            productId,
            name: saleItem.name,
            qty,
            price: saleItem.price,
            purchasePrice: saleItem.purchasePrice,
            amount: money(saleItem.price * qty),
          });
        }

        const originalGross = sale.items.reduce(
          (sum, item) => sum + item.price * item.qty,
          0,
        );
        const returnedGross = returnLines.reduce(
          (sum, item) => sum + item.amount,
          0,
        );
        const allocatedDiscount =
          originalGross > 0 ? money(sale.discount * (returnedGross / originalGross)) : 0;
        const refundAmount = money(Math.max(0, returnedGross - allocatedDiscount));

        const nextReturnedItems: ReturnedSaleItem[] = sale.items.map((item) => {
          const oldQty = previousMap.get(item.productId) ?? 0;
          const newQty = oldQty + (requestedMap.get(item.productId) ?? 0);
          return {
            productId: item.productId,
            qty: item.qty,
            returnedQty: newQty,
          };
        });

        const fullyReturned = nextReturnedItems.every(
          (item) => item.returnedQty >= item.qty,
        );
        const partiallyReturned =
          !fullyReturned && nextReturnedItems.some((item) => item.returnedQty > 0);

        let creditReturn = 0;
        let cashRefund = 0;

        if (sale.mode === "Cash") {
          cashRefund = refundAmount;
        } else {
          const paidRatio = sale.total > 0 ? sale.paid / sale.total : 0;
          const paidPortion = money(
            sale.mode === "Udhaar" ? 0 : refundAmount * paidRatio,
          );
          const creditPortion = money(refundAmount - paidPortion);
          const currentBalance = sale.customerId
            ? state.customers.find((item) => item.id === sale.customerId)?.balance ?? 0
            : 0;

          creditReturn = money(Math.min(currentBalance, creditPortion));
          cashRefund = money(paidPortion + (creditPortion - creditReturn));
        }

        if (sale.mode !== "Cash" && !sale.customerId) {
          return returnFail("Is sale ka customer record nahi hai");
        }

        const saleReturnTotal = money(
          (sale.returnedTotal ?? 0) + refundAmount,
        );
        const returnId = id();
        const returnDate = now();
        const refundMode: RefundMode =
          creditReturn > 0 && cashRefund > 0
            ? "Mixed"
            : creditReturn > 0
              ? "Udhaar"
              : "Cash";

        const nextSale: Sale = {
          ...sale,
          returnedItems: nextReturnedItems,
          returnedTotal: saleReturnTotal,
          partiallyReturned,
          fullyReturned,
        };

        patch((s) => ({
          sales: s.sales.map((item) => (item.id === saleId ? nextSale : item)),
          products: s.products.map((product) => {
            const returnLine = returnLines.find(
              (item) => item.productId === product.id,
            );
            return returnLine
              ? { ...product, stock: product.stock + returnLine.qty }
              : product;
          }),
          customers: s.customers.map((customer) => {
            if (!sale.customerId || customer.id !== sale.customerId || creditReturn <= 0) {
              return customer;
            }

            return {
              ...customer,
              balance: money(customer.balance - creditReturn),
              lastActivity: returnDate,
            };
          }),
          payments:
            cashRefund > 0
              ? [
                  {
                    id: id(),
                    customerId: sale.customerId ?? "walkin",
                    customerName: sale.customerName,
                    amount: -cashRefund,
                    date: returnDate,
                    method: "Cash Refund",
                    note: `Return against Sale #${sale.number}`,
                  },
                  ...s.payments,
                ]
              : s.payments,
          returns: [
            {
              id: returnId,
              kind: "customer",
              partyName: sale.customerName,
              productId: returnLines[0]?.productId ?? "",
              productName: returnLines[0]?.name ?? "",
              qty: returnLines.reduce((sum, item) => sum + item.qty, 0),
              amount: refundAmount,
              reason: reason.trim(),
              date: returnDate,
              saleId,
              saleNumber: sale.number,
              items: returnLines,
              refundAmount,
              refundMode,
              staff: currentStaff.name,
            },
            ...s.returns,
          ],
          audit: logEntry(
            s,
            "Return",
            `Return against Sale #${sale.number} · Rs ${refundAmount}`,
          ),
        }));

        debugLog.success("Return", `Return against Sale #${sale.number}`, { refundAmount });
        return { ok: true, returnId, refundAmount, refundMode };
      },
      updateStaff: (sid, pt) => {
        const denied = permissionError("staff.manage");
        if (denied) { toast.error(denied); return; }
        patch((s) => ({
          staff: s.staff.map((x) => (x.id === sid ? { ...x, ...pt } : x)),
        }));
      },
      addStaff: async (sp) => {
        const denied = permissionError("staff.manage");
        if (denied) {
          toast.error(denied);
          return { ok: false, error: denied };
        }

        const staffId = id();

        try {
          const pinSalt = createPinSalt(staffId);
          const pinHash = await hashPin(sp.pin ?? "", pinSalt);

          patch((s) => ({
            staff: [
              ...s.staff,
              {
                name: sp.name,
                role: sp.role,
                id: staffId,
                active: true,
                pinHash,
                pinSalt,
                permissions: { "sale.create": true, "sale.return": true },
              },
            ],
            audit: logEntry(s, "Staff Added", sp.name),
          }));

          return { ok: true, staffId };
        } catch {
          return { ok: false, error: "PIN secure tarike se save nahi ho saka" };
        }
      },
      closeDay: (date, actualCash) => {
        const denied = permissionError("dayclose.create");
        if (denied) { toast.error(denied); return { ok: false, error: denied }; }
        const today = dateKey(new Date());

        if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
          return { ok: false, error: "Closing date valid nahi hai" };
        }

        if (date > today) {
          return { ok: false, error: "Future date ka closing nahi ho sakta" };
        }

        if (!Number.isFinite(actualCash) || actualCash < 0) {
          return { ok: false, error: "Actual cash valid nahi hai" };
        }

        if (state.closings.some((closing) => dateKey(closing.date) === date)) {
          return { ok: false, error: "Is date ka closing pehle hi ho chuka hai" };
        }

        const summary = calculateDailyClosing({
          date,
          sales: state.sales,
          payments: state.payments,
          expenses: state.expenses,
          supplierPayments: state.supplierPayments,
          closings: state.closings,
        });

        const closingId = id();
        const closedAt = now();
        const closing: DayClosing = {
          id: closingId,
          date,
          openingCash: summary.openingCash,
          cashSales: summary.cashSales,
          mixedCashSales: summary.mixedCashSales,
          cashExpenses: summary.cashExpenses,
          customerPayments: summary.cashCustomerPayments,
          cashCustomerPayments: summary.cashCustomerPayments,
          supplierPayments: summary.supplierPayments,
          supplierCashPayments: summary.supplierCashPayments,
          cashRefunds: summary.cashRefunds,
          udhaarSales: summary.udhaarSales,
          mixedSales: summary.mixedSales,
          totalSales: summary.totalSales,
          expectedCash: summary.expectedCash,
          actualCash: money(actualCash),
          difference: money(actualCash - summary.expectedCash),
          staff: currentStaff.name,
          closedAt,
        };

        patch((s) => ({
          closings: [closing, ...s.closings],
          audit: logEntry(
            s,
            "Day Closed",
            "Closing " + date + " · Expected Rs " + summary.expectedCash,
          ),
        }));

        return { ok: true, closingId, closing };
      },
      updateSettings: (pt) => {
        const denied = permissionError("settings.edit");
        if (denied) { toast.error(denied); return; }
        patch((s) => ({ settings: { ...s.settings, ...pt } }));
      },
      changeCurrentStaffPin: async (pin) => {
        const denied = permissionError("settings.edit");
        if (denied) {
          toast.error(denied);
          return { ok: false, error: denied };
        }

        if (!/^\d{4}$/.test(pin)) {
          return { ok: false, error: "PIN exactly 4 digit ka hona chahiye" };
        }

        const staff = state.staff.find((item) => item.id === state.currentStaffId);
        if (!staff) {
          return { ok: false, error: "Current staff nahi mila" };
        }

        try {
          const pinSalt = createPinSalt(staff.id);
          const pinHash = await hashPin(pin, pinSalt);

          patch((s) => ({
            staff: s.staff.map((item) =>
              item.id === staff.id
                ? { ...item, pinHash, pinSalt, pin: undefined }
                : item,
            ),
            settings: { ...s.settings, pin: undefined },
            audit: logEntry(s, "PIN Changed", staff.name),
          }));

          return { ok: true };
        } catch {
          return { ok: false, error: "PIN secure tarike se save nahi ho saka" };
        }
      },
      markNotificationsRead: () => {
        const generated = generateNotifications({
          products: state.products,
          customers: state.customers,
        });
        const savedById = new Map(
          state.notifications.map((notification) => [notification.id, notification]),
        );

        patch((s) => ({
          notifications: [
            ...s.notifications
              .filter(
                (notification) =>
                  !GENERATED_NOTIFICATION_PREFIXES.some((prefix) =>
                    notification.id.startsWith(prefix),
                  ),
              )
              .map((notification) => ({ ...notification, read: true })),
            ...generated.map((notification) => ({
              ...notification,
              date:
                savedById.get(notification.id)?.date ?? notification.date,
              read: true,
            })),
          ],
        }));
      },
      downloadBackup: () => {
        const denied = permissionError("backup.download");
        if (denied) { toast.error(denied); return; }
        try {
          createBackupDownload({ ...state });
          markBackupDone();
          patch((s) => ({
            notifications: s.notifications.filter(
              (notification) => notification.id !== "backup-reminder",
            ),
          }));
          debugLog.success("Backup", "Backup downloaded");
          toast.success("Backup download ho gaya");
        } catch (error) {
          debugLog.error("Backup", "Backup download failed", { error: error instanceof Error ? error.message : String(error) });
          toast.error("Backup download nahi ho saka");
        }
      },
      restoreBackup: async (file) => {
        const denied = permissionError("backup.restore");
        if (typeof window === "undefined") {
          toast.error("Backup restore sirf browser mein available hai");
          return;
        }
        if (denied) { toast.error(denied); return; }
        try {
          const backup = await parseBackupFile(file);

          if (isFutureBackupVersion(backup.version)) {
            toast.warning(
              `Ye backup app ke is version se naya hai (${backup.version}). Restore phir bhi ki ja sakti hai.`,
            );
          }

          const confirmed = window.confirm(
            "Ye aapka current data overwrite kar dega. Continue?",
          );
          if (!confirmed) return;

          const nextState = {
            ...initialState(),
            ...backup.data,
          } as State;

          const serialized = JSON.stringify(nextState);

          try {
            window.localStorage.setItem(STORAGE_KEY, serialized);
          } catch (error) {
            const message = String((error as { name?: string })?.name ?? "");
            if (message === "QuotaExceededError") {
              toast.error("Device storage full hai. Backup restore nahi ho saka.");
            } else {
              toast.error("Backup save nahi ho saka");
            }
            return;
          }

          setState(nextState);
          setSkipPersistence(false);
          debugLog.success("Backup", "Backup restored");
          toast.success("Backup restore ho gaya");
        } catch (error) {
          debugLog.error("Backup", "Restore failed", { error: error instanceof Error ? error.message : String(error) });
          if (error instanceof Error) {
            if (error.message === "Backup file 50MB se zyada hai") {
              toast.error(error.message);
              return;
            }
            if (error.message === "Backup file read nahi ho saka") {
              toast.error(error.message);
              return;
            }
          }
          toast.error("Invalid backup file");
        }
      },
      resetData: () => {
        const denied = permissionError("settings.edit");
        if (denied) {
          toast.error(denied);
          return;
        }
        const blank = blankInitialState();
        setState(blank);
        toast.success("Sab data delete ho gaya");
      },
      loadDemoData: () => {
        const denied = permissionError("settings.edit");
        if (denied) {
          toast.error(denied);
          return;
        }
        const demoState = initialState();
        setState(demoState);
        toast.success("Demo data load ho gaya");
      },
    };
  }, [state, patch, logEntry]);

  if (!hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="text-center">
          <div className="text-lg font-bold">Meri Dukaan</div>
          <div className="mt-2 text-sm text-muted-foreground">
            Data load ho raha hai...
          </div>
        </div>
      </div>
    );
  }

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used inside StoreProvider");
  return ctx;
}
