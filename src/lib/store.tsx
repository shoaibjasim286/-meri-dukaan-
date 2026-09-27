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
  SaleItem,
  Settings,
  Staff,
  StockAdjustment,
  Supplier,
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
  }) => Sale;
  holdCart: (items: SaleItem[], customerId: string | null, label: string) => void;
  removeHeldCart: (id: string) => void;
  addPurchase: (input: Omit<Purchase, "id" | "date">) => void;
  addExpense: (input: Omit<Expense, "id">) => void;
  addPayment: (input: Omit<CreditPayment, "id" | "date" | "customerName">) => void;
  addReturn: (input: Omit<ReturnRecord, "id" | "date">) => void;
  updateStaff: (id: string, patch: Partial<Staff>) => void;
  addStaff: (s: Pick<Staff, "name" | "role" | "pin">) => void;
  closeDay: (actualCash: number, openingCash: number) => void;
  updateSettings: (patch: Partial<Settings>) => void;
  markNotificationsRead: () => void;
  resetData: () => void;
  log: (action: string, detail: string) => void;
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
      completeSale: ({ items, discount, customerId, mode, paid }) => {
        const total = money(
          items.reduce((sum, i) => sum + i.price * i.qty, 0) - discount,
        );
        const number =
          state.sales.reduce((m, s) => Math.max(m, s.number), 1000) + 1;
        const customer = state.customers.find((c) => c.id === customerId);
        const sale: Sale = {
          id: id(),
          number,
          date: now(),
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
          products: s.products.map((p) => {
            const it = items.find((i) => i.productId === p.id);
            return it ? { ...p, stock: Math.max(0, p.stock - it.qty) } : p;
          }),
          customers: s.customers.map((c) =>
            c.id === customerId
              ? {
                  ...c,
                  balance: money(c.balance + Math.max(0, baqi)),
                  lastActivity: now(),
                }
              : c,
          ),
          audit: logEntry(s, "New Sale", `Sale #${number} · Rs ${total}`),
        }));
        return sale;
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
      addReturn: (input) =>
        patch((s) => ({
          returns: [{ ...input, id: id(), date: now() }, ...s.returns],
          products: s.products.map((p) =>
            p.id === input.productId
              ? {
                  ...p,
                  stock:
                    input.kind === "customer"
                      ? p.stock + input.qty
                      : Math.max(0, p.stock - input.qty),
                }
              : p,
          ),
          audit: logEntry(
            s,
            input.kind === "customer" ? "Customer Return" : "Supplier Return",
            `${input.productName} x${input.qty}`,
          ),
        })),
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
