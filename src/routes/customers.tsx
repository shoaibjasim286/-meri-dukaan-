import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Plus, Printer, Share2, Users, Wallet } from "lucide-react";
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

export const Route = createFileRoute("/customers")({
  head: () => ({
    meta: [
      { title: "Customers — DukaanFlow" },
      { name: "description", content: "Customer list, udhaar balance aur statement." },
      { property: "og:title", content: "Customers — DukaanFlow" },
      { property: "og:description", content: "Har customer ka hisaab aur transactions." },
    ],
  }),
  component: CustomersPage,
});

function CustomersPage() {
  const { customers, sales, payments, addCustomer } = useStore();
  const [query, setQuery] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", address: "" });
  const [openId, setOpenId] = useState<string | null>(null);

  const list = useMemo(
    () =>
      customers.filter(
        (c) =>
          c.name.toLowerCase().includes(query.toLowerCase()) || c.phone.includes(query),
      ),
    [customers, query],
  );
  const selected = customers.find((c) => c.id === openId);
  const timeline = selected
    ? [
        ...sales
          .filter((s) => s.customerId === selected.id)
          .map((s) => ({ id: s.id, date: s.date, label: `Sale #${s.number}`, amount: s.total, credit: true })),
        ...payments
          .filter((p) => p.customerId === selected.id)
          .map((p) => ({ id: p.id, date: p.date, label: `Payment (${p.method})`, amount: p.amount, credit: false })),
      ].sort((a, b) => b.date.localeCompare(a.date))
    : [];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Customers"
        subtitle={`${customers.length} customers · ${rs(customers.reduce((s, c) => s + c.balance, 0))} baqi udhaar`}
        actions={
          <Button className="h-11 rounded-xl font-bold" onClick={() => setAddOpen(true)}>
            <Plus className="size-4" /> Naya Customer
          </Button>
        }
      />
      <SearchBar value={query} onChange={setQuery} placeholder="Search Customer..." />

      {list.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No Customers Abhi Tak"
          body="Apna pehla customer add karein."
          action={
            <Button onClick={() => setAddOpen(true)}>
              <Plus className="size-4" /> Customer
            </Button>
          }
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {list.map((c) => (
            <button key={c.id} type="button" onClick={() => setOpenId(c.id)} className="surface-card p-4 text-left">
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                <div className="min-w-0">
                  <p className="truncate font-bold">{c.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{c.phone}</p>
                </div>
                <Pill tone={c.balance > 0 ? "amber" : "success"}>
                  {c.balance > 0 ? `Baqi ${rs(c.balance)}` : "Clear"}
                </Pill>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                Last activity: {formatDate(c.lastActivity)}
              </p>
            </button>
          ))}
        </div>
      )}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Naya Customer</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Naam</Label>
              <Input className="mt-1" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">Phone</Label>
              <Input className="mt-1" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="0300-1234567" />
            </div>
            <div>
              <Label className="text-xs">Address</Label>
              <Input className="mt-1" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button
              onClick={() => {
                if (!form.name.trim()) return;
                addCustomer(form);
                setForm({ name: "", phone: "", address: "" });
                setAddOpen(false);
                toast.success("Customer add ho gaya");
              }}
            >
              Save Karein
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
                  <p className="text-xs opacity-80">Current Udhaar</p>
                  <p className="num-lg">{rs(selected.balance)}</p>
                </div>
              </div>
              <Panel title="Transactions" bodyClassName="p-0">
                {timeline.length === 0 ? (
                  <p className="p-4 text-sm text-muted-foreground">Koi transaction nahi.</p>
                ) : (
                  <ul className="max-h-64 divide-y divide-border overflow-y-auto">
                    {timeline.map((t) => (
                      <li key={t.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                        <span className="min-w-0">
                          <span className="block truncate font-bold">{t.label}</span>
                          <span className="text-xs text-muted-foreground">{formatDate(t.date)}</span>
                        </span>
                        <span className={t.credit ? "font-bold text-danger" : "font-bold text-success"}>
                          {t.credit ? "+" : "-"}
                          {rs(t.amount)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </Panel>
              <div className="flex flex-wrap gap-2">
                <Button className="rounded-xl" onClick={() => toast.info("Udhaar page par jama karein")}>
                  <Wallet className="size-4" /> Udhaar Jama
                </Button>
                <Button variant="outline" className="rounded-xl" onClick={() => toast.success("Statement print par bheja gaya")}>
                  <Printer className="size-4" /> Print Statement
                </Button>
                <Button variant="outline" className="rounded-xl" onClick={() => toast.success("Statement share ho gaya")}>
                  <Share2 className="size-4" /> Share
                </Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
