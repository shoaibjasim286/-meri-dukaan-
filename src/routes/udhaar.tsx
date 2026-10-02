import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CalendarClock, HandCoins, Wallet } from "lucide-react";
import { toast } from "sonner";
import { getCustomerPaymentValidationError, useStore } from "@/lib/store";
import { formatDate, rs } from "@/lib/format";
import { inRange } from "@/lib/selectors";
import { EmptyState, KpiCard, PageHeader, Panel, Pill } from "@/components/dukaan/primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/udhaar")({
  validateSearch: (search) => ({
    customerId:
      typeof search.customerId === "string" ? search.customerId : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Udhaar — DukaanFlow" },
      { name: "description", content: "Baqi udhaar, aaj ki jama raqam aur overdue customers." },
      { property: "og:title", content: "Udhaar — DukaanFlow" },
      { property: "og:description", content: "Udhaar jama karein aur balance track karein." },
    ],
  }),
  component: UdhaarPage,
});

function UdhaarPage() {
  const { customers, payments, sales, addPayment } = useStore();
  const navigate = useNavigate();
  const search = Route.useSearch();
  const [open, setOpen] = useState(false);
  const [customerId, setCustomerId] = useState(customers[0]?.id ?? "");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("Cash");
  const [note, setNote] = useState("");

  useEffect(() => {
    const requestedCustomerId = search.customerId;
    if (!requestedCustomerId) return;

    const customerExists = customers.some(
      (customer) => customer.id === requestedCustomerId,
    );

    if (customerExists) {
      setCustomerId(requestedCustomerId);
      setAmount("");
      setOpen(true);
    } else {
      toast.error("Customer nahi mila");
    }

    navigate({ to: "/udhaar", search: { customerId: undefined }, replace: true });
  }, [customers, navigate, search.customerId]);

  const total = customers.reduce((s, c) => s + c.balance, 0);
  const todayJama = payments.filter((p) => inRange(p.date, "today")).reduce((s, p) => s + p.amount, 0);
  const overdue = customers
    .filter((c) => c.balance > 0 && new Date(c.lastActivity) < new Date(Date.now() - 7 * 864e5))
    .reduce((s, c) => s + c.balance, 0);

  const selectedCustomer = customers.find((c) => c.id === customerId);
  const withBalance = customers.filter((c) => c.balance > 0).sort((a, b) => b.balance - a.balance);
  const timeline = [
    ...sales.filter((s) => s.customerId && s.total - s.paid > 0).map((s) => ({
      id: s.id,
      date: s.date,
      label: `${s.customerName} — Udhaar`,
      amount: s.total - s.paid,
      credit: true,
    })),
    ...payments.map((p) => ({
      id: p.id,
      date: p.date,
      label: `${p.customerName} — Payment`,
      amount: p.amount,
      credit: false,
    })),
  ]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 12);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Udhaar"
        subtitle="Customers ka baqi hisaab"
        actions={
          <Button className="h-11 rounded-xl font-bold" onClick={() => setOpen(true)}>
            <HandCoins className="size-4" /> Udhaar Jama Karein
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <KpiCard label="Total Udhaar" value={rs(total)} icon={Wallet} tone="amber" />
        <KpiCard label="Aaj Jama" value={rs(todayJama)} icon={HandCoins} tone="success" />
        <KpiCard label="Overdue (7 din+)" value={rs(overdue)} icon={CalendarClock} tone="danger" />
      </div>

      <Panel title="Customers ka Balance" bodyClassName="p-0">
        {withBalance.length === 0 ? (
          <div className="p-5">
            <EmptyState icon={Wallet} title="Koi udhaar nahi" body="Sab customers ka hisaab clear hai." />
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {withBalance.map((c) => (
              <li key={c.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 sm:px-5">
                <div className="min-w-0">
                  <p className="truncate font-bold">{c.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {c.phone} · Last: {formatDate(c.lastActivity)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="num-lg text-base">{rs(c.balance)}</span>
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-xl"
                    onClick={() => {
                      setCustomerId(c.id);
                      setAmount("");
                      setOpen(true);
                    }}
                  >
                    Jama
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel title="Recent Udhaar Timeline" bodyClassName="p-0">
        <ul className="divide-y divide-border">
          {timeline.map((t) => (
            <li key={t.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 sm:px-5">
              <div className="min-w-0">
                <p className="truncate font-bold">{t.label}</p>
                <p className="text-xs text-muted-foreground">{formatDate(t.date)}</p>
              </div>
              <Pill tone={t.credit ? "danger" : "success"}>
                {t.credit ? "+" : "-"}
                {rs(t.amount)}
              </Pill>
            </li>
          ))}
        </ul>
      </Panel>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Udhaar Jama Karein</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="min-w-0">
              <Label className="text-xs">Customer</Label>
              <Select value={customerId} onValueChange={setCustomerId}>
                <SelectTrigger className="mt-1 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name} — {rs(c.balance)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Amount</Label>
              <Input
                className="mt-1"
                type="number"
                min={0}
                max={selectedCustomer?.balance ?? 0}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div className="min-w-0">
              <Label className="text-xs">Payment Method</Label>
              <Select value={method} onValueChange={setMethod}>
                <SelectTrigger className="mt-1 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["Cash", "Easypaisa", "JazzCash", "Bank"].map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Note</Label>
              <Input className="mt-1" value={note} onChange={(e) => setNote(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                const amt = Number(amount || 0);
                if (amt <= 0) return;

                if (!selectedCustomer) {
                  toast.error("Customer nahi mila");
                  return;
                }

                const validationError = getCustomerPaymentValidationError(
                  amt,
                  selectedCustomer.balance,
                );
                if (validationError) {
                  toast.error(validationError);
                  return;
                }

                const result = addPayment({ customerId, amount: amt, method, note });
                if (!result.ok) {
                  toast.error(result.error);
                  return;
                }
                setOpen(false);
                setAmount("");
                setNote("");
                toast.success("Udhaar jama ho gaya");
              }}
            >
              Jama Karein
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
