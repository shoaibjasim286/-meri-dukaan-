import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Layers } from "lucide-react";
import { toast } from "sonner";
import { useStore } from "@/lib/store";
import { formatTime, rs } from "@/lib/format";
import { EmptyState, PageHeader, Panel } from "@/components/dukaan/primitives";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/held-carts")({
  head: () => ({
    meta: [
      { title: "Held Carts — DukaanFlow" },
      { name: "description", content: "Rokay gaye carts resume ya delete karein." },
      { property: "og:title", content: "Held Carts — DukaanFlow" },
      { property: "og:description", content: "Busy counter par carts hold karein." },
    ],
  }),
  component: HeldCartsPage,
});

function HeldCartsPage() {
  const { heldCarts, removeHeldCart } = useStore();
  const navigate = useNavigate();

  return (
    <div className="space-y-5">
      <PageHeader title="Held Carts" subtitle={`${heldCarts.length} carts rokay gaye hain`} />
      {heldCarts.length === 0 ? (
        <EmptyState icon={Layers} title="Koi held cart nahi" body="POS par cart hold karein to yahan dikhega." />
      ) : (
        <Panel bodyClassName="p-0">
          <ul className="divide-y divide-border">
            {heldCarts.map((h) => (
              <li key={h.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 sm:px-5">
                <div className="min-w-0">
                  <p className="truncate font-bold">{h.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {h.items.length} items · Held {formatTime(h.heldAt)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="num-lg text-base">
                    {rs(h.items.reduce((s, i) => s + i.price * i.qty, 0))}
                  </span>
                  <Button
                    size="sm"
                    className="rounded-xl"
                    onClick={() =>
                      navigate({
                        to: "/bikri",
                        search: { heldCartId: h.id },
                      })
                    }
                  >
                    Resume
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-xl text-danger"
                    onClick={() => {
                      removeHeldCart(h.id);
                      toast.success("Cart delete ho gaya");
                    }}
                  >
                    Delete
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </Panel>
      )}
    </div>
  );
}
