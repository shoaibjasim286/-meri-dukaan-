import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Archive, DollarSign, Plus } from "lucide-react";
import { toast } from "sonner";
import { useStore } from "@/lib/store";
import { formatDate, rs } from "@/lib/format";
import { EmptyState, PageHeader, Panel, Pill, SearchBar } from "@/components/dukaan/primitives";
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

export const Route = createFileRoute("/suppliers")({
  head: () => ({
    meta: [
      { title: "Suppliers — DukaanFlow" },
      { name: "description", content: "Supplier list, balance aur purchase history." },
      { property: "og:title", content: "Suppliers — DukaanFlow" },
      { property: "og:description", content: "Har supplier ka hisaab aur maal ki kharid." },
    ],
  }),
  component: SuppliersPage,
});

function SuppliersPage() {
  const {
    suppliers,
    purchases,
    returns,
    supplierPayments,
    addSupplier,
    recordSupplierPayment,
  } = useStore();
  const [query, setQuery] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [paymentSupplierId, setPaymentSupplierId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", phone: "", company: "" });
  const [paymentForm, setPaymentForm] = useState({
    amount: "",
    method: "Cash" as "Cash" | "Bank" | "Cheque" | "Online",
    note: "",
    purchaseId: "",
  });

  const list = useMemo(
    () => suppliers.filter((s) => s.name.toLowerCase().includes(query.toLowerCase())),
    [suppliers, query],
  );
  const selected = suppliers.find((s) => s.id === openId);
  const supplierPurchases = selected ? purchases.filter((p) => p.supplierId === selected.id) : [];
  const supplierReturns = selected
    ? returns.filter((r) => r.kind === "supplier" && r.partyName === selected.name)
    : [];
  const paymentSupplier = suppliers.find((supplier) => supplier.id === paymentSupplierId);
  const paymentHistory = paymentSupplier
    ? supplierPayments.filter((payment) => payment.supplierId === paymentSupplier.id)
    : [];
  const paymentPurchases = paymentSupplier
    ? purchases.filter(
        (purchase) =>
          purchase.supplierId === paymentSupplier.id &&
          purchase.paid < purchase.total,
      )
    : [];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Suppliers"
        subtitle={`${suppliers.length} suppliers · ${rs(suppliers.reduce((s, x) => s + x.balance, 0))} dena hai`}
        actions={
          <Button className="h-11 rounded-xl font-bold" onClick={() => setAddOpen(true)}>
            <Plus className="size-4" /> Naya Supplier
          </Button>
        }
      />
      <SearchBar value={query} onChange={setQuery} placeholder="Search Supplier..." />

      {list.length === 0 ? (
        <EmptyState icon={Archive} title="Koi supplier nahi" body="Apna pehla supplier add karein." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {list.map((s) => (
            <div key={s.id} className="surface-card p-4">
              <button
                type="button"
                onClick={() => setOpenId(s.id)}
                className="w-full text-left"
              >
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-bold">{s.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{s.company}</p>
                  </div>
                  <Pill tone={s.balance > 0 ? "amber" : "success"}>
                    {s.balance > 0 ? `Baqi ${rs(s.balance)}` : "Clear"}
                  </Pill>
                </div>
                <p className="mt-3 text-xs text-muted-foreground">
                  {s.phone} · Last kharid {formatDate(s.lastPurchase)}
                </p>
              </button>
              <Button
                variant="outline"
                className="mt-3 h-10 w-full rounded-xl"
                disabled={s.balance <= 0}
                onClick={() => {
                  setPaymentSupplierId(s.id);
                  setPaymentForm({
                    amount: "",
                    method: "Cash",
                    note: "",
                    purchaseId: "",
                  });
                }}
              >
                <DollarSign className="size-4" /> Pay Supplier
              </Button>
            </div>
          ))}
        </div>
      )}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Naya Supplier</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Naam</Label>
              <Input className="mt-1" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">Phone</Label>
              <Input className="mt-1" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">Company</Label>
              <Input className="mt-1" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button
              onClick={() => {
                if (!form.name.trim()) return;
                addSupplier(form);
                setForm({ name: "", phone: "", company: "" });
                setAddOpen(false);
                toast.success("Supplier add ho gaya");
              }}
            >
              Save Karein
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!paymentSupplier}
        onOpenChange={(open) => {
          if (!open) setPaymentSupplierId(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supplier ko Payment</DialogTitle>
          </DialogHeader>
          {paymentSupplier ? (
            <div className="space-y-4">
              <div className="rounded-xl bg-muted px-3 py-2">
                <p className="text-xs text-muted-foreground">Supplier</p>
                <p className="font-bold">{paymentSupplier.name}</p>
                <p className="mt-1 text-sm">
                  Current balance: <span className="num-lg">{rs(paymentSupplier.balance)}</span>
                </p>
              </div>

              <div>
                <Label className="text-xs">Amount</Label>
                <Input
                  className="mt-1"
                  type="number"
                  min={0.01}
                  step="0.01"
                  value={paymentForm.amount}
                  onChange={(event) =>
                    setPaymentForm({ ...paymentForm, amount: event.target.value })
                  }
                  placeholder="0"
                />
              </div>

              <div>
                <Label className="text-xs">Method</Label>
                <Select
                  value={paymentForm.method}
                  onValueChange={(value) =>
                    setPaymentForm({
                      ...paymentForm,
                      method: value as "Cash" | "Bank" | "Cheque" | "Online",
                    })
                  }
                >
                  <SelectTrigger className="mt-1 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Cash">Cash</SelectItem>
                    <SelectItem value="Bank">Bank</SelectItem>
                    <SelectItem value="Cheque">Cheque</SelectItem>
                    <SelectItem value="Online">Online</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {paymentPurchases.length > 0 ? (
                <div>
                  <Label className="text-xs">Purchase (optional)</Label>
                  <Select
                    value={paymentForm.purchaseId || "none"}
                    onValueChange={(value) =>
                      setPaymentForm({
                        ...paymentForm,
                        purchaseId: value === "none" ? "" : value,
                      })
                    }
                  >
                    <SelectTrigger className="mt-1 w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">General supplier payment</SelectItem>
                      {paymentPurchases.map((purchase) => (
                        <SelectItem key={purchase.id} value={purchase.id}>
                          {purchase.invoiceNo} · Baqi {rs(purchase.total - purchase.paid)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : null}

              <div>
                <Label className="text-xs">Note</Label>
                <Input
                  className="mt-1"
                  value={paymentForm.note}
                  onChange={(event) =>
                    setPaymentForm({ ...paymentForm, note: event.target.value })
                  }
                  placeholder="Payment note"
                />
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentSupplierId(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!paymentSupplier) return;
                const amount = Number(paymentForm.amount);
                if (!Number.isFinite(amount) || amount <= 0) {
                  toast.error("Payment amount valid nahi hai");
                  return;
                }

                const confirmed = window.confirm(
                  "Rs " + amount + " payment " + paymentSupplier.name + " ko deni hai?",
                );
                if (!confirmed) return;

                const result = recordSupplierPayment(
                  paymentSupplier.id,
                  amount,
                  paymentForm.method,
                  paymentForm.note,
                  paymentForm.purchaseId || undefined,
                );

                if (!result.ok) {
                  toast.error(result.error);
                  return;
                }

                toast.success("Supplier payment save ho gayi");
                setPaymentSupplierId(null);
                setPaymentForm({
                  amount: "",
                  method: "Cash",
                  note: "",
                  purchaseId: "",
                });
              }}
            >
              Payment Save Karein
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setOpenId(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selected?.name}</DialogTitle>
          </DialogHeader>
          {selected ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-muted px-3 py-2">
                  <p className="text-xs text-muted-foreground">Phone</p>
                  <p className="font-bold">{selected.phone}</p>
                </div>
                <div className="rounded-xl bg-amber-soft px-3 py-2">
                  <p className="text-xs opacity-80">Balance</p>
                  <p className="num-lg">{rs(selected.balance)}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  className="flex-1 rounded-xl"
                  disabled={selected.balance <= 0}
                  onClick={() => {
                    setPaymentSupplierId(selected.id);
                    setPaymentForm({
                      amount: "",
                      method: "Cash",
                      note: "",
                      purchaseId: "",
                    });
                  }}
                >
                  <DollarSign className="size-4" /> Pay Supplier
                </Button>
              </div>

              <Panel title="Payment History" bodyClassName="p-0">
                {paymentHistory.length === 0 ? (
                  <p className="p-4 text-sm text-muted-foreground">Abhi koi payment nahi.</p>
                ) : (
                  <ul className="divide-y divide-border">
                    {paymentHistory.map((payment) => (
                      <li key={payment.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                        <span className="min-w-0 truncate">
                          {formatDate(payment.date)} · {payment.method}
                          {payment.note ? ` · ${payment.note}` : ""}
                        </span>
                        <span className="font-bold tabular-nums text-danger">-{rs(payment.amount)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </Panel>

              <Panel title="Purchases" bodyClassName="p-0">
                {supplierPurchases.length === 0 ? (
                  <p className="p-4 text-sm text-muted-foreground">Koi kharid nahi.</p>
                ) : (
                  <ul className="divide-y divide-border">
                    {supplierPurchases.map((p) => (
                      <li key={p.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                        <span className="min-w-0 truncate">
                          {p.invoiceNo} · {formatDate(p.date)}
                        </span>
                        <span className="font-bold tabular-nums">{rs(p.total)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </Panel>
              <Panel title="Returns" bodyClassName="p-0">
                {supplierReturns.length === 0 ? (
                  <p className="p-4 text-sm text-muted-foreground">Koi wapsi nahi.</p>
                ) : (
                  <ul className="divide-y divide-border">
                    {supplierReturns.map((r) => (
                      <li key={r.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                        <span className="min-w-0 truncate">
                          {r.productName} × {r.qty}
                        </span>
                        <span className="font-bold tabular-nums">{rs(r.amount)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </Panel>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
