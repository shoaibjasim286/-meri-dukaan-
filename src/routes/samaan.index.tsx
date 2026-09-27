import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Boxes, Plus } from "lucide-react";
import { toast } from "sonner";
import { useStore } from "@/lib/store";
import { rs } from "@/lib/format";
import { isLowStock } from "@/lib/selectors";
import {
  EmptyState,
  FilterChips,
  PageHeader,
  Panel,
  Pill,
  SearchBar,
} from "@/components/dukaan/primitives";
import { Button } from "@/components/ui/button";
import { ProductFormDialog } from "@/components/dukaan/product-form-dialog";

export const Route = createFileRoute("/samaan/")({
  head: () => ({
    meta: [
      { title: "Samaan (Stock) — DukaanFlow" },
      { name: "description", content: "Poora stock, kharid aur sale price, low stock alerts." },
      { property: "og:title", content: "Samaan (Stock) — DukaanFlow" },
      { property: "og:description", content: "Dukaan ka saara samaan ek jagah." },
    ],
  }),
  component: StockPage,
});

const FILTERS = ["All", "Low Stock", "Out of Stock", "Active"] as const;

function StockPage() {
  const { products } = useStore();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("All");
  const [addOpen, setAddOpen] = useState(false);

  const list = useMemo(
    () =>
      products.filter((p) => {
        const q = p.name.toLowerCase().includes(query.toLowerCase());
        if (!q) return false;
        if (filter === "Low Stock") return isLowStock(p) && p.stock > 0;
        if (filter === "Out of Stock") return p.stock === 0;
        if (filter === "Active") return p.active;
        return true;
      }),
    [products, query, filter],
  );

  return (
    <div className="space-y-5">
      <PageHeader
        title="Samaan"
        subtitle={`${products.length} items · ${products.filter(isLowStock).length} kam stock`}
        actions={
          <Button className="h-11 rounded-xl font-bold" onClick={() => setAddOpen(true)}>
            <Plus className="size-4" /> Naya Samaan
          </Button>
        }
      />
      <SearchBar value={query} onChange={setQuery} placeholder="Search Samaan..." />
      <FilterChips options={FILTERS} value={filter} onChange={setFilter} />

      {list.length === 0 ? (
        <EmptyState
          icon={Boxes}
          title="Koi samaan nahi mila"
          body="Apna pehla product add karein."
          action={
            <Button onClick={() => setAddOpen(true)}>
              <Plus className="size-4" /> Naya Samaan
            </Button>
          }
        />
      ) : (
        <>
          {/* Mobile cards */}
          <div className="grid gap-3 sm:grid-cols-2 lg:hidden">
            {list.map((p) => (
              <Link key={p.id} to="/samaan/$id" params={{ id: p.id }} className="surface-card p-4">
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-bold">
                      {p.emoji} {p.name}
                    </p>
                    <p className="text-xs text-muted-foreground">{p.category}</p>
                  </div>
                  <Pill tone={p.stock === 0 ? "danger" : isLowStock(p) ? "amber" : "success"}>
                    {p.stock === 0 ? "Khatam" : isLowStock(p) ? "Kam Stock" : "In Stock"}
                  </Pill>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
                  <Cell label="Stock" value={`${p.stock} ${p.unit}`} />
                  <Cell label="Kharid" value={rs(p.purchasePrice)} />
                  <Cell label="Sale" value={rs(p.salePrice)} />
                </div>
              </Link>
            ))}
          </div>

          {/* Desktop table */}
          <Panel className="hidden lg:block" bodyClassName="p-0">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/50 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-5 py-3">Product</th>
                  <th className="px-5 py-3">Category</th>
                  <th className="px-5 py-3">Stock</th>
                  <th className="px-5 py-3">Purchase</th>
                  <th className="px-5 py-3">Sale</th>
                  <th className="px-5 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {list.map((p) => (
                  <tr key={p.id} className="hover:bg-muted/40">
                    <td className="px-5 py-3 font-bold">
                      <Link to="/samaan/$id" params={{ id: p.id }} className="hover:text-primary">
                        {p.emoji} {p.name}
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">{p.category}</td>
                    <td className="px-5 py-3 tabular-nums">
                      {p.stock} {p.unit}
                    </td>
                    <td className="px-5 py-3 tabular-nums">{rs(p.purchasePrice)}</td>
                    <td className="px-5 py-3 tabular-nums">{rs(p.salePrice)}</td>
                    <td className="px-5 py-3">
                      <Pill tone={p.stock === 0 ? "danger" : isLowStock(p) ? "amber" : "success"}>
                        {p.stock === 0 ? "Khatam" : isLowStock(p) ? "Kam Stock" : "In Stock"}
                      </Pill>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Panel>
        </>
      )}

      <ProductFormDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        onSaved={() => toast.success("Naya samaan add ho gaya")}
      />
    </div>
  );
}

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-muted px-2 py-1.5">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="truncate font-bold tabular-nums">{value}</p>
    </div>
  );
}
