import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Printer, Receipt, RotateCcw, Share2 } from "lucide-react";
import { useStore } from "@/lib/store";
import { printElement } from "@/lib/print";
import { shareContent } from "@/lib/share";
import { formatDate, formatTime, rs } from "@/lib/format";
import { EmptyState, PageHeader, Panel, Pill, SearchBar } from "@/components/dukaan/primitives";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ReceiptView } from "@/components/dukaan/receipt-view";

export const Route = createFileRoute("/receipts")({
  head: () => ({
    meta: [
      { title: "Receipts — DukaanFlow" },
      { name: "description", content: "Purani bikri ki receipts dekhein, print ya share karein." },
      { property: "og:title", content: "Receipts — DukaanFlow" },
      { property: "og:description", content: "Har bill ka record." },
    ],
  }),
  component: ReceiptsPage,
});

function ReceiptsPage() {
  const { sales } = useStore();
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  const list = sales.filter(
    (s) =>
      String(s.number).includes(query) ||
      s.customerName.toLowerCase().includes(query.toLowerCase()),
  );
  const selected = sales.find((s) => s.id === openId);

  return (
    <div className="space-y-5">
      <PageHeader title="Receipts" subtitle={`${sales.length} bills`} />
      <SearchBar value={query} onChange={setQuery} placeholder="Bill number ya customer..." />

      {list.length === 0 ? (
        <EmptyState icon={Receipt} title="Koi receipt nahi" body="Bikri karne par receipts yahan aayengi." />
      ) : (
        <Panel bodyClassName="p-0">
          <ul className="divide-y divide-border">
            {list.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => setOpenId(s.id)}
                  className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 text-left hover:bg-muted/50 sm:px-5"
                >
                  <span className="min-w-0">
                    <span className="block truncate font-bold">Sale #{s.number}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {s.customerName} · {formatDate(s.date)} {formatTime(s.date)}
                    </span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="num-lg block">{rs(s.total)}</span>
                    <Pill tone={s.mode === "Cash" ? "success" : s.mode === "Udhaar" ? "amber" : "teal"}>
                      {s.mode}
                    </Pill>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      <Dialog open={!!selected} onOpenChange={(o) => !o && setOpenId(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Receipt</DialogTitle>
          </DialogHeader>
          {selected ? (
            <div id="receipt-print-area" data-print-format="receipt">
              <ReceiptView sale={selected} />
            </div>
          ) : null}
          <DialogFooter className="no-print">
            <Button variant="outline" onClick={() => printElement("receipt-print-area")}>
              <Printer className="size-4" /> Print
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                if (!selected) return;
                window.location.href = `/wapsi?saleId=${encodeURIComponent(selected.id)}`;
              }}
            >
              <RotateCcw className="size-4" /> Return
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                if (!selected) return;
                void shareContent(
                  `Receipt #${selected.number}`,
                  `Meri Dukaan
Receipt #${selected.number}
Customer: ${selected.customerName}
Total: ${rs(selected.total)}
Paid: ${rs(selected.paid)}
Baqi: ${rs(selected.total - selected.paid)}`,
                );
              }}
            >
              <Share2 className="size-4" /> Share
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
