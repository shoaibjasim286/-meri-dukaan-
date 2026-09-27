import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
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
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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
  const {
    products,
    sales,
    suppliers,
    returns,
    addReturn,
    processReturn,
  } = useStore();

  const [saleId, setSaleId] = useState(sales[0]?.id ?? "");
  const [cProduct, setCProduct] = useState(sales[0]?.items[0]?.productId ?? products[0]?.id ?? "");
  const [cQty, setCQty] = useState("1");
  const [cReason, setCReason] = useState("");
  const [supplierId, setSupplierId] = useState(suppliers[0]?.id ?? "");
  const [sProduct, setSProduct] = useState(products[0]?.id ?? "");
  const [sQty, setSQty] = useState("1");
  const [sReason, setSReason] = useState("");
  const [confirmReturn, setConfirmReturn] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const requestedSaleId = new URLSearchParams(window.location.search).get("saleId");
    if (requestedSaleId && sales.some((sale) => sale.id === requestedSaleId)) {
      setSaleId(requestedSaleId);
    }
  }, [sales]);

  const selectedSale = sales.find((sale) => sale.id === saleId);

  useEffect(() => {
    const firstItem = selectedSale?.items[0];
    if (!firstItem) return;
    setCProduct(firstItem.productId);
    setCQty("1");
  }, [saleId]);

  const selectedSaleItem = selectedSale?.items.find((item) => item.productId === cProduct);
  const alreadyReturned =
    selectedSale?.returnedItems?.find((item) => item.productId === cProduct)?.returnedQty ?? 0;
  const remainingQty = selectedSaleItem
    ? Math.max(0, selectedSaleItem.qty - alreadyReturned)
    : 0;

  const customerRefundPreview = useMemo(() => {
    if (!selectedSaleItem || !selectedSale || remainingQty <= 0) return 0;
    const qty = Math.min(Math.max(1, Number(cQty) || 1), remainingQty);
    const originalGross = selectedSale.items.reduce(
      (sum, item) => sum + item.price * item.qty,
      0,
    );
    const returnedGross = selectedSaleItem.price * qty;
    const discountShare =
      originalGross > 0
        ? selectedSale.discount * (returnedGross / originalGross)
        : 0;
    return Math.max(0, returnedGross - discountShare);
  }, [selectedSale, selectedSaleItem, remainingQty, cQty]);

  const cProd = products.find((p) => p.id === cProduct);
  const sProd = products.find((p) => p.id === sProduct);
  const supplierAmount = (sProd?.purchasePrice ?? 0) * Number(sQty || 0);

  const submitCustomerReturn = () => {
    if (!selectedSaleItem || !selectedSale) return;
    const qty = Number(cQty);

    if (!Number.isInteger(qty) || qty <= 0 || qty > remainingQty) {
      toast.error(`Sirf ${remainingQty} quantity return ho sakti hai`);
      return;
    }

    if (!cReason.trim()) {
      toast.error("Return reason likhein");
      return;
    }

    setConfirmReturn(true);
  };

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
                    {sales.map((sale) => (
                      <SelectItem key={sale.id} value={sale.id}>
                        #{sale.number} — {sale.customerName} — {rs(sale.total)}
                        {sale.fullyReturned ? " · Fully Returned" : sale.partiallyReturned ? " · Partial Return" : ""}
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
                    {selectedSale?.items.map((item) => {
                      const returned =
                        selectedSale.returnedItems?.find((returnedItem) => returnedItem.productId === item.productId)?.returnedQty ?? 0;
                      const remaining = Math.max(0, item.qty - returned);
                      return (
                        <SelectItem key={item.productId} value={item.productId} disabled={remaining === 0}>
                          {item.name} · Remaining: {remaining}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs">Return Quantity</Label>
                <Input
                  className="mt-1"
                  type="number"
                  min={1}
                  step={1}
                  value={cQty}
                  onChange={(e) => setCQty(e.target.value)}
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Max: {remainingQty}
                </p>
              </div>

              <div>
                <Label className="text-xs">Reason</Label>
                <Input
                  className="mt-1"
                  value={cReason}
                  onChange={(e) => setCReason(e.target.value)}
                  placeholder="Kharab item"
                />
              </div>
            </div>

            <p className="mt-4 text-sm">
              Refund: <span className="num-lg text-lg">{rs(customerRefundPreview)}</span>
            </p>

            <Button
              className="mt-3 h-12 w-full rounded-xl text-base font-bold"
              disabled={!selectedSale || !selectedSaleItem || remainingQty === 0}
              onClick={submitCustomerReturn}
            >
              Return Confirm Karein
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
                    {suppliers.map((supplier) => (
                      <SelectItem key={supplier.id} value={supplier.id}>{supplier.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="min-w-0">
                <Label className="text-xs">Product</Label>
                <Select value={sProduct} onValueChange={setSProduct}>
                  <SelectTrigger className="mt-1 w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {products.map((product) => (
                      <SelectItem key={product.id} value={product.id}>{product.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Quantity</Label>
                <Input className="mt-1" type="number" min={1} step={1} value={sQty} onChange={(e) => setSQty(e.target.value)} />
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
                const supplier = suppliers.find((item) => item.id === supplierId);
                const qty = Number(sQty);
                if (!supplier || !sProd || !Number.isInteger(qty) || qty <= 0) {
                  toast.error("Supplier return data valid nahi hai");
                  return;
                }
                if (!sReason.trim()) {
                  toast.error("Return reason likhein");
                  return;
                }
                addReturn({
                  kind: "supplier",
                  partyName: supplier.name,
                  supplierId: supplier.id,
                  productId: sProd.id,
                  productName: sProd.name,
                  qty,
                  amount: supplierAmount,
                  reason: sReason.trim(),
                  staff: "Current Staff",
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
            {returns.map((returnRecord) => (
              <li key={returnRecord.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 sm:px-5">
                <div className="min-w-0">
                  <p className="truncate font-bold">
                    {returnRecord.productName} × {returnRecord.qty}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {returnRecord.partyName} · {formatDate(returnRecord.date)} · {returnRecord.reason}
                  </p>
                </div>
                <Pill tone={returnRecord.kind === "customer" ? "amber" : "teal"}>
                  {returnRecord.kind === "customer" ? "Customer" : "Supplier"} · {rs(returnRecord.amount)}
                </Pill>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Dialog open={confirmReturn} onOpenChange={setConfirmReturn}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Return confirm karein?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {rs(customerRefundPreview)} refund hoga aur selected item ka stock wapas add hoga.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmReturn(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!selectedSale) return;
                const result = processReturn(
                  selectedSale.id,
                  [{ productId: cProduct, qty: Number(cQty) }],
                  cReason.trim(),
                );
                if (!result.ok) {
                  toast.error(result.error);
                  setConfirmReturn(false);
                  return;
                }
                toast.success(`Return save ho gaya · ${rs(result.refundAmount)}`);
                setConfirmReturn(false);
                setCQty("1");
                setCReason("");
              }}
            >
              Confirm Return
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
