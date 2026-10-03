import { money } from "./format";
import type {
  CreditPayment,
  DailyClosingSummary,
  DayClosing,
  Expense,
  Product,
  Sale,
  SupplierPayment,
} from "./types";

function returnedQtyForSale(sale: Sale, productId: string): number {
  return sale.returnedItems?.find((item) => item.productId === productId)?.returnedQty ?? 0;
}

export function saleReturnedAmount(sale: Sale): number {
  return money(sale.returnedTotal ?? 0);
}

export function saleNetTotal(sale: Sale): number {
  return money(Math.max(0, sale.total - saleReturnedAmount(sale)));
}

export function saleProfit(sale: Sale): number {
  const originalSubtotal = sale.items.reduce(
    (sum, item) => sum + item.price * item.qty,
    0,
  );

  const remainingGrossMargin = sale.items.reduce((sum, item) => {
    const returnedQty = returnedQtyForSale(sale, item.productId);
    const remainingQty = Math.max(0, item.qty - returnedQty);
    return sum + (item.price - item.purchasePrice) * remainingQty;
  }, 0);

  const returnedGross = sale.items.reduce((sum, item) => {
    const returnedQty = returnedQtyForSale(sale, item.productId);
    return sum + item.price * returnedQty;
  }, 0);

  const returnedDiscount =
    originalSubtotal > 0
      ? sale.discount * (returnedGross / originalSubtotal)
      : 0;

  const remainingDiscount = Math.max(0, sale.discount - returnedDiscount);

  return money(remainingGrossMargin - remainingDiscount);
}

export function dateKey(value: string | Date): string {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  const date = typeof value === "string" ? new Date(value) : value;
  const pad = (number: number) => String(number).padStart(2, "0");

  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
  ].join("-");
}

function saleNumberFromRefundNote(note: string | undefined): number | null {
  if (!note) return null;
  const match = note.match(/Sale #(\d+)/);
  return match ? Number(match[1]) : null;
}

export function calculateDailyClosing({
  date,
  sales,
  payments,
  expenses,
  supplierPayments,
  closings,
}: {
  date: string;
  sales: Sale[];
  payments: CreditPayment[];
  expenses: Expense[];
  supplierPayments: SupplierPayment[];
  closings: DayClosing[];
}): DailyClosingSummary {
  const sameDay = <T extends { date: string }>(items: T[]) =>
    items.filter((item) => dateKey(item.date) === date);

  const previousClosing = closings
    .filter((closing) => dateKey(closing.date) < date)
    .sort((a, b) => dateKey(b.date).localeCompare(dateKey(a.date)))[0];

  const openingCash = money(previousClosing?.expectedCash ?? 0);
  const daySales = sameDay(sales);

  const cashSales = money(
    daySales
      .filter((sale) => sale.mode === "Cash")
      .reduce((sum, sale) => sum + saleNetTotal(sale), 0),
  );

  const udhaarSales = money(
    daySales
      .filter((sale) => sale.mode === "Udhaar")
      .reduce((sum, sale) => sum + saleNetTotal(sale), 0),
  );

  const mixedSales = money(
    daySales
      .filter((sale) => sale.mode === "Mixed")
      .reduce((sum, sale) => sum + saleNetTotal(sale), 0),
  );

  const mixedCashSales = money(
    daySales
      .filter((sale) => sale.mode === "Mixed")
      .reduce((sum, sale) => sum + sale.paid, 0),
  );

  const cashCustomerPayments = money(
    sameDay(payments)
      .filter((payment) => payment.method === "Cash" && payment.amount > 0)
      .reduce((sum, payment) => sum + payment.amount, 0),
  );

  const cashRefunds = money(
    sameDay(payments)
      .filter(
        (payment) =>
          payment.method === "Cash Refund" && payment.amount < 0,
      )
      .reduce((sum, payment) => {
        const saleNumber = saleNumberFromRefundNote(payment.note);
        const relatedSale = saleNumber
          ? daySalesByNumber(sales, saleNumber)
          : undefined;

        // Cash-sale returns are already reflected by saleNetTotal().
        // Counting their negative refund ledger entry again would double-deduct cash.
        if (relatedSale?.mode === "Cash") return sum;

        return sum + Math.abs(payment.amount);
      }, 0),
  );

  const cashExpenses = money(
    sameDay(expenses).reduce((sum, expense) => sum + expense.amount, 0),
  );

  const supplierPaymentsTotal = money(
    sameDay(supplierPayments).reduce((sum, payment) => sum + payment.amount, 0),
  );

  const supplierCashPayments = money(
    sameDay(supplierPayments)
      .filter((payment) => payment.method === "Cash")
      .reduce((sum, payment) => sum + payment.amount, 0),
  );

  const totalSales = money(cashSales + udhaarSales + mixedSales);

  const expectedCash = money(
    openingCash +
      cashSales +
      mixedCashSales +
      cashCustomerPayments -
      cashExpenses -
      supplierCashPayments -
      cashRefunds,
  );

  return {
    date,
    openingCash,
    cashSales,
    mixedCashSales,
    cashCustomerPayments,
    cashExpenses,
    supplierPayments: supplierPaymentsTotal,
    supplierCashPayments,
    cashRefunds,
    expectedCash,
    udhaarSales,
    mixedSales,
    totalSales,
  };
}

function daySalesByNumber(
  sales: Sale[],
  number: number,
): Sale | undefined {
  return sales.find((sale) => sale.number === number);
}

export function isLowStock(p: Product): boolean {
  return p.stock <= p.lowStockLimit;
}

export type RangeKey = "today" | "7" | "30" | "all";

export const RANGE_LABELS: Record<RangeKey, string> = {
  today: "Aaj",
  "7": "7 Din",
  "30": "30 Din",
  all: "Sab",
};

export function inRange(iso: string, range: RangeKey, today = new Date()): boolean {
  if (range === "all") return true;
  const d = new Date(iso);
  const end = new Date(today);
  end.setHours(23, 59, 59, 999);
  const start = new Date(today);
  start.setHours(0, 0, 0, 0);
  if (range === "7") start.setDate(start.getDate() - 6);
  if (range === "30") start.setDate(start.getDate() - 29);
  return d >= start && d <= end;
}

export function periodTotals(
  sales: Sale[],
  expenses: Expense[],
  purchaseTotal: number,
) {
  const salesTotal = money(sales.reduce((s, x) => s + saleNetTotal(x), 0));
  const grossProfit = money(sales.reduce((s, x) => s + saleProfit(x), 0));
  const expenseTotal = money(expenses.reduce((s, x) => s + x.amount, 0));
  return {
    salesTotal,
    grossProfit,
    expenseTotal,
    purchaseTotal: money(purchaseTotal),
    netProfit: money(grossProfit - expenseTotal),
  };
}

export function lastNDays(n: number, today = new Date()): string[] {
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}
