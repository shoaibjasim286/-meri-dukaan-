import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  Banknote,
  Boxes,
  Receipt,
  ShoppingCart,
  TrendingUp,
  Truck,
  UserPlus,
  Wallet,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { formatTime, formatToday, rs } from "@/lib/format";
import { inRange, isLowStock, saleProfit } from "@/lib/selectors";
import {
  EmptyState,
  KpiCard,
  Panel,
  Pill,
  QuickAction,
  StatCard,
} from "@/components/dukaan/primitives";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Ghar — DukaanFlow" },
      {
        name: "description",
        content: "Aaj ki bikri, munafa, udhaar aur kam stock ek nazar mein.",
      },
      { property: "og:title", content: "Ghar — DukaanFlow" },
      {
        property: "og:description",
        content: "Aaj ka poora hisaab ek dashboard par.",
      },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { sales, expenses, purchases, customers, products, settings } = useStore();

  const todaySales = sales.filter((s) => inRange(s.date, "today"));
  const todayExpenses = expenses.filter((e) => inRange(e.date, "today"));
  const todayPurchases = purchases.filter((p) => inRange(p.date, "today"));

  const bikri = todaySales.reduce((s, x) => s + x.total, 0);
  const grossProfit = todaySales.reduce((s, x) => s + saleProfit(x), 0);
  const kharcha = todayExpenses.reduce((s, x) => s + x.amount, 0);
  const kharid = todayPurchases.reduce((s, x) => s + x.total, 0);
  const munafa = grossProfit - kharcha;
  const udhaar = customers.reduce((s, c) => s + c.balance, 0);
  const lowStock = products.filter((p) => p.active && isLowStock(p));

  const hour = new Date().getHours();
  const greet = hour < 12 ? "Good Morning" : hour < 17 ? "Good Afternoon" : "Good Evening";

  return (
    <div className="space-y-5">
      <div className="surface-card bg-sidebar p-5 text-sidebar-foreground sm:p-6">
        <p className="text-sm opacity-70">{greet}</p>
        <h1 className="mt-1 text-2xl font-extrabold sm:text-3xl">{settings.storeName}</h1>
        <p className="mt-1 text-sm opacity-70">Aaj — {formatToday()}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard label="Aaj ki Bikri" value={rs(bikri)} icon={ShoppingCart} tone="primary" to="/reports" />
        <KpiCard label="Aaj ka Munafa" value={rs(munafa)} icon={TrendingUp} tone="success" to="/hisaab" />
        <KpiCard label="Baqi Udhaar" value={rs(udhaar)} icon={Wallet} tone="amber" to="/udhaar" />
        <KpiCard
          label="Kam Stock"
          value={`${lowStock.length} Items`}
          icon={AlertTriangle}
          tone="danger"
          to="/samaan"
        />
      </div>

      <Panel title="Quick Actions">
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
          <QuickAction label="Bikri" icon={ShoppingCart} to="/bikri" />
          <QuickAction label="Kharid" icon={Truck} to="/kharid" tone="teal" />
          <QuickAction label="Samaan" icon={Boxes} to="/samaan" tone="amber" />
          <QuickAction label="Customer" icon={UserPlus} to="/customers" tone="success" />
          <QuickAction label="Kharcha" icon={Banknote} to="/kharcha" tone="danger" />
          <QuickAction label="Udhaar Jama" icon={Wallet} to="/udhaar" tone="muted" />
        </div>
      </Panel>

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel
          title="Recent Sales"
          action={
            <Link to="/receipts" className="text-xs font-bold text-primary">
              Sab dekhein
            </Link>
          }
          bodyClassName="p-0"
        >
          {todaySales.length === 0 ? (
            <div className="p-5">
              <EmptyState
                icon={Receipt}
                title="Aaj koi bikri nahi"
                body="Pehli bikri karne ke liye POS kholein."
              />
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {todaySales.slice(0, 5).map((s) => (
                <li key={s.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 sm:px-5">
                  <div className="min-w-0">
                    <p className="truncate font-bold">Sale #{s.number}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {s.customerName} · {formatTime(s.date)}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="num-lg">{rs(s.total)}</p>
                    <Pill tone={s.mode === "Cash" ? "success" : s.mode === "Udhaar" ? "amber" : "teal"}>
                      {s.mode}
                    </Pill>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel
          title="Low Stock"
          action={
            <Link to="/samaan" className="text-xs font-bold text-primary">
              Sab dekhein
            </Link>
          }
          bodyClassName="p-0"
        >
          {lowStock.length === 0 ? (
            <div className="p-5">
              <EmptyState icon={Boxes} title="Sab stock theek hai" body="Koi item kam nahi hai." />
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {lowStock.slice(0, 5).map((p) => (
                <li key={p.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 sm:px-5">
                  <div className="min-w-0">
                    <p className="truncate font-bold">
                      {p.emoji} {p.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Stock: {p.stock} · Minimum: {p.lowStockLimit}
                    </p>
                  </div>
                  <Pill tone={p.stock === 0 ? "danger" : "amber"}>
                    {p.stock === 0 ? "Khatam" : "Kam"}
                  </Pill>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <Panel title="Today's Summary">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="Bikri" value={rs(bikri)} tone="primary" />
          <StatCard label="Kharid" value={rs(kharid)} tone="teal" />
          <StatCard label="Kharcha" value={rs(kharcha)} tone="danger" />
          <StatCard label="Munafa" value={rs(munafa)} tone="success" />
        </div>
      </Panel>
    </div>
  );
}
