import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Bot, Loader2, Mic, Send } from "lucide-react";
import { PageHeader } from "@/components/dukaan/primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { askAI } from "@/lib/ai-server-fn";
import { useStore } from "@/lib/store";
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
      (sum, s) => sum + s.total * 0.3,
      0,
    );

    return {
      products: products.map((p) => ({
        name: p.name,
        stock: p.stock,
        price: p.price,
      })),
      recentSales: sales.slice(0, 20).map((s) => ({
        date: s.date.slice(0, 10),
        total: s.total,
        mode: s.mode,
      })),
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
      const result = await askAI({
        data: { question: q, shopData },
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
      const errMsg =
        error instanceof Error
          ? error.message
          : "Maazrat, jawab nahi mil saka. Dobara try karein.";

      setMessages((m) => [
        ...m,
        {
          id: Date.now(),
          role: "ai",
          text: errMsg,
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
            <Button type="button" variant="outline" size="icon" className="size-11 shrink-0 rounded-xl">
              <Mic className="size-5" />
            </Button>
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
