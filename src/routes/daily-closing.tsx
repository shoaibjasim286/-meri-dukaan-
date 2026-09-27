import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { CalendarDays, Printer } from "lucide-react";
import { toast } from "sonner";
import { useStore } from "@/lib/store";
import { formatDate, rs } from "@/lib/format";
import { calculateDailyClosing, dateKey } from "@/lib/selectors";
import { hasPermission } from "@/lib/permissions";
import { printElement } from "@/lib/print";
import { PageHeader, Panel, Pill } from "@/components/dukaan/primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/daily-closing")({
  head: () => ({
    meta: [
      { title: "Daily Closing — DukaanFlow" },
      {
        name: "description",
        content: "Din ke akhir mein cash milaan karein aur hisaab close karein.",
      },
      { property: "og:title", content: "Daily Closing — DukaanFlow" },
      {
        property: "og:description",
        content: "Expected cash vs actual cash.",
      },
    ],
  }),
  component: ClosingPage,
});

function localDateKey(): string {
  return dateKey(new Date());
}

function printableDate(date: string): string {
  return formatDate(date + "T12:00:00");
}

function ClosingPage() {
  const {
    sales,
    expenses,
    payments,
    supplierPayments,
    closings,
    closeDay,
    currentStaff,
  } = useStore();
  const canCloseDay = hasPermission(currentStaff, "dayclose.create");

  const today = localDateKey();
  const [actual, setActual] = useState("");
  const [historyFrom, setHistoryFrom] = useState("");
  const [historyTo, setHistoryTo] = useState("");

  const summary = useMemo(
    () =>
      calculateDailyClosing({
        date: today,
        sales,
        payments,
        expenses,
        supplierPayments,
        closings,
      }),
    [today, sales, payments, expenses, supplierPayments, closings],
  );

  const todayClosing = closings.find(
    (closing) => dateKey(closing.date) === today,
  );

  const history = closings.filter((closing) => {
    const key = dateKey(closing.date);
    return (
      (!historyFrom || key >= historyFrom) &&
      (!historyTo || key <= historyTo)
    );
  });

  const difference = Number(actual || 0) - summary.expectedCash;
  const actualForPrint = todayClosing?.actualCash ?? Number(actual || 0);

  const handleClose = () => {
    if (todayClosing) {
      toast.error("Aaj ka closing pehle hi ho chuka hai");
      return;
    }

    if (!actual.trim() || !Number.isFinite(Number(actual)) || Number(actual) < 0) {
      toast.error("Actual cash sahi likhein");
      return;
    }

    const confirmed = window.confirm(
      "Aaj ka hisaab close karna hai? Closing dobara edit nahi hogi.",
    );
    if (!confirmed) return;

    const result = closeDay(today, Number(actual));
    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    setActual("");
    toast.success("Din close ho gaya");
  };

  const printSummary = () => {
    printElement("daily-closing-print-area");
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Daily Closing"
        subtitle={"Aaj ka hisaab — " + printableDate(today)}
        actions={
          <Button
            variant="outline"
            className="no-print rounded-xl"
            onClick={printSummary}
          >
            <Printer className="size-4" /> Print Closing
          </Button>
        }
      />

      <div
        id="daily-closing-print-area"
        data-print-format="receipt"
        className="fixed -left-[99999px] top-0 w-[80mm] bg-white p-3 text-black"
      >
        <h1 className="text-center text-lg font-bold">Meri Dukaan</h1>
        <p className="text-center text-sm font-bold">Daily Closing</p>
        <p className="mb-3 text-center text-xs">{printableDate(today)}</p>
        <PrintRow label="Opening Cash" value={rs(summary.openingCash)} />
        <PrintRow label="Cash Sales" value={rs(summary.cashSales)} />
        <PrintRow label="Mixed Cash" value={rs(summary.mixedCashSales)} />
        <PrintRow
          label="Customer Cash"
          value={rs(summary.cashCustomerPayments)}
        />
        <PrintRow label="Cash Expenses" value={rs(-summary.cashExpenses)} />
        <PrintRow
          label="Supplier Cash"
          value={rs(-summary.supplierCashPayments)}
        />
        <PrintRow label="Cash Refunds" value={rs(-summary.cashRefunds)} />
        <hr className="my-2 border-black" />
        <PrintRow label="Expected Cash" value={rs(summary.expectedCash)} strong />
        <PrintRow label="Actual Cash" value={rs(actualForPrint)} strong />
        <PrintRow
          label="Difference"
          value={rs(actualForPrint - summary.expectedCash)}
        />
        <hr className="my-2 border-black" />
        <PrintRow label="Udhaar Sales" value={rs(summary.udhaarSales)} />
        <PrintRow label="Mixed Sales" value={rs(summary.mixedSales)} />
        <PrintRow label="Total Sales" value={rs(summary.totalSales)} strong />
      </div>

      <Panel title="Aaj ka Cash">
        <dl className="space-y-2 text-sm">
          <Row label="Opening Cash" value={rs(summary.openingCash)} />
          <Row label="Cash Sales" value={rs(summary.cashSales)} />
          <Row label="Mixed Cash Portion" value={rs(summary.mixedCashSales)} />
          <Row
            label="Customer Payments"
            value={rs(summary.cashCustomerPayments)}
          />
          <Row label="Cash Expenses" value={rs(-summary.cashExpenses)} />
          <Row
            label="Supplier Cash Out"
            value={rs(-summary.supplierCashPayments)}
          />
          <Row label="Cash Refunds" value={rs(-summary.cashRefunds)} />
          <Row label="Expected Cash" value={rs(summary.expectedCash)} strong />
        </dl>

        <div className="mt-4 rounded-xl bg-muted p-3">
          <p className="text-xs text-muted-foreground">Sales Breakdown</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-3">
            <Row label="Cash Sales" value={rs(summary.cashSales)} />
            <Row label="Udhaar Sales" value={rs(summary.udhaarSales)} />
            <Row label="Mixed Sales" value={rs(summary.mixedSales)} />
          </div>
          <div className="mt-2">
            <Row label="Total Sales" value={rs(summary.totalSales)} strong />
          </div>
        </div>

        {todayClosing ? (
          <div className="mt-4 rounded-xl bg-success/10 p-3">
            <p className="font-bold">Aaj ka closing save ho chuka hai.</p>
            <p className="mt-1 text-sm">
              Actual Cash: {rs(todayClosing.actualCash)} · Difference:{" "}
              {rs(todayClosing.difference)}
            </p>
          </div>
        ) : null}

        {!todayClosing ? (
          <div className="mt-4">
            <Label className="text-xs">Actual Cash (ginti)</Label>
            <Input
              className="mt-1"
              type="number"
              min={0}
              step="0.01"
              value={actual}
              onChange={(event) => setActual(event.target.value)}
              placeholder="0"
            />
          </div>
        ) : null}

        <div className="mt-4 flex gap-2">
          <Button
            variant="outline"
            className="h-12 flex-1 rounded-xl"
            onClick={printSummary}
          >
            <Printer className="size-4" /> Print
          </Button>
          <Button
            className="h-12 flex-[2] rounded-xl text-base font-bold"
            onClick={handleClose}
            disabled={!!todayClosing || !canCloseDay} title={!canCloseDay ? "Aapko ye permission nahi hai" : undefined}
          >
            {todayClosing ? "Already Closed" : "Din Close Karein"}
          </Button>
        </div>
      </Panel>

      <Panel title="Closing History">
        <div className="no-print mb-4 grid gap-3 sm:grid-cols-2">
          <div>
            <Label className="text-xs">From</Label>
            <div className="relative mt-1">
              <CalendarDays className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                type="date"
                value={historyFrom}
                onChange={(event) => setHistoryFrom(event.target.value)}
              />
            </div>
          </div>
          <div>
            <Label className="text-xs">To</Label>
            <div className="relative mt-1">
              <CalendarDays className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                type="date"
                value={historyTo}
                onChange={(event) => setHistoryTo(event.target.value)}
              />
            </div>
          </div>
        </div>

        {history.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Is date range mein koi closing nahi hai.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {history.map((closing) => (
              <li
                key={closing.id}
                className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate font-bold">
                    Closing — {printableDate(closing.date)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Expected {rs(closing.expectedCash)} · Actual{" "}
                    {rs(closing.actualCash)} · Difference{" "}
                    {rs(closing.difference)}
                  </p>
                </div>

                <Button
                  variant="outline"
                  size="icon"
                  className="no-print size-9 rounded-xl"
                  onClick={() =>
                    printElement("closing-print-" + closing.id)
                  }
                >
                  <Printer className="size-4" />
                </Button>

                <div
                  id={"closing-print-" + closing.id}
                  data-print-format="receipt"
                  className="fixed -left-[99999px] top-0 w-[80mm] bg-white p-3 text-black"
                >
                  <h1 className="text-center text-lg font-bold">Meri Dukaan</h1>
                  <p className="text-center text-sm font-bold">Daily Closing</p>
                  <p className="mb-3 text-center text-xs">
                    {printableDate(closing.date)}
                  </p>
                  <PrintRow label="Opening Cash" value={rs(closing.openingCash)} />
                  <PrintRow label="Cash Sales" value={rs(closing.cashSales)} />
                  <PrintRow
                    label="Mixed Cash"
                    value={rs(closing.mixedCashSales ?? 0)}
                  />
                  <PrintRow
                    label="Customer Cash"
                    value={rs(
                      closing.cashCustomerPayments ??
                        closing.customerPayments,
                    )}
                  />
                  <PrintRow
                    label="Cash Expenses"
                    value={rs(-closing.cashExpenses)}
                  />
                  <PrintRow
                    label="Supplier Cash"
                    value={rs(-(closing.supplierCashPayments ?? 0))}
                  />
                  <PrintRow
                    label="Cash Refunds"
                    value={rs(-(closing.cashRefunds ?? 0))}
                  />
                  <hr className="my-2 border-black" />
                  <PrintRow
                    label="Expected Cash"
                    value={rs(closing.expectedCash)}
                    strong
                  />
                  <PrintRow
                    label="Actual Cash"
                    value={rs(closing.actualCash)}
                    strong
                  />
                  <PrintRow
                    label="Difference"
                    value={rs(closing.difference)}
                  />
                  <hr className="my-2 border-black" />
                  <PrintRow
                    label="Udhaar Sales"
                    value={rs(closing.udhaarSales ?? 0)}
                  />
                  <PrintRow
                    label="Mixed Sales"
                    value={rs(closing.mixedSales ?? 0)}
                  />
                  <PrintRow
                    label="Total Sales"
                    value={rs(closing.totalSales ?? 0)}
                    strong
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}

function Row({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={"font-bold tabular-nums" + (strong ? " text-lg" : "")}>
        {value}
      </dd>
    </div>
  );
}

function PrintRow({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-center justify-between text-[11px]">
      <span>{label}</span>
      <strong className={strong ? "text-sm" : ""}>{value}</strong>
    </div>
  );
}
