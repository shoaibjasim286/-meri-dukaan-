import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Download, Printer, Share2 } from "lucide-react";
import { toast } from "sonner";
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
import { rs } from "@/lib/format";
import { inRange, saleNetTotal, saleProfit, RANGE_LABELS, type RangeKey } from "@/lib/selectors";
import { FilterChips, PageHeader, Panel } from "@/components/dukaan/primitives";
import { Button } from "@/components/ui/button";

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
];

function ReportsPage() {
  const { sales, customers, supplierPayments, currentStaff } = useStore();
  const canViewReports = hasPermission(currentStaff, "report.view");
  const canExportReports = hasPermission(currentStaff, "report.export");
  const [range, setRange] = useState<RangeKey>("30");
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
            onClick={() => toast.info(`${r} khul gayi (demo)`)}
            className="surface-card p-4 text-left text-sm font-bold"
          >
            {r}
            <span className="mt-1 block text-xs font-medium text-muted-foreground">
              {RANGE_LABELS[range]}
            </span>
          </button>
        ))}
      </div>

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
