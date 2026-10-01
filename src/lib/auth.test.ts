import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import {
  createPinSalt,
  generateSalt,
  getAttemptState,
  getRemainingLockoutSeconds,
  hashPin,
  LOCKOUT_MS,
  MAX_ATTEMPTS,
  recordFailedAttempt,
  resetAttempts,
  verifyPin,
} from "@/lib/auth";

const BASE_TIME = new Date("2026-10-01T05:00:00.000Z");

beforeEach(() => {
  localStorage.clear();
  vi.useFakeTimers();
  vi.setSystemTime(BASE_TIME);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("hashPin", () => {
  it("returns the same hash for the same PIN and salt", async () => {
    const first = await hashPin("1234", "salt-a");
    const second = await hashPin("1234", "salt-a");

    expect(first).toBe(second);
  });

  it("returns a different hash for a different PIN", async () => {
    const first = await hashPin("1234", "salt-a");
    const second = await hashPin("5678", "salt-a");

    expect(first).not.toBe(second);
  });

  it("returns a different hash for a different salt", async () => {
    const first = await hashPin("1234", "salt-a");
    const second = await hashPin("1234", "salt-b");

    expect(first).not.toBe(second);
  });

  it("returns a 64-character hexadecimal SHA-256 hash", async () => {
    const result = await hashPin("1234", "salt-a");

    expect(result).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe("verifyPin", () => {
  it("returns true for the correct PIN", async () => {
    const hash = await hashPin("1234", "salt-a");

    await expect(verifyPin("1234", "salt-a", hash)).resolves.toBe(true);
  });

  it("returns false for a wrong PIN", async () => {
    const hash = await hashPin("1234", "salt-a");

    await expect(verifyPin("9999", "salt-a", hash)).resolves.toBe(false);
  });

  it("returns false for an empty PIN against a real PIN hash", async () => {
    const hash = await hashPin("1234", "salt-a");

    await expect(verifyPin("", "salt-a", hash)).resolves.toBe(false);
  });

  it("returns false for null or undefined PIN values", async () => {
    const hash = await hashPin("1234", "salt-a");

    await expect(
      verifyPin(null as unknown as string, "salt-a", hash),
    ).resolves.toBe(false);
    await expect(
      verifyPin(undefined as unknown as string, "salt-a", hash),
    ).resolves.toBe(false);
  });
});

describe("generateSalt", () => {
  it("returns a 32-character hexadecimal salt", () => {
    const salt = generateSalt();

    expect(salt).toMatch(/^[0-9a-f]{32}$/);
  });

  it("returns different salts on separate calls", () => {
    expect(generateSalt()).not.toBe(generateSalt());
  });
});

describe("createPinSalt", () => {
  it("contains the staff ID, fixed salt, and 32-character random suffix", () => {
    const result = createPinSalt("staff-123");
    const parts = result.split(":");

    expect(parts[0]).toBe("staff-123");
    expect(parts[1]).toBe("meri-dukaan-pin-v1");
    expect(parts[2]).toMatch(/^[0-9a-f]{32}$/);
  });

  it("creates different salts for different staff", () => {
    expect(createPinSalt("staff-1")).not.toBe(createPinSalt("staff-2"));
  });
});

describe("lockout logic", () => {
  it("locks after MAX_ATTEMPTS and uses a 30-second lockout", () => {
    expect(MAX_ATTEMPTS).toBe(5);
    expect(LOCKOUT_MS).toBe(30_000);

    for (let index = 0; index < MAX_ATTEMPTS; index += 1) {
      recordFailedAttempt("staff-locked");
    }

    const state = getAttemptState("staff-locked");

    expect(state.count).toBe(5);
    expect(state.lockedUntil).toBe(Date.now() + LOCKOUT_MS);
    expect(getRemainingLockoutSeconds("staff-locked")).toBe(30);
  });

  it("resetAttempts clears failed attempts after a successful login", () => {
    recordFailedAttempt("staff-reset");
    recordFailedAttempt("staff-reset");
    recordFailedAttempt("staff-reset");

    expect(getAttemptState("staff-reset").count).toBe(3);

    resetAttempts("staff-reset");

    expect(getAttemptState("staff-reset")).toEqual({
      count: 0,
      lockedUntil: null,
    });
  });

  it("clears the lockout after 30 seconds have elapsed", () => {
    for (let index = 0; index < MAX_ATTEMPTS; index += 1) {
      recordFailedAttempt("staff-expiry");
    }

    expect(getRemainingLockoutSeconds("staff-expiry")).toBe(30);

    vi.advanceTimersByTime(LOCKOUT_MS);

    expect(getAttemptState("staff-expiry")).toEqual({
      count: 0,
      lockedUntil: null,
    });
    expect(getRemainingLockoutSeconds("staff-expiry")).toBe(0);
  });
});
