import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Bot, Mic, Send } from "lucide-react";
import { PageHeader } from "@/components/dukaan/primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/ai-sawaal")({
  head: () => ({
    meta: [
      { title: "AI Sawaal — DukaanFlow" },
      { name: "description", content: "Apne dukaan ke data ke baare mein aasan sawaal poochain." },
      { property: "og:title", content: "AI Sawaal — DukaanFlow" },
      { property: "og:description", content: "DukaanFlow AI assistant (demo)." },
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
  const [messages, setMessages] = useState<Msg[]>([
    {
      id: 1,
      role: "ai",
      text: "Assalam-o-Alaikum! Main DukaanFlow AI hoon. Apne dukaan ke baare mein kuch bhi poochain.",
    },
  ]);
  const [text, setText] = useState("");

  const send = (value: string) => {
    const q = value.trim();
    if (!q) return;
    setMessages((m) => [
      ...m,
      { id: Date.now(), role: "user", text: q },
      {
        id: Date.now() + 1,
        role: "ai",
        text: "Ye demo jawab hai. AI abhi connect nahi hua — backend lagne ke baad asli data se jawab milega.",
      },
    ]);
    setText("");
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
        </div>

        <div className="border-t border-border p-3">
          <div className="-mx-1 mb-2 flex gap-2 overflow-x-auto px-1">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => send(s)}
                className="shrink-0 rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-muted"
              >
                {s}
              </button>
            ))}
          </div>
          <form
            className="flex items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              send(text);
            }}
          >
            <Button type="button" variant="outline" size="icon" className="size-11 shrink-0 rounded-xl">
              <Mic className="size-5" />
            </Button>
            <Input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Apna sawaal likhein..."
              className="h-11 rounded-xl"
            />
            <Button type="submit" size="icon" className="size-11 shrink-0 rounded-xl">
              <Send className="size-5" />
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
