import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Download, Printer, Share2 } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useStore } from "@/lib/store";
import { exportReport, type ExportColumn } from "@/lib/export";
import { printElement } from "@/lib/print";
import { shareContent } from "@/lib/share";
import { hasPermission } from "@/lib/permissions";
import { formatDate, rs } from "@/lib/format";
import { inRange, saleNetTotal, saleProfit, RANGE_LABELS, type RangeKey } from "@/lib/selectors";
import { FilterChips, PageHeader, Panel } from "@/components/dukaan/primitives";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/reports")({
  head: () => ({
    meta: [
      { title: "Reports — DukaanFlow" },
      { name: "description", content: "Sales, profit, stock aur udhaar reports print ya export karein." },
      { property: "og:title", content: "Reports — DukaanFlow" },
      { property: "og:description", content: "Top products, top customers aur trends." },
    ],
  }),
  component: ReportsPage,
});

const RANGES: RangeKey[] = ["today", "7", "30", "all"];

const REPORT_CARDS = [
  "Sales Report",
  "Purchase Report",
  "Profit Report",
  "Expense Report",
  "Stock Report",
  "Customer Udhaar",
  "Supplier Balance",
  "Supplier Payments",
  "Staff Activity",
  "Daily Closing",
] as const;

type ReportRow = Record<string, string | number>;

interface ReportDefinition {
  title: string;
  description: string;
  rows: ReportRow[];
  columns: ExportColumn[];
}

function ReportsPage() {
  const {
    sales,
    purchases,
    expenses,
    products,
    customers,
    suppliers,
    supplierPayments,
    staff,
    audit,
    closings,
    currentStaff,
  } = useStore();
  const canViewReports = hasPermission(currentStaff, "report.view");
  const canExportReports = hasPermission(currentStaff, "report.export");
  const [range, setRange] = useState<RangeKey>("30");
  const [activeReport, setActiveReport] = useState<(typeof REPORT_CARDS)[number] | null>(null);

  if (!canViewReports) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-lg font-bold">Permission Nahi Hai</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Reports dekhne ki ijazat nahi hai. Admin se rabta karein.
        </p>
      </div>
    );
  }

  const scoped = sales.filter((s) => inRange(s.date, range));

  const REPORT_COLUMNS: ExportColumn[] = [
    { header: "Date", key: "date" },
    { header: "Bill", key: "number" },
    { header: "Customer", key: "customer" },
    { header: "Payment", key: "mode" },
    { header: "Total", key: "total" },
    { header: "Paid", key: "paid" },
    { header: "Due", key: "due" },
  ];

  const reportRows = scoped.map((sale) => ({
    date: sale.date,
    number: sale.number,
    customer: sale.customerName,
    mode: sale.mode,
    total: saleNetTotal(sale),
    paid: sale.paid,
    due: sale.total - sale.paid,
  }));

  const shareReport = async () => {
    const totalSales = scoped.reduce((sum, sale) => sum + sale.total, 0);
    const grossProfit = scoped.reduce((sum, sale) => sum + saleProfit(sale), 0);

    await shareContent(
      "Meri Dukaan Report",
      `Meri Dukaan — Reports
Period: ${RANGE_LABELS[range]}
Sales: ${rs(totalSales)}
Bills: ${scoped.length}
Gross Profit: ${rs(grossProfit)}`,
      typeof window !== "undefined" ? window.location.href : undefined,
    );
  };

  const productTotals = new Map<string, number>();
  scoped.forEach((s) =>
    s.items.forEach((i) =>
      productTotals.set(i.name, (productTotals.get(i.name) ?? 0) + i.qty * i.price),
    ),
  );
  const topProducts = [...productTotals.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([name, value]) => ({ name, value }));

  const supplierPaymentSummary = supplierPayments
    .filter((payment) => inRange(payment.date, range))
    .reduce((map, payment) => {
      const current = map.get(payment.supplierId) ?? {
        supplierId: payment.supplierId,
        supplierName: payment.supplierName,
        total: 0,
        count: 0,
      };
      current.total += payment.amount;
      current.count += 1;
      map.set(payment.supplierId, current);
      return map;
    }, new Map<string, { supplierId: string; supplierName: string; total: number; count: number }>());

  const supplierPaymentsTotal = [...supplierPaymentSummary.values()].reduce(
    (sum, payment) => sum + payment.total,
    0,
  );

  const topCustomers = [...customers]
    .sort((a, b) => b.balance - a.balance)
    .slice(0, 5);

  const reportDefinitions: Record<(typeof REPORT_CARDS)[number], ReportDefinition> = {
    "Sales Report": {
      title: "Sales Report",
      description: "Sales aur bills — " + RANGE_LABELS[range],
      columns: [
        { header: "Date", key: "date" },
        { header: "Bill", key: "bill" },
        { header: "Customer", key: "customer" },
        { header: "Payment", key: "payment" },
        { header: "Total", key: "total" },
        { header: "Paid", key: "paid" },
        { header: "Due", key: "due" },
      ],
      rows: scoped.map((sale) => ({
        date: formatDate(sale.date),
        bill: sale.number,
        customer: sale.customerName,
        payment: sale.mode,
        total: rs(saleNetTotal(sale)),
        paid: rs(sale.paid),
        due: rs(saleNetTotal(sale) - sale.paid),
      })),
    },
    "Purchase Report": {
      title: "Purchase Report",
      description: "Supplier purchases — " + RANGE_LABELS[range],
      columns: [
        { header: "Date", key: "date" },
        { header: "Invoice", key: "invoice" },
        { header: "Supplier", key: "supplier" },
        { header: "Items", key: "items" },
        { header: "Total", key: "total" },
        { header: "Paid", key: "paid" },
        { header: "Due", key: "due" },
      ],
      rows: purchases
        .filter((purchase) => inRange(purchase.date, range))
        .map((purchase) => ({
          date: formatDate(purchase.date),
          invoice: purchase.invoiceNo,
          supplier: purchase.supplierName,
          items: purchase.items.length,
          total: rs(purchase.total),
          paid: rs(purchase.paid),
          due: rs(purchase.total - purchase.paid),
        })),
    },
    "Profit Report": {
      title: "Profit Report",
      description: "Sales, gross profit aur expenses — " + RANGE_LABELS[range],
      columns: [
        { header: "Period", key: "period" },
        { header: "Sales", key: "sales" },
        { header: "Gross Profit", key: "grossProfit" },
        { header: "Expenses", key: "expenses" },
        { header: "Net Profit", key: "netProfit" },
        { header: "Bills", key: "bills" },
      ],
      rows: [
        {
          period: RANGE_LABELS[range],
          sales: rs(scoped.reduce((sum, sale) => sum + saleNetTotal(sale), 0)),
          grossProfit: rs(scoped.reduce((sum, sale) => sum + saleProfit(sale), 0)),
          expenses: rs(
            expenses
              .filter((expense) => inRange(expense.date, range))
              .reduce((sum, expense) => sum + expense.amount, 0),
          ),
          netProfit: rs(
            scoped.reduce((sum, sale) => sum + saleProfit(sale), 0) -
              expenses
                .filter((expense) => inRange(expense.date, range))
                .reduce((sum, expense) => sum + expense.amount, 0),
          ),
          bills: scoped.length,
        },
      ],
    },
    "Expense Report": {
      title: "Expense Report",
      description: "Expenses aur categories — " + RANGE_LABELS[range],
      columns: [
        { header: "Date", key: "date" },
        { header: "Category", key: "category" },
        { header: "Amount", key: "amount" },
        { header: "Note", key: "note" },
      ],
      rows: expenses
        .filter((expense) => inRange(expense.date, range))
        .map((expense) => ({
          date: formatDate(expense.date),
          category: expense.category,
          amount: rs(expense.amount),
          note: expense.note,
        })),
    },
    "Stock Report": {
      title: "Stock Report",
      description: "Current inventory aur low-stock items",
      columns: [
        { header: "Product", key: "product" },
        { header: "Category", key: "category" },
        { header: "Stock", key: "stock" },
        { header: "Unit", key: "unit" },
        { header: "Low Limit", key: "lowLimit" },
        { header: "Stock Value", key: "stockValue" },
        { header: "Status", key: "status" },
      ],
      rows: products.map((product) => ({
        product: product.name,
        category: product.category,
        stock: product.stock,
        unit: product.unit,
        lowLimit: product.lowStockLimit,
        stockValue: rs(product.stock * product.purchasePrice),
        status:
          product.stock === 0
            ? "Out of Stock"
            : product.stock <= product.lowStockLimit
              ? "Low Stock"
              : "OK",
      })),
    },
    "Customer Udhaar": {
      title: "Customer Udhaar",
      description: "Jin customers ka baqi udhaar hai",
      columns: [
        { header: "Customer", key: "customer" },
        { header: "Phone", key: "phone" },
        { header: "Balance", key: "balance" },
        { header: "Last Activity", key: "lastActivity" },
      ],
      rows: customers
        .filter((customer) => customer.balance > 0)
        .sort((a, b) => b.balance - a.balance)
        .map((customer) => ({
          customer: customer.name,
          phone: customer.phone,
          balance: rs(customer.balance),
          lastActivity: formatDate(customer.lastActivity),
        })),
    },
    "Supplier Balance": {
      title: "Supplier Balance",
      description: "Jin suppliers ko payment deni hai",
      columns: [
        { header: "Supplier", key: "supplier" },
        { header: "Company", key: "company" },
        { header: "Balance", key: "balance" },
        { header: "Last Purchase", key: "lastPurchase" },
      ],
      rows: suppliers
        .filter((supplier) => supplier.balance > 0)
        .sort((a, b) => b.balance - a.balance)
        .map((supplier) => ({
          supplier: supplier.name,
          company: supplier.company,
          balance: rs(supplier.balance),
          lastPurchase: formatDate(supplier.lastPurchase),
        })),
    },
    "Supplier Payments": {
      title: "Supplier Payments",
      description: "Supplier payments — " + RANGE_LABELS[range],
      columns: [
        { header: "Date", key: "date" },
        { header: "Supplier", key: "supplier" },
        { header: "Amount", key: "amount" },
        { header: "Method", key: "method" },
        { header: "Staff", key: "staff" },
        { header: "Purchase", key: "purchase" },
      ],
      rows: supplierPayments
        .filter((payment) => inRange(payment.date, range))
        .map((payment) => ({
          date: formatDate(payment.date),
          supplier: payment.supplierName,
          amount: rs(payment.amount),
          method: payment.method,
          staff: payment.staff,
          purchase: payment.purchaseId ?? "General",
        })),
    },
    "Staff Activity": {
      title: "Staff Activity",
      description: "Staff activity summary — " + RANGE_LABELS[range],
      columns: [
        { header: "Staff", key: "staff" },
        { header: "Actions", key: "actions" },
        { header: "Last Activity", key: "lastActivity" },
      ],
      rows: staff.map((member) => {
        const activities = audit.filter(
          (entry) =>
            entry.staff === member.name && inRange(entry.date, range),
        );
        const latest = activities[0]?.date;
        return {
          staff: member.name,
          actions: activities.length,
          lastActivity: latest ? formatDate(latest) : "No activity",
        };
      }),
    },
    "Daily Closing": {
      title: "Daily Closing",
      description: "Closing history — " + RANGE_LABELS[range],
      columns: [
        { header: "Date", key: "date" },
        { header: "Opening", key: "opening" },
        { header: "Expected", key: "expected" },
        { header: "Actual", key: "actual" },
        { header: "Difference", key: "difference" },
        { header: "Staff", key: "staff" },
        { header: "Closed At", key: "closedAt" },
      ],
      rows: closings
        .filter((closing) => inRange(closing.date, range))
        .map((closing) => ({
          date: formatDate(closing.date),
          opening: rs(closing.openingCash),
          expected: rs(closing.expectedCash),
          actual: rs(closing.actualCash),
          difference: rs(closing.difference),
          staff: closing.staff,
          closedAt: closing.closedAt ? formatDate(closing.closedAt) : "—",
        })),
    },
  };

  const activeDefinition = activeReport ? reportDefinitions[activeReport] : null;

  const shareActiveReport = async () => {
    if (!activeDefinition || !activeReport) return;
    await shareContent(
      "Meri Dukaan — " + activeDefinition.title,
      activeDefinition.title +
        "\nPeriod: " +
        activeDefinition.description +
        "\nRows: " +
        activeDefinition.rows.length,
      typeof window !== "undefined" ? window.location.href : undefined,
    );
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Reports"
        subtitle="Har report ek click par"
        actions={
          <div className="no-print flex flex-wrap gap-2">
            <Button
              variant="outline"
              className="rounded-xl"
              onClick={() => printElement("reports-print-area")}
            >
              <Printer className="size-4" /> Print
            </Button>
            <Button
              variant="outline"
              className="rounded-xl"
              disabled={!canExportReports} title={!canExportReports ? "Aapko ye permission nahi hai" : undefined} onClick={() => exportReport("sales", "csv", reportRows, REPORT_COLUMNS)}
            >
              <Download className="size-4" /> CSV
            </Button>
            <Button
              variant="outline"
              className="rounded-xl"
              disabled={!canExportReports} title={!canExportReports ? "Aapko ye permission nahi hai" : undefined} onClick={() => exportReport("sales", "pdf", reportRows, REPORT_COLUMNS)}
            >
              <Download className="size-4" /> PDF
            </Button>
            <Button
              variant="outline"
              className="rounded-xl"
              onClick={() => void shareReport()}
            >
              <Share2 className="size-4" /> Share
            </Button>
          </div>
        }
      />
      <div
        id="reports-print-area"
        data-print-format="report"
        className="space-y-5"
      >
        <div className="print-only">
          <h1 className="text-2xl font-bold">Meri Dukaan — Reports</h1>
          <p className="text-sm">Period: {RANGE_LABELS[range]}</p>
        </div>

        <FilterChips
          options={RANGES.map((r) => RANGE_LABELS[r])}
          value={RANGE_LABELS[range]}
          onChange={(v) => setRange(RANGES.find((r) => RANGE_LABELS[r] === v) ?? "30")}
        />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {REPORT_CARDS.map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => setActiveReport(r)}
            className="surface-card p-4 text-left text-sm font-bold transition-shadow hover:shadow-float"
          >
            {r}
            <span className="mt-1 block text-xs font-medium text-muted-foreground">
              {r === "Stock Report" ||
              r === "Customer Udhaar" ||
              r === "Supplier Balance"
                ? "Current snapshot"
                : RANGE_LABELS[range]}
            </span>
          </button>
        ))}      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="Top Products">
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topProducts} margin={{ left: -18, right: 6, top: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-15} height={50} />
                <YAxis tick={{ fontSize: 11 }} width={60} />
                <Tooltip
                  contentStyle={{
                    background: "var(--color-card)",
                    border: "1px solid var(--color-border)",
                    borderRadius: 12,
                  }}
                />
                <Bar dataKey="value" fill="var(--color-chart-1)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="Top Customers (Udhaar)" bodyClassName="p-0">
          <ul className="divide-y divide-border">
            {topCustomers.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-3 px-4 py-3 sm:px-5">
                <span className="min-w-0 truncate font-bold">{c.name}</span>
                <span className="shrink-0 font-bold tabular-nums">{rs(c.balance)}</span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <Panel title="Supplier Payments">
        <div className="mb-3 flex items-center justify-between rounded-xl bg-muted px-3 py-2">
          <span className="text-sm font-bold">Total Payments</span>
          <span className="num-lg text-lg">{rs(supplierPaymentsTotal)}</span>
        </div>
        {supplierPaymentSummary.size === 0 ? (
          <p className="text-sm text-muted-foreground">
            Is period mein supplier payment nahi hui.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {[...supplierPaymentSummary.values()]
              .sort((a, b) => b.total - a.total)
              .map((payment) => (
                <li
                  key={payment.supplierId}
                  className="flex items-center justify-between gap-3 py-2.5"
                >
                  <span className="min-w-0 truncate font-bold">
                    {payment.supplierName}
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="num-lg block">{rs(payment.total)}</span>
                    <span className="text-xs text-muted-foreground">
                      {payment.count} payments
                    </span>
                  </span>
                </li>
              ))}
          </ul>
        )}
      </Panel>

      <Panel title="Period Summary">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Box label="Sales" value={rs(scoped.reduce((s, x) => s + x.total, 0))} />
          <Box label="Bills" value={String(scoped.length)} />
          <Box label="Gross Profit" value={rs(scoped.reduce((s, x) => s + saleProfit(x), 0))} />
          <Box
            label="Average Bill"
            value={rs(scoped.length ? scoped.reduce((s, x) => s + x.total, 0) / scoped.length : 0)}
          />
        </div>
      </Panel>
      </div>

      {activeDefinition ? (
        <Dialog
          open={!!activeDefinition}
          onOpenChange={(open) => {
            if (!open) setActiveReport(null);
          }}
        >
          <DialogContent className="max-h-[90vh] max-w-6xl overflow-hidden">
            <DialogHeader>
              <DialogTitle>{activeDefinition.title}</DialogTitle>
              <p className="text-sm text-muted-foreground">
                {activeDefinition.description} · {activeDefinition.rows.length} rows
              </p>
            </DialogHeader>

            <div
              id="active-report-print-area"
              data-print-format="report"
              className="overflow-hidden"
            >
              <div className="max-h-[55vh] overflow-auto rounded-xl border border-border">
                {activeDefinition.rows.length === 0 ? (
                  <p className="p-6 text-sm text-muted-foreground">
                    Is report ke liye koi record nahi mila.
                  </p>
                ) : (
                  <table className="w-full min-w-max border-collapse text-sm">
                    <thead className="sticky top-0 bg-muted">
                      <tr>
                        {activeDefinition.columns.map((column) => (
                          <th
                            key={column.key}
                            className="border-b border-border px-3 py-2 text-left font-bold"
                          >
                            {column.header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {activeDefinition.rows.map((row, rowIndex) => (
                        <tr
                          key={rowIndex}
                          className="border-b border-border last:border-0"
                        >
                          {activeDefinition.columns.map((column) => (
                            <td key={column.key} className="px-3 py-2 align-top">
                              {String(row[column.key] ?? "")}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            <DialogFooter className="no-print gap-2 sm:flex-row sm:justify-between">
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  onClick={() => printElement("active-report-print-area")}
                >
                  <Printer className="size-4" /> Print
                </Button>
                <Button
                  variant="outline"
                  disabled={!canExportReports}
                  title={!canExportReports ? "Aapko ye permission nahi hai" : undefined}
                  onClick={() => {
                    if (!activeReport) return;
                    exportReport(
                      activeReport,
                      "csv",
                      activeDefinition.rows,
                      activeDefinition.columns,
                    );
                  }}
                >
                  <Download className="size-4" /> CSV
                </Button>
                <Button
                  variant="outline"
                  disabled={!canExportReports}
                  title={!canExportReports ? "Aapko ye permission nahi hai" : undefined}
                  onClick={() => {
                    if (!activeReport) return;
                    exportReport(
                      activeReport,
                      "pdf",
                      activeDefinition.rows,
                      activeDefinition.columns,
                    );
                  }}
                >
                  <Download className="size-4" /> PDF
                </Button>
                <Button variant="outline" onClick={() => void shareActiveReport()}>
                  <Share2 className="size-4" /> Share
                </Button>
              </div>
              <Button onClick={() => setActiveReport(null)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ) : null}
    </div>
  );
}

function Box({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-muted px-3 py-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="num-lg mt-0.5 text-lg">{value}</p>
    </div>
  );
}
