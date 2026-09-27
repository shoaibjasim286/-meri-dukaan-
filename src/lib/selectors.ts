import { money } from "./format";
import type { Expense, Product, Sale } from "./types";

export function saleProfit(sale: Sale): number {
  const gross = sale.items.reduce(
    (s, i) => s + (i.price - i.purchasePrice) * i.qty,
    0,
  );
  return money(gross - sale.discount);
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
  const salesTotal = money(sales.reduce((s, x) => s + x.total, 0));
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
