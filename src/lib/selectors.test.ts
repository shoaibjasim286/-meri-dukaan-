import { describe, expect, it } from "vitest";
import {
  calculateDailyClosing,
  periodTotals,
  saleNetTotal,
  saleProfit,
} from "@/lib/selectors";
import type { CreditPayment, DayClosing, Expense, Sale, SupplierPayment } from "@/lib/types";

const sale = (overrides: Partial<Sale> = {}): Sale => ({
  id: "sale-1",
  number: 1001,
  date: "2026-10-01T10:00:00.000Z",
  items: [
    { productId: "p-1", name: "Biscuit", qty: 10, price: 100, purchasePrice: 60 },
  ],
  discount: 0,
  total: 1000,
  paid: 1000,
  mode: "Cash",
  customerId: null,
  customerName: "Walk-in Customer",
  staff: "Owner",
  ...overrides,
});

const expense = (amount: number, date = "2026-10-01T12:00:00.000Z"): Expense => ({
  id: "expense-1",
  category: "Bijli",
  amount,
  date,
  note: "Test expense",
});

const supplierPayment = (
  amount: number,
  method: SupplierPayment["method"] = "Cash",
  date = "2026-10-01T13:00:00.000Z",
): SupplierPayment => ({
  id: "supplier-payment-1",
  supplierId: "sup-1",
  supplierName: "Ali Wholesale",
  amount,
  date,
  method,
  staff: "Owner",
});

const creditPayment = (
  amount: number,
  date = "2026-10-01T14:00:00.000Z",
): CreditPayment => ({
  id: "payment-1",
  customerId: "cust-1",
  customerName: "Ahmed",
  amount,
  date,
  method: "Cash",
  note: "Udhaar jama",
});

const closing = (overrides: Partial<DayClosing> = {}): DayClosing => ({
  id: "closing-1",
  date: "2026-09-30T20:00:00.000Z",
  openingCash: 0,
  cashSales: 0,
  cashExpenses: 0,
  customerPayments: 0,
  supplierPayments: 0,
  expectedCash: 250,
  actualCash: 250,
  difference: 0,
  staff: "Owner",
  ...overrides,
});

describe("saleNetTotal", () => {
  it("returns total when there are no returns", () => {
    expect(saleNetTotal(sale())).toBe(1000);
  });

  it("subtracts a partial returned amount", () => {
    expect(saleNetTotal(sale({ returnedTotal: 250 }))).toBe(750);
  });

  it("returns zero for a full return", () => {
    expect(saleNetTotal(sale({ returnedTotal: 1000 }))).toBe(0);
  });

  it("clamps an over-return to zero", () => {
    expect(saleNetTotal(sale({ returnedTotal: 1200 }))).toBe(0);
  });

  it("handles an empty zero-value sale", () => {
    expect(saleNetTotal(sale({ items: [], total: 0 }))).toBe(0);
  });
});

describe("saleProfit", () => {
  it("calculates basic profit after discount", () => {
    expect(saleProfit(sale({ discount: 100, total: 900 }))).toBe(300);
  });

  it("calculates profit after a partial return", () => {
    expect(
      saleProfit(
        sale({
          discount: 100,
          total: 900,
          returnedTotal: 180,
          returnedItems: [{ productId: "p-1", qty: 10, returnedQty: 2 }],
        }),
      ),
    ).toBe(240);
  });

  it("returns zero profit after a full return", () => {
    expect(
      sale(
        { discount: 100, total: 900, returnedTotal: 900 } as never,
      ),
    );
  });

  it("returns zero when there is no margin", () => {
    expect(
      saleProfit(
        sale({
          items: [
            { productId: "p-1", name: "Bottle", qty: 5, price: 100, purchasePrice: 100 },
          ],
          total: 500,
          paid: 500,
        }),
      ),
    ).toBe(0);
  });

  it("handles an empty sale", () => {
    expect(saleProfit(sale({ items: [], total: 0, discount: 0 }))).toBe(0);
  });
});

describe("periodTotals", () => {
  it("calculates totals for a pre-filtered date range", () => {
    const inRange = sale({
      total: 500,
      items: [
        { productId: "p-1", name: "Biscuit", qty: 5, price: 100, purchasePrice: 60 },
      ],
    });
    const totals = periodTotals([inRange], [expense(50)], 200);

    expect(totals.salesTotal).toBe(500);
    expect(totals.grossProfit).toBe(200);
    expect(totals.expenseTotal).toBe(50);
    expect(totals.purchaseTotal).toBe(200);
    expect(totals.netProfit).toBe(150);
  });

  it("sums multiple sales in the selected range", () => {
    const first = sale({
      id: "sale-1",
      total: 500,
      items: [{ productId: "p-1", name: "Biscuit", qty: 5, price: 100, purchasePrice: 60 }],
    });
    const second = sale({
      id: "sale-2",
      total: 750,
      items: [{ productId: "p-2", name: "Milk", qty: 5, price: 150, purchasePrice: 100 }],
    });

    const totals = periodTotals([first, second], [], 0);
    expect(totals.salesTotal).toBe(1250);
    expect(totals.grossProfit).toBe(450);
    expect(totals.netProfit).toBe(450);
  });

  it("returns zeros for an empty range", () => {
    expect(periodTotals([], [], 0)).toEqual({
      salesTotal: 0,
      grossProfit: 0,
      expenseTotal: 0,
      purchaseTotal: 0,
      netProfit: 0,
    });
  });

  it("uses only the sales and expenses supplied for the range", () => {
    const totals = periodTotals(
      [
        sale({
          total: 300,
          items: [{ productId: "p-1", name: "Soap", qty: 3, price: 100, purchasePrice: 80 }],
        }),
      ],
      [expense(40)],
      120,
    );

    expect(totals.salesTotal).toBe(300);
    expect(totals.grossProfit).toBe(60);
    expect(totals.netProfit).toBe(20);
  });
});

describe("calculateDailyClosing", () => {
  it("calculates cash sales only", () => {
    const result = calculateDailyClosing({
      date: "2026-10-01",
      sales: [sale()],
      payments: [],
      expenses: [],
      supplierPayments: [],
      closings: [],
    });

    expect(result.cashSales).toBe(1000);
    expect(result.udhaarSales).toBe(0);
    expect(result.mixedSales).toBe(0);
    expect(result.expectedCash).toBe(1000);
  });

  it("separates Udhaar sales from cash", () => {
    const result = calculateDailyClosing({
      date: "2026-10-01",
      sales: [
        sale({ id: "cash", total: 500, paid: 500 }),
        sale({ id: "credit", total: 800, paid: 0, mode: "Udhaar" }),
      ],
      payments: [],
      expenses: [],
      supplierPayments: [],
      closings: [],
    });

    expect(result.cashSales).toBe(500);
    expect(result.udhaarSales).toBe(800);
    expect(result.expectedCash).toBe(500);
    expect(result.totalSales).toBe(1300);
  });

  it("uses only the paid portion of a Mixed sale as cash", () => {
    const result = calculateDailyClosing({
      date: "2026-10-01",
      sales: [sale({ mode: "Mixed", total: 1000, paid: 400 })],
      payments: [],
      expenses: [],
      supplierPayments: [],
      closings: [],
    });

    expect(result.mixedSales).toBe(1000);
    expect(result.mixedCashSales).toBe(400);
    expect(result.expectedCash).toBe(400);
  });

  it("subtracts cash expenses", () => {
    const result = calculateDailyClosing({
      date: "2026-10-01",
      sales: [sale()],
      payments: [],
      expenses: [expense(150)],
      supplierPayments: [],
      closings: [],
    });

    expect(result.cashExpenses).toBe(150);
    expect(result.expectedCash).toBe(850);
  });

  it("subtracts supplier cash payments but keeps bank payments out of cash", () => {
    const result = calculateDailyClosing({
      date: "2026-10-01",
      sales: [sale()],
      payments: [],
      expenses: [],
      supplierPayments: [supplierPayment(200, "Cash"), supplierPayment(300, "Bank")],
      closings: [],
    });

    expect(result.supplierPayments).toBe(500);
    expect(result.supplierCashPayments).toBe(200);
    expect(result.expectedCash).toBe(800);
  });

  it("adds same-day customer cash payments", () => {
    const result = calculateDailyClosing({
      date: "2026-10-01",
      sales: [sale({ total: 500, paid: 500 })],
      payments: [creditPayment(300)],
      expenses: [],
      supplierPayments: [],
      closings: [],
    });

    expect(result.cashCustomerPayments).toBe(300);
    expect(result.expectedCash).toBe(800);
  });

  it("includes the previous closing as opening cash", () => {
    const result = calculateDailyClosing({
      date: "2026-10-01",
      sales: [sale({ total: 500, paid: 500 })],
      payments: [],
      expenses: [],
      supplierPayments: [],
      closings: [closing()],
    });

    expect(result.openingCash).toBe(250);
    expect(result.expectedCash).toBe(750);
  });

  it("ignores transactions outside the requested day", () => {
    const result = calculateDailyClosing({
      date: "2026-10-01",
      sales: [
        sale({ total: 500, paid: 500 }),
        sale({ id: "yesterday", date: "2026-09-30T10:00:00.000Z", total: 900, paid: 900 }),
      ],
      payments: [creditPayment(200, "2026-09-30T12:00:00.000Z")],
      expenses: [expense(50, "2026-09-30T13:00:00.000Z")],
      supplierPayments: [supplierPayment(100, "Cash", "2026-09-30T14:00:00.000Z")],
      closings: [],
    });

    expect(result.cashSales).toBe(500);
    expect(result.cashCustomerPayments).toBe(0);
    expect(result.cashExpenses).toBe(0);
    expect(result.supplierCashPayments).toBe(0);
    expect(result.expectedCash).toBe(500);
  });
});
