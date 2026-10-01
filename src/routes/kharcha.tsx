import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Banknote, Plus } from "lucide-react";
import { toast } from "sonner";
import { useStore } from "@/lib/store";
import { EXPENSE_CATEGORIES } from "@/lib/demo-data";
import { formatDate, rs, todayInputValue } from "@/lib/format";
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

export const Route = createFileRoute("/kharcha")({
  head: () => ({
    meta: [
      { title: "Kharcha (Expenses) — DukaanFlow" },
      { name: "description", content: "Dukaan ke rozana kharche darj karein aur categories dekhein." },
      { property: "og:title", content: "Kharcha — DukaanFlow" },
      { property: "og:description", content: "Kiraya, bijli, transport aur tankhwah ka record." },
    ],
  }),
  component: ExpensePage,
});

function ExpensePage() {
  const { expenses, addExpense } = useStore();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    category: "Transport",
    amount: "",
    date: todayInputValue(),
    note: "",
  });

  const today = expenses.filter((e) => inRange(e.date, "today")).reduce((s, e) => s + e.amount, 0);
  const month = expenses.filter((e) => inRange(e.date, "30")).reduce((s, e) => s + e.amount, 0);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Kharcha"
        subtitle="Rozana kharch ka record"
        actions={
          <Button className="h-11 rounded-xl font-bold" onClick={() => setOpen(true)}>
            <Plus className="size-4" /> Kharcha Add Karein
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <KpiCard label="Aaj ka Kharcha" value={rs(today)} icon={Banknote} tone="danger" />
        <KpiCard label="30 Din" value={rs(month)} icon={Banknote} tone="amber" />
        <KpiCard label="Total Entries" value={String(expenses.length)} icon={Banknote} tone="muted" />
      </div>

      <Panel title="Categories">
        <div className="flex flex-wrap gap-2">
          {EXPENSE_CATEGORIES.map((c) => {
            const amt = expenses.filter((e) => e.category === c).reduce((s, e) => s + e.amount, 0);
            return (
              <span key={c} className="rounded-xl border border-border px-3 py-2 text-sm">
                <span className="font-bold">{c}</span>{" "}
                <span className="text-muted-foreground tabular-nums">{rs(amt)}</span>
              </span>
            );
          })}
        </div>
      </Panel>

      <Panel title="Kharcha History" bodyClassName="p-0">
        {expenses.length === 0 ? (
          <div className="p-5">
            <EmptyState icon={Banknote} title="Koi kharcha nahi" body="Apna pehla kharcha add karein." />
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {expenses.map((e) => (
              <li key={e.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 sm:px-5">
                <div className="min-w-0">
                  <p className="truncate font-bold">{e.category}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {formatDate(e.date)} {e.note ? `· ${e.note}` : ""}
                  </p>
                </div>
                <Pill tone="danger">{rs(e.amount)}</Pill>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Kharcha Add Karein</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="min-w-0">
              <Label className="text-xs">Category</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger className="mt-1 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EXPENSE_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Amount</Label>
              <Input className="mt-1" type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">Date</Label>
              <Input className="mt-1" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">Note</Label>
              <Input className="mt-1" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button
              onClick={() => {
                const amt = Number(form.amount || 0);
                if (amt <= 0) return;
                addExpense({
                  category: form.category,
                  amount: amt,
                  date: new Date(`${form.date}T12:00:00`).toISOString(),
                  note: form.note,
                });
                setOpen(false);
                setForm({ ...form, amount: "", note: "" });
                toast.success("Kharcha add ho gaya");
              }}
            >
              Save Karein
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
