import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import type { Category, Product } from "@/lib/types";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

const CATEGORIES: Category[] = ["Grocery", "Drinks", "Snacks", "Personal Care", "Other"];

export function ProductFormDialog({
  open,
  onOpenChange,
  product,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  product?: Product;
  onSaved?: () => void;
}) {
  const { suppliers, addProduct, updateProduct } = useStore();
  const [form, setForm] = useState({
    name: "",
    category: "Grocery" as Category,
    unit: "Piece",
    purchasePrice: "",
    salePrice: "",
    stock: "",
    lowStockLimit: "5",
    supplierId: suppliers[0]?.id ?? "",
    emoji: "📦",
  });

  useEffect(() => {
    if (!open) return;
    setForm({
      name: product?.name ?? "",
      category: product?.category ?? "Grocery",
      unit: product?.unit ?? "Piece",
      purchasePrice: product ? String(product.purchasePrice) : "",
      salePrice: product ? String(product.salePrice) : "",
      stock: product ? String(product.stock) : "",
      lowStockLimit: product ? String(product.lowStockLimit) : "5",
      supplierId: product?.supplierId ?? suppliers[0]?.id ?? "",
      emoji: product?.emoji ?? "📦",
    });
  }, [open, product, suppliers]);

  const save = () => {
    if (!form.name.trim()) return;
    const payload = {
      name: form.name.trim(),
      category: form.category,
      unit: form.unit,
      purchasePrice: Number(form.purchasePrice || 0),
      salePrice: Number(form.salePrice || 0),
      stock: Number(form.stock || 0),
      lowStockLimit: Number(form.lowStockLimit || 0),
      supplierId: form.supplierId,
      emoji: form.emoji || "📦",
    };
    if (product) updateProduct(product.id, payload);
    else addProduct(payload);
    onOpenChange(false);
    onSaved?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{product ? "Samaan Edit Karein" : "Naya Samaan"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Naam" className="sm:col-span-2">
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Sugar 1kg" />
          </Field>
          <Field label="Category">
            <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v as Category })}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Unit">
            <Input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} />
          </Field>
          <Field label="Purchase Price">
            <Input
              type="number"
              value={form.purchasePrice}
              onChange={(e) => setForm({ ...form, purchasePrice: e.target.value })}
            />
          </Field>
          <Field label="Sale Price">
            <Input type="number" value={form.salePrice} onChange={(e) => setForm({ ...form, salePrice: e.target.value })} />
          </Field>
          <Field label="Stock">
            <Input type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} />
          </Field>
          <Field label="Low Stock Limit">
            <Input
              type="number"
              value={form.lowStockLimit}
              onChange={(e) => setForm({ ...form, lowStockLimit: e.target.value })}
            />
          </Field>
          <Field label="Supplier" className="sm:col-span-2">
            <Select value={form.supplierId} onValueChange={(v) => setForm({ ...form, supplierId: v })}>
              <SelectTrigger className="w-full">
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
          </Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={save}>Save Karein</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <Label className="text-xs">{label}</Label>
      <div className="mt-1">{children}</div>
    </div>
  );
}
