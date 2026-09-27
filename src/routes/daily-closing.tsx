import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { useStore } from "@/lib/store";
import { formatDate, rs } from "@/lib/format";
import { inRange } from "@/lib/selectors";
import { PageHeader, Panel, Pill } from "@/components/dukaan/primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/daily-closing")({
  head: () => ({
    meta: [
      { title: "Daily Closing — DukaanFlow" },
      { name: "description", content: "Din ke akhir mein cash milaan karein aur hisaab close karein." },
      { property: "og:title", content: "Daily Closing — DukaanFlow" },
      { property: "og:description", content: "Expected cash vs actual cash." },
    ],
  }),
  component: ClosingPage,
});

function ClosingPage() {
  const { sales, expenses, payments, closings, closeDay } = useStore();
  const [opening, setOpening] = useState("15000");
  const [actual, setActual] = useState("");

  const cashSales = sales
    .filter((s) => inRange(s.date, "today"))
    .reduce((sum, s) => sum + s.paid, 0);
  const cashExpenses = expenses
    .filter((e) => inRange(e.date, "today"))
    .reduce((sum, e) => sum + e.amount, 0);
  const customerPayments = payments
    .filter((p) => inRange(p.date, "today"))
    .reduce((sum, p) => sum + p.amount, 0);
  const openingCash = Number(opening || 0);
  const expected = openingCash + cashSales + customerPayments - cashExpenses;
  const difference = Number(actual || 0) - expected;

  return (
    <div className="space-y-5">
      <PageHeader title="Daily Closing" subtitle="Aaj ka cash milaan — 25 Sep 2026" />

      <Panel title="Aaj ka Cash">
        <dl className="space-y-2 text-sm">
          <Row label="Opening Cash" value={rs(openingCash)} />
          <Row label="Cash Sales" value={rs(cashSales)} />
          <Row label="Customer Payments" value={rs(customerPayments)} />
          <Row label="Cash Expenses" value={rs(-cashExpenses)} />
          <Row label="Supplier Payments" value={rs(0)} />
          <Row label="Expected Cash" value={rs(expected)} strong />
        </dl>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div>
            <Label className="text-xs">Opening Cash</Label>
            <Input className="mt-1" type="number" value={opening} onChange={(e) => setOpening(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Actual Cash (ginti)</Label>
            <Input className="mt-1" type="number" value={actual} onChange={(e) => setActual(e.target.value)} />
          </div>
        </div>

        <p className="mt-3 text-sm">
          Difference:{" "}
          <span className={difference === 0 ? "font-bold" : difference < 0 ? "font-bold text-danger" : "font-bold text-success"}>
            {rs(difference)}
          </span>
        </p>

        <Button
          className="mt-4 h-12 w-full rounded-xl text-base font-bold"
          onClick={() => {
            if (!actual) {
              toast.error("Actual cash likhein");
              return;
            }
            closeDay(Number(actual), openingCash);
            toast.success("Din close ho gaya");
            setActual("");
          }}
        >
          Din Close Karein
        </Button>
      </Panel>

      <Panel title="Closing History" bodyClassName="p-0">
        <ul className="divide-y divide-border">
          {closings.map((c) => (
            <li key={c.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 sm:px-5">
              <div className="min-w-0">
                <p className="truncate font-bold">Closed — {formatDate(c.date)}</p>
                <p className="text-xs text-muted-foreground">
                  Expected {rs(c.expectedCash)} · Actual {rs(c.actualCash)} · {c.staff}
                </p>
              </div>
              <Pill tone={c.difference === 0 ? "success" : "danger"}>{rs(c.difference)}</Pill>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={`font-bold tabular-nums ${strong ? "text-lg" : ""}`}>{value}</dd>
    </div>
  );
}
