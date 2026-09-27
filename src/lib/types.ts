export type Category =
  | "Grocery"
  | "Drinks"
  | "Snacks"
  | "Personal Care"
  | "Other";

export interface Product {
  id: string;
  name: string;
  category: Category;
  unit: string;
  purchasePrice: number;
  salePrice: number;
  stock: number;
  lowStockLimit: number;
  supplierId: string;
  active: boolean;
  emoji: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  address: string;
  balance: number; // udhaar baqi
  lastActivity: string;
}

export interface Supplier {
  id: string;
  name: string;
  phone: string;
  company: string;
  balance: number; // hum ne dena hai
  lastPurchase: string;
}

export interface SaleItem {
  productId: string;
  name: string;
  qty: number;
  price: number;
  purchasePrice: number;
}

export type PaymentMode = "Cash" | "Udhaar" | "Mixed";

export type CompleteSaleResult =
  | { ok: true; saleId: string; sale: Sale }
  | { ok: false; error: string };

export interface ReturnedSaleItem {
  productId: string;
  qty: number;
  returnedQty: number;
}

export interface Sale {
  id: string;
  number: number;
  date: string;
  items: SaleItem[];
  discount: number;
  total: number;
  paid: number;
  mode: PaymentMode;
  customerId: string | null;
  customerName: string;
  staff: string;
  returnedItems?: ReturnedSaleItem[];
  returnedTotal?: number;
  partiallyReturned?: boolean;
  fullyReturned?: boolean;
}

export type RefundMode = "Cash" | "Udhaar" | "Mixed";

export interface ReturnLine {
  productId: string;
  name: string;
  qty: number;
  price: number;
  purchasePrice: number;
  amount: number;
}

export interface PurchaseItem {
  productId: string;
  name: string;
  qty: number;
  price: number;
}

export interface Purchase {
  id: string;
  invoiceNo: string;
  date: string;
  supplierId: string;
  supplierName: string;
  items: PurchaseItem[];
  discount: number;
  total: number;
  paid: number;
}

export interface Expense {
  id: string;
  category: string;
  amount: number;
  date: string;
  note: string;
}

export type SupplierPaymentMethod = "Cash" | "Bank" | "Cheque" | "Online";

export interface SupplierPayment {
  id: string;
  supplierId: string;
  supplierName: string;
  amount: number;
  date: string;
  method: SupplierPaymentMethod;
  note?: string;
  staff: string;
  purchaseId?: string;
}

export interface CreditPayment {
  id: string;
  customerId: string;
  customerName: string;
  amount: number;
  date: string;
  method: string;
  note: string;
}

export interface ReturnRecord {
  id: string;
  kind: "customer" | "supplier";
  partyName: string;
  productId: string;
  productName: string;
  qty: number;
  amount: number;
  reason: string;
  date: string;
  saleId?: string;
  saleNumber?: number;
  items?: ReturnLine[];
  refundAmount?: number;
  refundMode?: RefundMode;
  supplierId?: string;
  staff?: string;
}

export interface HeldCart {
  id: string;
  label: string;
  items: SaleItem[];
  customerId: string | null;
  heldAt: string;
}

export type StaffRole = "Owner" | "Manager" | "Cashier" | "Sales Staff";

export interface Staff {
  id: string;
  name: string;
  role: StaffRole;
  pin?: string;
  pinHash?: string;
  pinSalt?: string;
  active: boolean;
  permissions: Record<string, boolean>;
}

export interface AuditEntry {
  id: string;
  date: string;
  staff: string;
  action: string;
  detail: string;
}

export interface StockAdjustment {
  id: string;
  productId: string;
  productName: string;
  change: number;
  reason: string;
  date: string;
  staff: string;
}

export interface DailyClosingSummary {
  date: string;
  openingCash: number;
  cashSales: number;
  mixedCashSales: number;
  cashCustomerPayments: number;
  cashExpenses: number;
  supplierPayments: number;
  supplierCashPayments: number;
  cashRefunds: number;
  expectedCash: number;
  udhaarSales: number;
  mixedSales: number;
  totalSales: number;
}

export interface DayClosing {
  id: string;
  date: string;
  openingCash: number;
  cashSales: number;
  mixedCashSales?: number;
  cashExpenses: number;
  customerPayments: number;
  cashCustomerPayments?: number;
  supplierPayments: number;
  supplierCashPayments?: number;
  cashRefunds?: number;
  udhaarSales?: number;
  mixedSales?: number;
  totalSales?: number;
  expectedCash: number;
  actualCash: number;
  difference: number;
  staff: string;
  closedAt?: string;
}

export type CloseDayResult =
  | { ok: true; closingId: string; closing: DayClosing }
  | { ok: false; error: string };

export interface AppNotification {
  id: string;
  type: "Low Stock" | "Udhaar" | "Daily Closing" | "Backup";
  title: string;
  body: string;
  date: string;
  read: boolean;
}

export interface Settings {
  storeName: string;
  isDemoMode?: boolean;
  phone: string;
  address: string;
  theme: "light" | "dark" | "system";
  pinLock: boolean;
  pin?: string;
  receiptSize: "58mm" | "80mm" | "A5";
  receiptFooter: string;
  showStoreNameOnReceipt: boolean;
}

export const PERMISSION_KEYS = [
  "sale.create","sale.return","sale.void","product.create","product.edit","product.delete",
  "expense.create","expense.delete","report.view","report.export","customer.create","customer.edit",
  "supplier.create","supplier.payment","settings.edit","backup.download","backup.restore",
  "dayclose.create","staff.manage",
] as const;

export type PermissionKey = (typeof PERMISSION_KEYS)[number];
