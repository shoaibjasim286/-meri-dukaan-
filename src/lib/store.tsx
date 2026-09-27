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
import { downloadBackup as createBackupDownload, isFutureBackupVersion, parseBackupFile } from "./backup";
import { toast } from "sonner";
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
  settings: Settings;
  currentStaffId: string;
  locked: boolean;
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
  settings: demoSettings,
  currentStaffId: "st1",
  locked: false,
});

const STORAGE_KEY = "dukaanflow-state-v1";
const id = () => Math.random().toString(36).slice(2, 10);
const now = () => new Date().toISOString();

interface StoreValue extends State {
  currentStaff: Staff;
  setLocked: (v: boolean) => void;
  signInStaff: (staffId: string) => void;
  addProduct: (p: Omit<Product, "id" | "active">) => void;
  updateProduct: (id: string, patch: Partial<Product>) => void;
  adjustStock: (productId: string, change: number, reason: string) => void;
  addCustomer: (c: Pick<Customer, "name" | "phone" | "address">) => Customer;
  addSupplier: (s: Pick<Supplier, "name" | "phone" | "company">) => Supplier;
  completeSale: (input: {
    items: SaleItem[];
    discount: number;
    customerId: string | null;
    mode: Sale["mode"];
    paid: number;
  }) => Promise<import("./types").CompleteSaleResult>;
  holdCart: (items: SaleItem[], customerId: string | null, label: string) => void;
  removeHeldCart: (id: string) => void;
  addPurchase: (input: Omit<Purchase, "id" | "date">) => void;
  addExpense: (input: Omit<Expense, "id">) => void;
  addPayment: (input: Omit<CreditPayment, "id" | "date" | "customerName">) => void;
  addReturn: (input: Omit<ReturnRecord, "id" | "date">) => void;
  processReturn: (
    saleId: string,
    itemsToReturn: Array<{ productId: string; qty: number }>,
    reason: string,
  ) => { ok: true; returnId: string; refundAmount: number; refundMode: RefundMode; } | { ok: false; error: string };
  updateStaff: (id: string, patch: Partial<Staff>) => void;
  addStaff: (s: Pick<Staff, "name" | "role" | "pin">) => void;
  closeDay: (actualCash: number, openingCash: number) => void;
  updateSettings: (patch: Partial<Settings>) => void;
  markNotificationsRead: () => void;
  resetData: () => void;
  log: (action: string, detail: string) => void;
  downloadBackup: () => void;
  restoreBackup: (file: File) => Promise<void>;
}

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>(initialState);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setState({ ...initialState(), ...JSON.parse(raw) });
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* ignore */
    }
  }, [state, hydrated]);

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

    return {
      ...state,
      currentStaff,
      setLocked: (v) => patch(() => ({ locked: v })),
      signInStaff: (staffId) =>
        patch((s) => ({
          currentStaffId: staffId,
          locked: false,
          audit: logEntry(
            { ...s, currentStaffId: staffId },
            "Staff Login",
            s.staff.find((x) => x.id === staffId)?.name ?? "",
          ),
        })),
      log: (action, detail) => patch((s) => ({ audit: logEntry(s, action, detail) })),
      addProduct: (p) =>
        patch((s) => ({
          products: [{ ...p, id: id(), active: true }, ...s.products],
          audit: logEntry(s, "Product Added", p.name),
        })),
      updateProduct: (pid, pt) =>
        patch((s) => ({
          products: s.products.map((p) => (p.id === pid ? { ...p, ...pt } : p)),
          audit: logEntry(
            s,
            "Product Updated",
            s.products.find((p) => p.id === pid)?.name ?? "",
          ),
        })),
      adjustStock: (productId, change, reason) =>
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
        }),
      addCustomer: (c) => {
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
        return customer;
      },
      addSupplier: (sp) => {
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
        return supplier;
      },
      completeSale: async ({ items, discount, customerId, mode, paid }) => {
        if (items.length === 0) {
          return { ok: false, error: "Cart khali hai" };
        }

        const validModes: Sale["mode"][] = ["Cash", "Udhaar", "Mixed"];
        if (!validModes.includes(mode)) {
          return { ok: false, error: "Payment mode invalid hai" };
        }

        if (!Number.isFinite(discount) || discount < 0) {
          return { ok: false, error: "Discount valid nahi hai" };
        }

        if (!Number.isFinite(paid) || paid < 0) {
          return { ok: false, error: "Paid amount valid nahi hai" };
        }

        if (mode === "Cash" && paid !== money(paid)) {
          return { ok: false, error: "Paid amount valid nahi hai" };
        }

        const quantities = new Map<string, number>();
        let subtotal = 0;

        for (const item of items) {
          if (!Number.isFinite(item.qty) || item.qty <= 0) {
            return { ok: false, error: `${item.name || "Samaan"} ki quantity valid nahi hai` };
          }

          if (!Number.isFinite(item.price) || item.price < 0) {
            return { ok: false, error: `${item.name || "Samaan"} ka price valid nahi hai` };
          }

          const nextQty = (quantities.get(item.productId) ?? 0) + item.qty;
          quantities.set(item.productId, nextQty);
          subtotal += item.price * item.qty;
        }

        const normalizedSubtotal = money(subtotal);
        if (discount > normalizedSubtotal) {
          return { ok: false, error: "Discount subtotal se zyada nahi ho sakta" };
        }

        const total = money(normalizedSubtotal - discount);

        if (paid > total) {
          return { ok: false, error: "Paid amount total se zyada nahi ho sakta" };
        }

        if (mode === "Cash" && paid !== total) {
          return { ok: false, error: "Cash sale mein poori payment zaroori hai" };
        }

        if (mode === "Udhaar" && paid !== 0) {
          return { ok: false, error: "Udhaar sale mein paid amount 0 hona chahiye" };
        }

        if (mode !== "Cash" && !customerId) {
          return { ok: false, error: "Is payment mode ke liye customer chunein" };
        }

        const customer = customerId
          ? state.customers.find((c) => c.id === customerId)
          : undefined;

        if (customerId && !customer) {
          return { ok: false, error: "Customer nahi mila" };
        }

        for (const [productId, qty] of quantities) {
          const product = state.products.find((p) => p.id === productId);

          if (!product) {
            return { ok: false, error: "Samaan nahi mila" };
          }

          if (!product.active) {
            return { ok: false, error: `${product.name} inactive hai` };
          }

          if (qty > product.stock) {
            return { ok: false, error: `Stock khatam: ${product.name}` };
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
      addPurchase: (input) =>
        patch((s) => {
          const purchase: Purchase = { ...input, id: id(), date: now() };
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
        }),
      addExpense: (input) =>
        patch((s) => ({
          expenses: [{ ...input, id: id() }, ...s.expenses],
          audit: logEntry(s, "Expense Added", `${input.category} Rs ${input.amount}`),
        })),
      addPayment: (input) =>
        patch((s) => {
          const customer = s.customers.find((c) => c.id === input.customerId);
          return {
            payments: [
              {
                ...input,
                id: id(),
                date: now(),
                customerName: customer?.name ?? "",
              },
              ...s.payments,
            ],
            customers: s.customers.map((c) =>
              c.id === input.customerId
                ? {
                    ...c,
                    balance: money(Math.max(0, c.balance - input.amount)),
                    lastActivity: now(),
                  }
                : c,
            ),
            audit: logEntry(
              s,
              "Udhaar Jama",
              `${customer?.name ?? ""} Rs ${input.amount}`,
            ),
          };
        }),
      addReturn: (input) => {
        if (
          input.kind === "supplier" &&
          (!Number.isInteger(input.qty) || input.qty <= 0 || input.amount < 0)
        ) {
          return;
        }

        patch((s) => {
          const supplier = input.supplierId
            ? s.suppliers.find((item) => item.id === input.supplierId)
            : undefined;

          return {
            returns: [
              {
                ...input,
                id: id(),
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
      },
      processReturn: (saleId, itemsToReturn, reason) => {
        const sale = state.sales.find((item) => item.id === saleId);
        if (!sale) {
          return { ok: false, error: "Sale nahi mili" };
        }

        if (!reason.trim()) {
          return { ok: false, error: "Return reason likhein" };
        }

        if (itemsToReturn.length === 0) {
          return { ok: false, error: "Return item chunein" };
        }

        const previousReturned = sale.returnedItems ?? [];
        const previousMap = new Map(
          previousReturned.map((item) => [item.productId, item.returnedQty]),
        );

        const requestedMap = new Map<string, number>();
        for (const input of itemsToReturn) {
          if (!Number.isInteger(input.qty) || input.qty <= 0) {
            return { ok: false, error: "Return quantity 1, 2, 3 jaisi poori number honi chahiye" };
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
            return { ok: false, error: "Ye item is sale mein nahi hai" };
          }

          const alreadyReturned = previousMap.get(productId) ?? 0;
          const remaining = saleItem.qty - alreadyReturned;

          if (remaining <= 0) {
            return { ok: false, error: `${saleItem.name} poora return ho chuka hai` };
          }

          if (qty > remaining) {
            return {
              ok: false,
              error: `${saleItem.name} ki sirf ${remaining} quantity return ho sakti hai`,
            };
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
          return { ok: false, error: "Is sale ka customer record nahi hai" };
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

        return { ok: true, returnId, refundAmount, refundMode };
      },
      updateStaff: (sid, pt) =>
        patch((s) => ({
          staff: s.staff.map((x) => (x.id === sid ? { ...x, ...pt } : x)),
        })),
      addStaff: (sp) =>
        patch((s) => ({
          staff: [
            ...s.staff,
            {
              ...sp,
              id: id(),
              active: true,
              permissions: { "View Sales": true, "Create Sales": true },
            },
          ],
          audit: logEntry(s, "Staff Added", sp.name),
        })),
      closeDay: (actualCash, openingCash) =>
        patch((s) => {
          const today = new Date().toISOString().slice(0, 10);
          const cashSales = s.sales
            .filter((x) => x.date.slice(0, 10) === today)
            .reduce((sum, x) => sum + x.paid, 0);
          const cashExpenses = s.expenses
            .filter((x) => x.date.slice(0, 10) === today)
            .reduce((sum, x) => sum + x.amount, 0);
          const customerPayments = s.payments
            .filter((x) => x.date.slice(0, 10) === today)
            .reduce((sum, x) => sum + x.amount, 0);
          const expected = money(
            openingCash + cashSales + customerPayments - cashExpenses,
          );
          return {
            closings: [
              {
                id: id(),
                date: now(),
                openingCash,
                cashSales,
                cashExpenses,
                customerPayments,
                supplierPayments: 0,
                expectedCash: expected,
                actualCash,
                difference: money(actualCash - expected),
                staff: currentStaff.name,
              },
              ...s.closings,
            ],
            audit: logEntry(s, "Day Closed", `Actual cash Rs ${actualCash}`),
          };
        }),
      updateSettings: (pt) =>
        patch((s) => ({ settings: { ...s.settings, ...pt } })),
      markNotificationsRead: () =>
        patch((s) => ({
          notifications: s.notifications.map((n) => ({ ...n, read: true })),
        })),
      downloadBackup: () => {
        try {
          createBackupDownload({
            ...state,
            supplierPayments: [],
          });
          toast.success("Backup download ho gaya");
        } catch {
          toast.error("Backup download nahi ho saka");
        }
      },
      restoreBackup: async (file) => {
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
            localStorage.setItem(STORAGE_KEY, serialized);
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
          toast.success("Backup restore ho gaya");
        } catch (error) {
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
      resetData: () => setState(initialState()),
    };
  }, [state, patch, logEntry]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used inside StoreProvider");
  return ctx;
}
