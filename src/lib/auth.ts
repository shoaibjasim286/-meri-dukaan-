const FIXED_PIN_SALT = "meri-dukaan-pin-v1";

function assertBrowserCrypto(): void {
  if (typeof window === "undefined" || !window.crypto?.subtle) {
    throw new Error("Browser crypto unavailable");
  }
}

export function generateSalt(): string {
  assertBrowserCrypto();
  const arr = new Uint8Array(16);
  window.crypto.getRandomValues(arr);
  return Array.from(arr)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function hashPin(pin: string, salt: string): Promise<string> {
  assertBrowserCrypto();
  const data = new TextEncoder().encode(pin + salt);
  const hashBuffer = await window.crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function verifyPin(
  pin: string,
  salt: string,
  hash: string,
): Promise<boolean> {
  const computed = await hashPin(pin, salt);
  return computed === hash;
}

export function createPinSalt(staffId: string): string {
  return staffId + ":" + FIXED_PIN_SALT + ":" + generateSalt();
}

export const MAX_ATTEMPTS = 5;
export const LOCKOUT_MS = 30 * 1000;
const ATTEMPTS_KEY = "meri-dukaan-pin-attempts";

interface AttemptState {
  [staffId: string]: {
    count: number;
    lockedUntil: number | null;
  };
}

export function getAttemptState(staffId: string): {
  count: number;
  lockedUntil: number | null;
} {
  try {
    const raw = localStorage.getItem(ATTEMPTS_KEY);
    const parsed: AttemptState = raw ? JSON.parse(raw) : {};
    const state = parsed[staffId] ?? { count: 0, lockedUntil: null };

    if (state.lockedUntil && state.lockedUntil <= Date.now()) {
      delete parsed[staffId];
      localStorage.setItem(ATTEMPTS_KEY, JSON.stringify(parsed));
      return { count: 0, lockedUntil: null };
    }

    return state;
  } catch {
    return { count: 0, lockedUntil: null };
  }
}

export function recordFailedAttempt(staffId: string): {
  count: number;
  lockedUntil: number | null;
} {
  const current = getAttemptState(staffId);
  const nextCount = current.count + 1;
  const lockedUntil =
    nextCount >= MAX_ATTEMPTS ? Date.now() + LOCKOUT_MS : null;

  try {
    const raw = localStorage.getItem(ATTEMPTS_KEY);
    const all: AttemptState = raw ? JSON.parse(raw) : {};
    all[staffId] = { count: nextCount, lockedUntil };
    localStorage.setItem(ATTEMPTS_KEY, JSON.stringify(all));
  } catch {
    /* ignore */
  }

  return { count: nextCount, lockedUntil };
}

export function resetAttempts(staffId: string): void {
  try {
    const raw = localStorage.getItem(ATTEMPTS_KEY);
    const all: AttemptState = raw ? JSON.parse(raw) : {};
    delete all[staffId];
    localStorage.setItem(ATTEMPTS_KEY, JSON.stringify(all));
  } catch {
    /* ignore */
  }
}

export function getRemainingLockoutSeconds(staffId: string): number {
  const state = getAttemptState(staffId);
  if (!state.lockedUntil) return 0;
  const remaining = state.lockedUntil - Date.now();
  return remaining > 0 ? Math.ceil(remaining / 1000) : 0;
}
