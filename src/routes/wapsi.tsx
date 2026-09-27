import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { useStore } from "@/lib/store";
import { formatDate, rs } from "@/lib/format";
import { EmptyState, PageHeader, Panel, Pill } from "@/components/dukaan/primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/wapsi")({
  head: () => ({
    meta: [
      { title: "Wapsi (Returns) — DukaanFlow" },
      { name: "description", content: "Customer aur supplier ki wapsi darj karein." },
      { property: "og:title", content: "Wapsi — DukaanFlow" },
      { property: "og:description", content: "Return se stock aur hisaab khud update hota hai." },
    ],
  }),
  component: ReturnsPage,
});

function ReturnsPage() {
  const { products, sales, suppliers, returns, addReturn } = useStore();
  const [saleId, setSaleId] = useState(sales[0]?.id ?? "");
  const [cProduct, setCProduct] = useState(products[0]?.id ?? "");
  const [cQty, setCQty] = useState("1");
  const [cReason, setCReason] = useState("");
  const [supplierId, setSupplierId] = useState(suppliers[0]?.id ?? "");
  const [sProduct, setSProduct] = useState(products[0]?.id ?? "");
  const [sQty, setSQty] = useState("1");
  const [sReason, setSReason] = useState("");

  const cProd = products.find((p) => p.id === cProduct);
  const sProd = products.find((p) => p.id === sProduct);
  const refund = (cProd?.salePrice ?? 0) * Number(cQty || 0);
  const supplierAmount = (sProd?.purchasePrice ?? 0) * Number(sQty || 0);

  return (
    <div className="space-y-5">
      <PageHeader title="Wapsi" subtitle="Customer return aur supplier return" />

      <Tabs defaultValue="customer">
        <TabsList className="rounded-xl">
          <TabsTrigger value="customer">Customer Return</TabsTrigger>
          <TabsTrigger value="supplier">Supplier Return</TabsTrigger>
        </TabsList>

        <TabsContent value="customer" className="mt-4">
          <Panel>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="min-w-0">
                <Label className="text-xs">Sale</Label>
                <Select value={saleId} onValueChange={setSaleId}>
                  <SelectTrigger className="mt-1 w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {sales.slice(0, 20).map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        #{s.number} — {s.customerName} — {rs(s.total)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="min-w-0">
                <Label className="text-xs">Product</Label>
                <Select value={cProduct} onValueChange={setCProduct}>
                  <SelectTrigger className="mt-1 w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {products.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Quantity</Label>
                <Input className="mt-1" type="number" value={cQty} onChange={(e) => setCQty(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Reason</Label>
                <Input className="mt-1" value={cReason} onChange={(e) => setCReason(e.target.value)} placeholder="Kharab item" />
              </div>
            </div>
            <p className="mt-4 text-sm">
              Refund: <span className="num-lg text-lg">{rs(refund)}</span>
            </p>
            <Button
              className="mt-3 h-12 w-full rounded-xl text-base font-bold"
              onClick={() => {
                const sale = sales.find((s) => s.id === saleId);
                if (!cProd || Number(cQty) <= 0) return;
                addReturn({
                  kind: "customer",
                  partyName: sale?.customerName ?? "Walk-in Customer",
                  productId: cProd.id,
                  productName: cProd.name,
                  qty: Number(cQty),
                  amount: refund,
                  reason: cReason || "Return",
                  saleId,
                });
                toast.success("Return save ho gaya");
                setCReason("");
              }}
            >
              Return Save Karein
            </Button>
          </Panel>
        </TabsContent>

        <TabsContent value="supplier" className="mt-4">
          <Panel>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="min-w-0">
                <Label className="text-xs">Supplier</Label>
                <Select value={supplierId} onValueChange={setSupplierId}>
                  <SelectTrigger className="mt-1 w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {suppliers.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="min-w-0">
                <Label className="text-xs">Product</Label>
                <Select value={sProduct} onValueChange={setSProduct}>
                  <SelectTrigger className="mt-1 w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {products.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Quantity</Label>
                <Input className="mt-1" type="number" value={sQty} onChange={(e) => setSQty(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Reason</Label>
                <Input className="mt-1" value={sReason} onChange={(e) => setSReason(e.target.value)} />
              </div>
            </div>
            <p className="mt-4 text-sm">
              Amount: <span className="num-lg text-lg">{rs(supplierAmount)}</span>
            </p>
            <Button
              className="mt-3 h-12 w-full rounded-xl text-base font-bold"
              onClick={() => {
                const sup = suppliers.find((s) => s.id === supplierId);
                if (!sProd || Number(sQty) <= 0) return;
                addReturn({
                  kind: "supplier",
                  partyName: sup?.name ?? "",
                  productId: sProd.id,
                  productName: sProd.name,
                  qty: Number(sQty),
                  amount: supplierAmount,
                  reason: sReason || "Return",
                });
                toast.success("Supplier return save ho gaya");
                setSReason("");
              }}
            >
              Return Save Karein
            </Button>
          </Panel>
        </TabsContent>
      </Tabs>

      <Panel title="Wapsi History" bodyClassName="p-0">
        {returns.length === 0 ? (
          <div className="p-5">
            <EmptyState icon={RotateCcw} title="Koi wapsi nahi" body="Return karne par yahan record aayega." />
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {returns.map((r) => (
              <li key={r.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 sm:px-5">
                <div className="min-w-0">
                  <p className="truncate font-bold">
                    {r.productName} × {r.qty}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {r.partyName} · {formatDate(r.date)} · {r.reason}
                  </p>
                </div>
                <Pill tone={r.kind === "customer" ? "amber" : "teal"}>
                  {r.kind === "customer" ? "Customer" : "Supplier"} · {rs(r.amount)}
                </Pill>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
