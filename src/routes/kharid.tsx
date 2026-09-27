import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Trash2, Truck } from "lucide-react";
import { toast } from "sonner";
import { useStore } from "@/lib/store";
import { formatDate, money, rs } from "@/lib/format";
import { EmptyState, PageHeader, Panel, Pill } from "@/components/dukaan/primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { PurchaseItem } from "@/lib/types";

export const Route = createFileRoute("/kharid")({
  head: () => ({
    meta: [
      { title: "Kharid (Purchase) — DukaanFlow" },
      { name: "description", content: "Supplier se maal ki kharid darj karein aur history dekhein." },
      { property: "og:title", content: "Kharid (Purchase) — DukaanFlow" },
      { property: "og:description", content: "Invoice, items aur payment ke sath kharid save karein." },
    ],
  }),
  component: PurchasePage,
});

function PurchasePage() {
  const { suppliers, products, purchases, addPurchase } = useStore();
  const [supplierId, setSupplierId] = useState(suppliers[0]?.id ?? "");
  const [invoiceNo, setInvoiceNo] = useState("");
  const [date, setDate] = useState("2026-09-25");
  const [items, setItems] = useState<PurchaseItem[]>([]);
  const [discount, setDiscount] = useState(0);
  const [paid, setPaid] = useState("");
  const [pickProduct, setPickProduct] = useState(products[0]?.id ?? "");
  const [qty, setQty] = useState("1");
  const [price, setPrice] = useState("");

  const subtotal = money(items.reduce((s, i) => s + i.qty * i.price, 0));
  const total = money(Math.max(0, subtotal - discount));
  const baqi = money(total - Number(paid || 0));

  const addItem = () => {
    const prod = products.find((p) => p.id === pickProduct);
    if (!prod) return;
    const q = Number(qty || 0);
    const pr = Number(price || prod.purchasePrice);
    if (q <= 0) return;
    setItems((it) => [...it, { productId: prod.id, name: prod.name, qty: q, price: pr }]);
    setQty("1");
    setPrice("");
  };

  const save = () => {
    if (items.length === 0) {
      toast.error("Pehle koi item add karein");
      return;
    }
    const supplier = suppliers.find((s) => s.id === supplierId);
    addPurchase({
      invoiceNo: invoiceNo || `INV-${Math.floor(Math.random() * 9000 + 1000)}`,
      supplierId,
      supplierName: supplier?.name ?? "",
      items,
      discount,
      total,
      paid: Number(paid || 0),
    });
    toast.success("Kharid save ho gayi");
    setItems([]);
    setDiscount(0);
    setPaid("");
    setInvoiceNo("");
  };

  return (
    <div className="space-y-5">
      <PageHeader title="Kharid" subtitle="Supplier se maal aane par yahan darj karein" />

      <Tabs defaultValue="new">
        <TabsList className="rounded-xl">
          <TabsTrigger value="new">Nayi Kharid</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="new" className="mt-4 space-y-5">
          <Panel title="Invoice">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="min-w-0">
                <Label className="text-xs">Supplier</Label>
                <Select value={supplierId} onValueChange={setSupplierId}>
                  <SelectTrigger className="mt-1 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Invoice Number</Label>
                <Input className="mt-1" value={invoiceNo} onChange={(e) => setInvoiceNo(e.target.value)} placeholder="HT-8843" />
              </div>
              <div>
                <Label className="text-xs">Date</Label>
                <Input className="mt-1" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
            </div>
          </Panel>

          <Panel title="Products">
            <div className="grid gap-3 sm:grid-cols-[minmax(0,2fr)_90px_120px_auto] sm:items-end">
              <div className="min-w-0">
                <Label className="text-xs">Product</Label>
                <Select value={pickProduct} onValueChange={setPickProduct}>
                  <SelectTrigger className="mt-1 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Qty</Label>
                <Input className="mt-1" type="number" value={qty} onChange={(e) => setQty(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Price</Label>
                <Input
                  className="mt-1"
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder={String(products.find((p) => p.id === pickProduct)?.purchasePrice ?? 0)}
                />
              </div>
              <Button className="h-10 rounded-xl" onClick={addItem}>
                <Plus className="size-4" /> Add
              </Button>
            </div>

            {items.length === 0 ? (
              <p className="mt-4 text-sm text-muted-foreground">Abhi koi item add nahi hua.</p>
            ) : (
              <ul className="mt-4 divide-y divide-border rounded-xl border border-border">
                {items.map((i, idx) => (
                  <li key={idx} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-3 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold">{i.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {i.qty} × {rs(i.price)}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="font-bold tabular-nums">{rs(i.qty * i.price)}</span>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-8 text-danger"
                        onClick={() => setItems((it) => it.filter((_, n) => n !== idx))}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="Payment">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label className="text-xs">Discount</Label>
                <Input className="mt-1" type="number" value={discount || ""} onChange={(e) => setDiscount(Number(e.target.value || 0))} />
              </div>
              <div>
                <Label className="text-xs">Paid</Label>
                <Input className="mt-1" type="number" value={paid} onChange={(e) => setPaid(e.target.value)} />
              </div>
            </div>
            <dl className="mt-4 space-y-1 text-sm">
              <Row label="Subtotal" value={rs(subtotal)} />
              <Row label="Discount" value={rs(discount)} />
              <Row label="Total" value={rs(total)} strong />
              <Row label="Credit / Baqi" value={rs(baqi)} />
            </dl>
            <Button className="mt-4 h-12 w-full rounded-xl text-base font-bold" onClick={save}>
              Kharid Save Karein
            </Button>
          </Panel>
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          {purchases.length === 0 ? (
            <EmptyState icon={Truck} title="Koi kharid nahi" body="Apni pehli kharid darj karein." />
          ) : (
            <Panel bodyClassName="p-0">
              <ul className="divide-y divide-border">
                {purchases.map((p) => (
                  <li key={p.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 sm:px-5">
                    <div className="min-w-0">
                      <p className="truncate font-bold">
                        {p.supplierName} · {p.invoiceNo}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(p.date)} · {p.items.length} items
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="num-lg">{rs(p.total)}</p>
                      <Pill tone={p.total - p.paid > 0 ? "amber" : "success"}>
                        {p.total - p.paid > 0 ? `Baqi ${rs(p.total - p.paid)}` : "Paid"}
                      </Pill>
                    </div>
                  </li>
                ))}
              </ul>
            </Panel>
          )}
        </TabsContent>
      </Tabs>
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
