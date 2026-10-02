import { beforeEach, describe, expect, it, vi } from "vitest";
import { debugLog } from "@/lib/debug-log";

describe("DebugLogger", () => {
  beforeEach(() => {
    debugLog.clear();
  });

  it("success() creates a success log", () => {
    debugLog.success("Test", "Success message");

    const [entry] = debugLog.getAll();
    expect(entry.level).toBe("success");
    expect(entry.category).toBe("Test");
    expect(entry.message).toBe("Success message");
  });

  it("error() creates an error log", () => {
    debugLog.error("Test", "Error message");

    expect(debugLog.getAll()[0].level).toBe("error");
  });

  it("warning() creates a warning log", () => {
    debugLog.warning("Test", "Warning message");

    expect(debugLog.getAll()[0].level).toBe("warning");
  });

  it("info() creates an info log", () => {
    debugLog.info("Test", "Info message");

    expect(debugLog.getAll()[0].level).toBe("info");
  });

  it("log() accepts a custom debug level", () => {
    debugLog.log("debug", "Test", "Debug message");

    expect(debugLog.getAll()[0].level).toBe("debug");
  });

  it("getAll() returns all logs with newest first", () => {
    debugLog.info("Test", "First");
    debugLog.info("Test", "Second");

    const logs = debugLog.getAll();
    expect(logs).toHaveLength(2);
    expect(logs.map((log) => log.message)).toEqual(["Second", "First"]);
  });

  it("getAll() is empty after a fresh clear", () => {
    expect(debugLog.getAll()).toEqual([]);
  });

  it("clear() removes all logs", () => {
    debugLog.info("Test", "First");
    debugLog.error("Test", "Second");

    debugLog.clear();

    expect(debugLog.getAll()).toEqual([]);
  });

  it("keeps only the newest 500 logs and removes the oldest", () => {
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);

    for (let index = 0; index < 501; index += 1) {
      debugLog.info("Limit", `Log ${index}`);
    }

    const logs = debugLog.getAll();
    expect(logs).toHaveLength(500);
    expect(logs[0].message).toBe("Log 500");
    expect(logs.at(-1)?.message).toBe("Log 1");
    expect(logs.some((log) => log.message === "Log 0")).toBe(false);

    consoleSpy.mockRestore();
  });

  it("subscribe() calls the listener when a new log is added", () => {
    const listener = vi.fn();
    const unsubscribe = debugLog.subscribe(listener);

    debugLog.info("Test", "Subscribed");

    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
  });

  it("unsubscribe() stops future listener notifications", () => {
    const listener = vi.fn();
    const unsubscribe = debugLog.subscribe(listener);

    unsubscribe();
    debugLog.info("Test", "Not notified");

    expect(listener).not.toHaveBeenCalled();
  });

  it("export() returns parseable JSON with the expected entry structure and unique ids", () => {
    debugLog.info("Export", "First", { value: 1 });
    debugLog.error("Export", "Second", { value: 2 });

    const exported = debugLog.export();
    const parsed = JSON.parse(exported);

    expect(typeof exported).toBe("string");
    expect(parsed).toHaveLength(2);
    expect(parsed[0]).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        timestamp: expect.any(String),
        level: "error",
        category: "Export",
        message: "Second",
      }),
    );
    expect(parsed[1]).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        timestamp: expect.any(String),
        level: "info",
        category: "Export",
        message: "First",
      }),
    );
    expect(parsed[0].id).not.toBe(parsed[1].id);
  });
});
