import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Barcode,
  Minus,
  Plus,
  Printer,
  Receipt,
  Share2,
  ShoppingCart,
  Trash2,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
import { useStore } from "@/lib/store";
import { money, rs } from "@/lib/format";
import type { SaleItem, PaymentMode, Sale } from "@/lib/types";
import {
  EmptyState,
  FilterChips,
  Panel,
  SearchBar,
} from "@/components/dukaan/primitives";
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
import { cn } from "@/lib/utils";
import { ReceiptView } from "@/components/dukaan/receipt-view";

export const Route = createFileRoute("/bikri")({
  head: () => ({
    meta: [
      { title: "Bikri (POS) — DukaanFlow" },
      { name: "description", content: "Tez POS: samaan chunein, cart banayein aur bikri complete karein." },
      { property: "og:title", content: "Bikri (POS) — DukaanFlow" },
      { property: "og:description", content: "Cash, udhaar ya mixed payment ke sath bikri karein." },
    ],
  }),
  component: Pos,
});

const CATEGORIES = ["All", "Grocery", "Drinks", "Snacks", "Personal Care", "Other"] as const;

function Pos() {
  const { products, customers, completeSale, holdCart, heldCarts, removeHeldCart } = useStore();
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState<(typeof CATEGORIES)[number]>("All");
  const [cart, setCart] = useState<SaleItem[]>([]);
  const [discount, setDiscount] = useState(0);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [mode, setMode] = useState<PaymentMode>("Cash");
  const [paidInput, setPaidInput] = useState("");
  const [receipt, setReceipt] = useState<Sale | null>(null);

  const list = useMemo(
    () =>
      products.filter(
        (p) =>
          p.active &&
          (cat === "All" || p.category === cat) &&
          p.name.toLowerCase().includes(query.toLowerCase()),
      ),
    [products, cat, query],
  );

  const subtotal = money(cart.reduce((s, i) => s + i.price * i.qty, 0));
  const total = money(Math.max(0, subtotal - discount));
  const paid = mode === "Cash" ? total : mode === "Udhaar" ? 0 : Number(paidInput || 0);
  const baqi = money(total - paid);

  const add = (productId: string) => {
    const prod = products.find((p) => p.id === productId)!;
    const existing = cart.find((i) => i.productId === productId);
    const nextQty = (existing?.qty ?? 0) + 1;
    if (nextQty > prod.stock) {
      toast.error(`${prod.name} ka stock sirf ${prod.stock} hai`);
      return;
    }
    setCart((c) =>
      existing
        ? c.map((i) => (i.productId === productId ? { ...i, qty: nextQty } : i))
        : [
            ...c,
            {
              productId,
              name: prod.name,
              qty: 1,
              price: prod.salePrice,
              purchasePrice: prod.purchasePrice,
            },
          ],
    );
  };

  const changeQty = (productId: string, delta: number) => {
    const prod = products.find((p) => p.id === productId)!;
    setCart((c) =>
      c
        .map((i) =>
          i.productId === productId
            ? { ...i, qty: Math.min(prod.stock, i.qty + delta) }
            : i,
        )
        .filter((i) => i.qty > 0),
    );
  };

  const finish = () => {
    if (cart.length === 0) return;
    if (mode !== "Cash" && !customerId) {
      toast.error("Udhaar ke liye customer chunein");
      return;
    }
    const sale = completeSale({ items: cart, discount, customerId, mode, paid });
    setReceipt(sale);
    toast.success(`Bikri complete — ${rs(sale.total)}`);
    setCart([]);
    setDiscount(0);
    setPaidInput("");
    setMode("Cash");
    setCustomerId(null);
  };

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="space-y-4">
        <SearchBar
          value={query}
          onChange={setQuery}
          placeholder="Search Samaan..."
          right={
            <Button
              variant="outline"
              size="icon"
              className="size-11 shrink-0 rounded-xl"
              onClick={() => toast.info("Scanner baad mein connect hoga")}
            >
              <Barcode className="size-5" />
            </Button>
          }
        />
        <FilterChips options={CATEGORIES} value={cat} onChange={setCat} />

        {heldCarts.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {heldCarts.map((h) => (
              <button
                key={h.id}
                type="button"
                onClick={() => {
                  setCart(h.items);
                  setCustomerId(h.customerId);
                  removeHeldCart(h.id);
                  toast.success(`${h.label} ka cart resume ho gaya`);
                }}
                className="surface-card px-3 py-2 text-xs font-bold"
              >
                Resume: {h.label} · {rs(h.items.reduce((s, i) => s + i.price * i.qty, 0))}
              </button>
            ))}
          </div>
        ) : null}

        {list.length === 0 ? (
          <EmptyState icon={ShoppingCart} title="Koi samaan nahi mila" body="Doosra naam ya category try karein." />
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
            {list.map((p) => (
              <button
                key={p.id}
                type="button"
                disabled={p.stock === 0}
                onClick={() => add(p.id)}
                className={cn(
                  "surface-card flex flex-col gap-1 p-3 text-left transition-shadow hover:shadow-float",
                  p.stock === 0 && "opacity-50",
                )}
              >
                <span className="text-2xl">{p.emoji}</span>
                <span className="line-clamp-2 min-h-10 text-sm font-bold">{p.name}</span>
                <span className="num-lg text-base text-primary">{rs(p.salePrice)}</span>
                <span className="text-xs text-muted-foreground">Stock: {p.stock}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <aside className="lg:sticky lg:top-20 lg:h-fit">
        <Panel title="Cart" bodyClassName="p-0">
          {cart.length === 0 ? (
            <div className="p-5">
              <EmptyState icon={ShoppingCart} title="Cart khali hai" body="Samaan par click karke cart mein dalein." />
            </div>
          ) : (
            <ul className="max-h-72 divide-y divide-border overflow-y-auto">
              {cart.map((i) => (
                <li key={i.productId} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold">{i.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {i.qty} × {rs(i.price)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button size="icon" variant="outline" className="size-8" onClick={() => changeQty(i.productId, -1)}>
                      <Minus className="size-4" />
                    </Button>
                    <span className="w-6 text-center text-sm font-bold">{i.qty}</span>
                    <Button size="icon" variant="outline" className="size-8" onClick={() => changeQty(i.productId, 1)}>
                      <Plus className="size-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-8 text-danger"
                      onClick={() => setCart((c) => c.filter((x) => x.productId !== i.productId))}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <div className="space-y-3 border-t border-border p-4">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Discount</Label>
                <Input
                  type="number"
                  inputMode="numeric"
                  value={discount || ""}
                  onChange={(e) => setDiscount(Number(e.target.value || 0))}
                  className="mt-1 h-10 rounded-xl"
                  placeholder="0"
                />
              </div>
              <div className="min-w-0">
                <Label className="text-xs">Customer</Label>
                <Select value={customerId ?? "walkin"} onValueChange={(v) => setCustomerId(v === "walkin" ? null : v)}>
                  <SelectTrigger className="mt-1 h-10 w-full rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="walkin">Walk-in</SelectItem>
                    {customers.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {(["Cash", "Udhaar", "Mixed"] as PaymentMode[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className={cn(
                    "rounded-xl border px-2 py-2 text-sm font-bold transition-colors",
                    mode === m ? "border-primary bg-primary text-primary-foreground" : "border-border",
                  )}
                >
                  {m}
                </button>
              ))}
            </div>

            {mode === "Mixed" ? (
              <div>
                <Label className="text-xs">Kitna paid hua?</Label>
                <Input
                  type="number"
                  inputMode="numeric"
                  value={paidInput}
                  onChange={(e) => setPaidInput(e.target.value)}
                  className="mt-1 h-10 rounded-xl"
                  placeholder="0"
                />
              </div>
            ) : null}

            <dl className="space-y-1 text-sm">
              <Row label="Subtotal" value={rs(subtotal)} />
              <Row label="Discount" value={rs(discount)} />
              <Row label="Total" value={rs(total)} strong />
              <Row label="Paid" value={rs(paid)} />
              <Row label="Baqi" value={rs(baqi)} {...(baqi > 0 ? { tone: "danger" as const } : {})} />
            </dl>

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="h-12 flex-1 rounded-xl font-bold"
                disabled={cart.length === 0}
                onClick={() => {
                  const c = customers.find((x) => x.id === customerId);
                  holdCart(cart, customerId, c?.name ?? "Counter");
                  setCart([]);
                  toast.success("Cart hold ho gaya");
                }}
              >
                Hold
              </Button>
              <Button className="h-12 flex-[2] rounded-xl text-base font-bold" disabled={cart.length === 0} onClick={finish}>
                Bikri Complete Karein
              </Button>
            </div>
          </div>
        </Panel>
      </aside>

      <Dialog open={!!receipt} onOpenChange={(o) => !o && setReceipt(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="size-5" /> Receipt
            </DialogTitle>
          </DialogHeader>
          {receipt ? <ReceiptView sale={receipt} /> : null}
          <DialogFooter className="gap-2 sm:justify-between">
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => toast.success("Receipt print par bheji gayi")}>
                <Printer className="size-4" /> Print
              </Button>
              <Button variant="outline" onClick={() => toast.success("Receipt share ho gayi")}>
                <Share2 className="size-4" /> Share
              </Button>
            </div>
            <Button onClick={() => setReceipt(null)}>
              <UserRound className="size-4" /> New Sale
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Row({
  label,
  value,
  strong,
  tone,
}: {
  label: string;
  value: string;
  strong?: boolean;
  tone?: "danger";
}) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-muted-foreground">{label}</dt>
      <dd
        className={cn(
          "font-bold tabular-nums",
          strong && "text-lg",
          tone === "danger" && "text-danger",
        )}
      >
        {value}
      </dd>
    </div>
  );
}
