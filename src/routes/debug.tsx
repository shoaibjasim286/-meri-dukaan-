import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Copy, Download, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/dukaan/primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { debugLog, type LogEntry } from "@/lib/debug-log";
import { hasPermission } from "@/lib/permissions";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/debug")({
  head: () => ({
    meta: [{ title: "Debug Console — Meri Dukaan" }],
  }),
  component: DebugPage,
});

type Filter = "all" | "success" | "error" | "warning" | "info";

function DebugPage() {
  const { currentStaff } = useStore();
  const [logs, setLogs] = useState(debugLog.getAll());
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");

  const canView = hasPermission(currentStaff, "debug.view");

  useEffect(() => {
    return debugLog.subscribe(() => {
      setLogs(debugLog.getAll());
    });
  }, []);

  const filtered = logs.filter((log) => {
    if (filter !== "all" && log.level !== filter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        log.message.toLowerCase().includes(q) ||
        log.category.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleDownload = () => {
    const blob = new Blob([debugLog.export()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `meri-dukaan-logs-${new Date().toISOString().slice(0, 19)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(debugLog.export());
  };

  const handleClear = () => {
    if (confirm("Saare logs delete karein?")) {
      debugLog.clear();
    }
  };

  if (!canView) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-lg font-bold">Permission Nahi Hai</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Debug console dekhne ki ijazat nahi hai.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader title="Debug Console" subtitle="App ke saare logs yahan dikhenge" />

      <div className="flex flex-wrap gap-2">
        {(["all", "success", "error", "warning", "info"] as Filter[]).map((f) => {
          const count = f === "all" ? logs.length : logs.filter((l) => l.level === f).length;
          return (
            <Button
              key={f}
              variant={filter === f ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter(f)}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)} ({count})
            </Button>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-2">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search logs..."
          className="min-w-[200px] flex-1"
        />
        <Button onClick={handleDownload} variant="outline" size="sm">
          <Download className="mr-2 h-4 w-4" />
          Download
        </Button>
        <Button onClick={() => void handleCopy()} variant="outline" size="sm">
          <Copy className="mr-2 h-4 w-4" />
          Copy
        </Button>
        <Button onClick={handleClear} variant="destructive" size="sm">
          <Trash2 className="mr-2 h-4 w-4" />
          Clear
        </Button>
      </div>

      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            {logs.length === 0
              ? "Abhi koi logs nahi hain. App use karo — logs appear honge."
              : "Filter se koi match nahi mila"}
          </div>
        ) : (
          filtered.map((log) => <LogEntryRow key={log.id} log={log} />)
        )}
      </div>
    </div>
  );
}

function LogEntryRow({ log }: { log: LogEntry }) {
  const [expanded, setExpanded] = useState(false);

  const colorClass = {
    success: "border-l-green-500 bg-green-50 dark:bg-green-950/20",
    error: "border-l-red-500 bg-red-50 dark:bg-red-950/20",
    warning: "border-l-amber-500 bg-amber-50 dark:bg-amber-950/20",
    info: "border-l-blue-500 bg-blue-50 dark:bg-blue-950/20",
    debug: "border-l-gray-500 bg-gray-50 dark:bg-gray-950/20",
  }[log.level];

  return (
    <div
      className={cn("cursor-pointer rounded-lg border border-l-4 p-3", colorClass)}
      onClick={() => setExpanded((value) => !value)}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="rounded bg-foreground/10 px-2 py-0.5 text-xs font-bold">
              {log.category}
            </span>
            <span className="text-xs font-bold uppercase">{log.level}</span>
          </div>
          <p className="mt-1 text-sm">{log.message}</p>
        </div>
        <span className="whitespace-nowrap text-xs text-muted-foreground">
          {new Date(log.timestamp).toLocaleTimeString()}
        </span>
      </div>

      {expanded && log.details != null && (
        <pre className="mt-2 overflow-auto rounded bg-background p-2 text-xs">
          {JSON.stringify(log.details, null, 2)}
        </pre>
      )}
    </div>
  );
}
