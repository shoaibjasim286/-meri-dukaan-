import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { BarChart3, Banknote, ShoppingCart, TrendingUp, Truck } from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useStore } from "@/lib/store";
import { formatDayMonth, rs } from "@/lib/format";
import { inRange, lastNDays, periodTotals, saleProfit, RANGE_LABELS, type RangeKey } from "@/lib/selectors";
import { FilterChips, KpiCard, PageHeader, Panel } from "@/components/dukaan/primitives";

export const Route = createFileRoute("/hisaab")({
  head: () => ({
    meta: [
      { title: "Hisaab (Profit) — DukaanFlow" },
      { name: "description", content: "Bikri, kharid, kharcha aur net munafa ka summary." },
      { property: "og:title", content: "Hisaab — DukaanFlow" },
      { property: "og:description", content: "Net profit = bikri ka munafa - kharche." },
    ],
  }),
  component: HisaabPage,
});

const RANGES: RangeKey[] = ["today", "7", "30", "all"];

function HisaabPage() {
  const { sales, expenses, purchases } = useStore();
  const [range, setRange] = useState<RangeKey>("30");

  const s = sales.filter((x) => inRange(x.date, range));
  const e = expenses.filter((x) => inRange(x.date, range));
  const p = purchases.filter((x) => inRange(x.date, range));
  const t = periodTotals(s, e, p.reduce((sum, x) => sum + x.total, 0));

  const chart = lastNDays(range === "today" ? 1 : range === "7" ? 7 : 30).map((day) => {
    const daySales = sales.filter((x) => x.date.slice(0, 10) === day);
    const dayExp = expenses.filter((x) => x.date.slice(0, 10) === day);
    return {
      day: formatDayMonth(`${day}T12:00:00`),
      bikri: daySales.reduce((sum, x) => sum + x.total, 0),
      munafa:
        daySales.reduce((sum, x) => sum + saleProfit(x), 0) -
        dayExp.reduce((sum, x) => sum + x.amount, 0),
    };
  });

  return (
    <div className="space-y-5">
      <PageHeader title="Hisaab" subtitle="Munafa aur kharch ka poora khaka" />
      <FilterChips
        options={RANGES.map((r) => RANGE_LABELS[r])}
        value={RANGE_LABELS[range]}
        onChange={(v) => setRange(RANGES.find((r) => RANGE_LABELS[r] === v) ?? "30")}
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <KpiCard label="Total Sales" value={rs(t.salesTotal)} icon={ShoppingCart} tone="primary" />
        <KpiCard label="Total Purchase" value={rs(t.purchaseTotal)} icon={Truck} tone="teal" />
        <KpiCard label="Total Expense" value={rs(t.expenseTotal)} icon={Banknote} tone="danger" />
        <KpiCard label="Gross Profit" value={rs(t.grossProfit)} icon={TrendingUp} tone="amber" />
        <KpiCard label="Net Profit" value={rs(t.netProfit)} icon={BarChart3} tone="success" />
      </div>

      <Panel title="Sales / Profit Trend">
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chart} margin={{ left: -18, right: 6, top: 8 }}>
              <defs>
                <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-chart-1)" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="var(--color-chart-1)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="g2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-chart-4)" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="var(--color-chart-4)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="day" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 11 }} width={60} />
              <Tooltip
                contentStyle={{
                  background: "var(--color-card)",
                  border: "1px solid var(--color-border)",
                  borderRadius: 12,
                }}
              />
              <Area type="monotone" dataKey="bikri" stroke="var(--color-chart-1)" fill="url(#g1)" strokeWidth={2} />
              <Area type="monotone" dataKey="munafa" stroke="var(--color-chart-4)" fill="url(#g2)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Panel>
    </div>
  );
}
