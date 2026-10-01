export type LogLevel = "success" | "error" | "warning" | "info" | "debug";

export interface LogEntry {
  id: string;
  timestamp: string;
  level: LogLevel;
  category: string;
  message: string;
  details?: unknown;
}

const DEBUG_STORAGE_KEY = "meri-dukaan-debug-logs";
const MAX_LOGS = 500;

class DebugLogger {
  private logs: LogEntry[] = [];
  private listeners = new Set<() => void>();

  constructor() {
    this.load();
  }

  private load() {
    try {
      const stored = localStorage.getItem(DEBUG_STORAGE_KEY);
      if (!stored) return;
      const parsed: unknown = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        this.logs = parsed.slice(0, MAX_LOGS) as LogEntry[];
      }
    } catch (error) {
      console.error("[Debug] Failed to load logs", error);
    }
  }

  private persist() {
    try {
      localStorage.setItem(DEBUG_STORAGE_KEY, JSON.stringify(this.logs));
    } catch (error) {
      console.error("[Debug] Failed to save logs", error);
    }
  }

  log(level: LogLevel, category: string, message: string, details?: unknown) {
    const entry: LogEntry = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      level,
      category,
      message,
      details,
    };

    this.logs.unshift(entry);
    if (this.logs.length > MAX_LOGS) {
      this.logs = this.logs.slice(0, MAX_LOGS);
    }

    const consoleMethod =
      level === "error" ? "error" : level === "warning" ? "warn" : "log";
    console[consoleMethod](`[${category}] ${message}`, details ?? "");

    this.persist();
    this.listeners.forEach((fn) => fn());
  }

  success(category: string, message: string, details?: unknown) {
    this.log("success", category, message, details);
  }

  error(category: string, message: string, details?: unknown) {
    this.log("error", category, message, details);
  }

  warning(category: string, message: string, details?: unknown) {
    this.log("warning", category, message, details);
  }

  info(category: string, message: string, details?: unknown) {
    this.log("info", category, message, details);
  }

  debug(category: string, message: string, details?: unknown) {
    this.log("debug", category, message, details);
  }

  getAll(): LogEntry[] {
    return [...this.logs];
  }

  clear() {
    this.logs = [];
    this.persist();
    this.listeners.forEach((fn) => fn());
  }

  subscribe(fn: () => void) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  export(): string {
    return JSON.stringify(this.logs, null, 2);
  }
}

export const debugLog = new DebugLogger();
