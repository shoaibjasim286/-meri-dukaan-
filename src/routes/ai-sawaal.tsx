import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Bot, Loader2, Send } from "lucide-react";
import { PageHeader } from "@/components/dukaan/primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { askAI } from "@/lib/ai-server-fn";
import { debugLog } from "@/lib/debug-log";
import { useStore } from "@/lib/store";
import { saleProfit } from "@/lib/selectors";
import { rs } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/ai-sawaal")({
  head: () => ({
    meta: [
      { title: "AI Sawaal — DukaanFlow" },
      { name: "description", content: "Apne dukaan ke data ke baare mein aasan sawaal poochain." },
      { property: "og:title", content: "AI Sawaal — DukaanFlow" },
      { property: "og:description", content: "DukaanFlow AI assistant." },
    ],
  }),
  component: AiPage,
});

const SUGGESTIONS = [
  "Aaj kitni bikri hui?",
  "Aaj kitna munafa hua?",
  "Sab se zyada bikne wala samaan konsa hai?",
  "Kin customers ka udhaar zyada hai?",
  "Kam stock konsa hai?",
];

interface Msg {
  id: number;
  role: "user" | "ai";
  text: string;
}

function AiPage() {
  const { products, sales, customers } = useStore();
  const [messages, setMessages] = useState<Msg[]>([
    {
      id: 1,
      role: "ai",
      text: "Assalam-o-Alaikum! Main DukaanFlow AI hoon. Apne dukaan ke baare mein kuch bhi poochain.",
    },
  ]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);

  const shopData = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);

    const todaySales = sales.filter((s) => s.date.slice(0, 10) === today);

    const todaySalesTotal = todaySales.reduce(
      (sum, s) => sum + s.total,
      0,
    );

    const todayProfit = todaySales.reduce(
      (sum, s) => sum + saleProfit(s),
      0,
    );

    // Summarize actual item-level sales before sending data to the AI.
    // Inventory alone cannot tell the bot what sold most; invoices' line items can.
    const productSales = new Map<
      string,
      { name: string; unit: string; quantitySold: number; revenue: number; billCount: number }
    >();

    sales.forEach((sale) => {
      const productsInBill = new Set<string>();

      sale.items.forEach((item) => {
        const returnedQty = (sale.returnedItems ?? [])
          .filter((returned) => returned.productId === item.productId)
          .reduce((sum, returned) => sum + returned.returnedQty, 0);
        const quantitySold = Math.max(0, item.qty - returnedQty);

        if (quantitySold <= 0) return;

        const current = productSales.get(item.productId) ?? {
          name: item.name,
          unit: products.find((product) => product.id === item.productId)?.unit ?? "units",
          quantitySold: 0,
          revenue: 0,
          billCount: 0,
        };

        current.quantitySold += quantitySold;
        current.revenue += quantitySold * item.price;

        if (!productsInBill.has(item.productId)) {
          current.billCount += 1;
          productsInBill.add(item.productId);
        }

        productSales.set(item.productId, current);
      });
    });

    const topSellingProducts = [...productSales.values()]
      .sort((a, b) => b.quantitySold - a.quantitySold || b.revenue - a.revenue)
      .slice(0, 50)
      .map((item) => ({
        name: item.name,
        unit: item.unit,
        quantitySold: item.quantitySold,
        revenue: Math.round(item.revenue * 100) / 100,
        billCount: item.billCount,
      }));

    return {
      products: products.map((p) => ({
        name: p.name,
        stock: p.stock,
        salePrice: p.salePrice,
        purchasePrice: p.purchasePrice,
      })),
      recentSales: sales.slice(0, 20).map((s) => ({
        date: s.date.slice(0, 10),
        total: s.total,
        mode: s.mode,
      })),
      salesRecordCount: sales.length,
      topSellingProducts,
      customers: customers.map((c) => ({
        name: c.name,
        balance: c.balance,
      })),
      lowStock: products
        .filter((p) => p.active && p.stock <= 5)
        .map((p) => ({
          name: p.name,
          stock: p.stock,
        })),
      todaySales: todaySalesTotal,
      todayProfit: Math.round(todayProfit),
      totalUdhaar: customers.reduce((sum, c) => sum + c.balance, 0),
    };
  }, [products, sales, customers]);

  const send = async (value: string) => {
    const q = value.trim();
    if (!q || loading) return;

    const userMsgId = Date.now();
    setMessages((m) => [
      ...m,
      { id: userMsgId, role: "user", text: q },
    ]);
    setText("");
    setLoading(true);

    try {
      // Answer top-selling questions directly from saved invoices. This avoids
      // the language model incorrectly claiming that existing sales data is missing.
      const asksTopSelling =
        /(?:sab|sub|top|best|most|zyada|ziada).*?(?:bik|sell|sale|sold|farokht|sales)|(?:bikne|bikta|bikti).*?(?:samaan|saman|item|product)|(?:samaan|saman|item|product).*?(?:top sell|zyada bik)/i.test(q);

      if (asksTopSelling) {
        const top = shopData.topSellingProducts[0];
        const answer = top
          ? `${top.name} aapke recorded data mein sab se zyada bikne wala samaan hai. ${top.quantitySold} ${top.unit} bika, sales value ${rs(top.revenue)} rahi, aur ye ${top.billCount} bills mein shamil tha. (Tamam recorded sales ka hisaab.)`
          : "Abhi saved sales bills mein item-wise bikri ka record nahi mila. Bikri screen par product select karke sale save karein; sirf stock list se sab se zyada bikne wala item maloom nahi hota.";

        setMessages((m) => [
          ...m,
          {
            id: Date.now() + 1,
            role: "ai",
            text: answer,
          },
        ]);
        return;
      }

      const result = await askAI({
        data: {
          question: q,
          shopData: {
            ...shopData,
            products: shopData.products.map((product) => ({
              ...product,
              price: product.salePrice,
            })),
          },
        },
      });

      setMessages((m) => [
        ...m,
        {
          id: Date.now(),
          role: "ai",
          text: result.answer,
        },
      ]);
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Unknown";
      debugLog.error("AI", `Client error: ${msg}`, { msg });
      const errMsg =
        error instanceof Error
          ? error.message
          : "Maazrat, jawab nahi mil saka. Dobara try karein.";
      const normalizedQuestion = q.toLowerCase();
      let localAnswer = "";

      // Keep common shop-data questions useful even when the AI server is offline.
      if (/(bikri|sales?).*(aaj|today)|(aaj|today).*(bikri|sales?)/i.test(normalizedQuestion)) {
        localAnswer = `Aaj ki recorded bikri ${rs(shopData.todaySales)} hai. Ye jawab device par saved sales se nikala gaya hai.`;
      } else if (/(munafa|profit|kamai).*(aaj|today)|(aaj|today).*(munafa|profit|kamai)/i.test(normalizedQuestion)) {
        localAnswer = `Aaj ka recorded gross munafa ${rs(shopData.todayProfit)} hai. Expenses minus karne ke baad net munafa mukhtalif ho sakta hai.`;
      } else if (/(udhaar|baqaya|customer balance)/i.test(normalizedQuestion)) {
        const topDebtors = [...shopData.customers]
          .filter((customer) => customer.balance > 0)
          .sort((a, b) => b.balance - a.balance)
          .slice(0, 3);
        localAnswer = topDebtors.length
          ? `Total baqi udhaar ${rs(shopData.totalUdhaar)} hai. Sab se zyada baqi: ${topDebtors.map((customer) => `${customer.name} (${rs(customer.balance)})`).join(", ")}.`
          : "Saved customer records mein koi baqi udhaar nahi mila.";
      } else if (/(kam stock|low stock|stock kam|khatam stock)/i.test(normalizedQuestion)) {
        const lowItems = [...shopData.lowStock].sort((a, b) => a.stock - b.stock).slice(0, 5);
        localAnswer = lowItems.length
          ? `Kam stock wale items: ${lowItems.map((product) => `${product.name} (${product.stock})`).join(", ")}.`
          : "Saved products mein low-stock items nahi mile.";
      } else if (/(sab|sub|top|best|most|zyada|ziada).*(bik|sell|sale|sold|farokht)|(bikne|bikta|bikti).*(samaan|saman|item|product)/i.test(normalizedQuestion)) {
        const top = shopData.topSellingProducts[0];
        localAnswer = top
          ? `${top.name} sab se zyada bikne wala item hai: ${top.quantitySold} ${top.unit}, sales value ${rs(top.revenue)}, ${top.billCount} bills. (Tamam saved sales ka hisaab.)`
          : "Saved sales bills mein item-wise record nahi mila. Pehle Bikri screen par product ke saath sale save honi chahiye.";
      }

      const networkUnavailable =
        typeof navigator !== "undefined" &&
        navigator.onLine === false ||
        /failed to fetch|fetch failed|networkerror|network error|load failed|offline/i.test(msg);
      const answer = localAnswer ||
        (networkUnavailable
          ? "Internet abhi available nahi, is liye general AI jawab nahi mil sakta. Bikri, stock, customers, udhaar aur reports ka saved data app mein offline bhi dekh sakte hain."
          : errMsg);

      setMessages((m) => [
        ...m,
        {
          id: Date.now(),
          role: "ai",
          text: answer,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader title="AI Sawaal" subtitle="Apne dukaan ke data ke baare mein poochain" />

      <div className="surface-card flex h-[60vh] flex-col overflow-hidden">
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
          {messages.map((m) => (
            <div
              key={m.id}
              className={cn("flex gap-2", m.role === "user" ? "justify-end" : "justify-start")}
            >
              {m.role === "ai" ? (
                <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
                  <Bot className="size-4" />
                </span>
              ) : null}
              <div
                className={cn(
                  "max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm",
                  m.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-foreground",
                )}
              >
                {m.role === "ai" ? (
                  <p className="mb-1 text-xs font-bold opacity-70">DukaanFlow AI</p>
                ) : null}
                {m.text}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Soch raha hoon...</span>
            </div>
          )}
        </div>

        <div className="border-t border-border p-3">
          <div className="-mx-1 mb-2 flex gap-2 overflow-x-auto px-1">
            {SUGGESTIONS.map((s) => (
              <Button
                key={s}
                type="button"
                variant="outline"
                size="sm"
                disabled={loading}
                onClick={() => void send(s)}
                className="shrink-0"
              >
                {s}
              </Button>
            ))}
          </div>
          <form
            className="flex items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              void send(text);
            }}
          >
            <Input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Apna sawal likhein..."
              className="h-11 rounded-xl"
              disabled={loading}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void send(text);
                }
              }}
            />
            <Button
              type="submit"
              size="icon"
              className="size-11 shrink-0 rounded-xl"
              disabled={loading || !text.trim()}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
