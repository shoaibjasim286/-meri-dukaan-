import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, History, Minus, Pencil, Plus, Power } from "lucide-react";
import { toast } from "sonner";
import { useStore } from "@/lib/store";
import { formatDate, formatTime, rs } from "@/lib/format";
import { isLowStock } from "@/lib/selectors";
import { EmptyState, PageHeader, Panel, Pill } from "@/components/dukaan/primitives";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ProductFormDialog } from "@/components/dukaan/product-form-dialog";

export const Route = createFileRoute("/samaan/$id")({
  head: () => ({
    meta: [
      { title: "Product Detail — DukaanFlow" },
      { name: "description", content: "Product ki tafseel, stock history aur prices." },
      { property: "og:title", content: "Product Detail — DukaanFlow" },
      { property: "og:description", content: "Stock barhayein, kam karein ya product edit karein." },
    ],
  }),
  component: ProductDetail,
});

function ProductDetail() {
  const { id } = useParams({ from: "/samaan/$id" });
  const { products, suppliers, adjustments, adjustStock, updateProduct } = useStore();
  const product = products.find((p) => p.id === id);
  const [editOpen, setEditOpen] = useState(false);
  const [adjust, setAdjust] = useState<null | "up" | "down">(null);
  const [qty, setQty] = useState("");
  const [reason, setReason] = useState("");
  const [confirmOff, setConfirmOff] = useState(false);

  if (!product) {
    return (
      <EmptyState
        icon={History}
        title="Product nahi mila"
        body="Ye samaan mojood nahi hai."
        action={
          <Link to="/samaan">
            <Button>Samaan par wapas</Button>
          </Link>
        }
      />
    );
  }

  const supplier = suppliers.find((s) => s.id === product.supplierId);
  const history = adjustments.filter((a) => a.productId === product.id);

  return (
    <div className="space-y-5">
      <Link to="/samaan" className="inline-flex items-center gap-1 text-sm font-semibold text-muted-foreground">
        <ArrowLeft className="size-4" /> Samaan
      </Link>
      <PageHeader
        title={`${product.emoji} ${product.name}`}
        subtitle={`${product.category} · ${supplier?.name ?? "Koi supplier nahi"}`}
        actions={
          <Pill tone={product.stock === 0 ? "danger" : isLowStock(product) ? "amber" : "success"}>
            {product.stock === 0 ? "Khatam" : isLowStock(product) ? "Kam Stock" : "In Stock"}
          </Pill>
        }
      />

      <Panel title="Tafseel">
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Info label="Current Stock" value={`${product.stock} ${product.unit}`} />
          <Info label="Low Stock Limit" value={String(product.lowStockLimit)} />
          <Info label="Purchase Price" value={rs(product.purchasePrice)} />
          <Info label="Sale Price" value={rs(product.salePrice)} />
          <Info label="Munafa per unit" value={rs(product.salePrice - product.purchasePrice)} />
          <Info label="Unit" value={product.unit} />
          <Info label="Supplier" value={supplier?.name ?? "—"} />
          <Info label="Status" value={product.active ? "Active" : "Band"} />
        </dl>
      </Panel>

      <div className="flex flex-wrap gap-2">
        <Button variant="outline" className="h-11 rounded-xl" onClick={() => setEditOpen(true)}>
          <Pencil className="size-4" /> Edit
        </Button>
        <Button className="h-11 rounded-xl" onClick={() => { setAdjust("up"); setQty(""); setReason(""); }}>
          <Plus className="size-4" /> Stock Barhao
        </Button>
        <Button variant="outline" className="h-11 rounded-xl" onClick={() => { setAdjust("down"); setQty(""); setReason(""); }}>
          <Minus className="size-4" /> Stock Kam Karo
        </Button>
        <Button variant="outline" className="h-11 rounded-xl text-danger" onClick={() => setConfirmOff(true)}>
          <Power className="size-4" /> {product.active ? "Deactivate" : "Activate"}
        </Button>
      </div>

      <Panel title="History" bodyClassName="p-0">
        {history.length === 0 ? (
          <div className="p-5">
            <EmptyState icon={History} title="Koi history nahi" body="Stock change hone par yahan record aayega." />
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {history.map((h) => (
              <li key={h.id} className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 px-4 py-3 sm:px-5">
                <div className="min-w-0">
                  <p className="truncate font-bold">{h.reason}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(h.date)} {formatTime(h.date)} · {h.staff}
                  </p>
                </div>
                <Pill tone={h.change > 0 ? "success" : "danger"}>
                  {h.change > 0 ? "+" : ""}
                  {h.change}
                </Pill>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <ProductFormDialog open={editOpen} onOpenChange={setEditOpen} product={product} onSaved={() => toast.success("Product update ho gaya")} />

      <Dialog open={!!adjust} onOpenChange={(o) => !o && setAdjust(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{adjust === "up" ? "Stock Barhao" : "Stock Kam Karo"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Quantity</Label>
              <Input type="number" value={qty} onChange={(e) => setQty(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Wajah</Label>
              <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Nayi kharid / kharab" className="mt-1" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdjust(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                const n = Number(qty || 0);
                if (n <= 0) return;
                adjustStock(product.id, adjust === "up" ? n : -n, reason || "Adjustment");
                setAdjust(null);
                toast.success("Stock update ho gaya");
              }}
            >
              Save Karein
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmOff} onOpenChange={setConfirmOff}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {product.active ? "Product band karein?" : "Product dobara chalu karein?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {product.active
                ? "Band product POS mein nahi dikhega. Aap ise dobara chalu kar sakte hain."
                : "Ye product dobara POS mein aa jayega."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Nahi</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                updateProduct(product.id, { active: !product.active });
                toast.success(product.active ? "Product band ho gaya" : "Product chalu ho gaya");
              }}
            >
              Haan
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-muted px-3 py-2">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 font-bold tabular-nums">{value}</dd>
    </div>
  );
}
