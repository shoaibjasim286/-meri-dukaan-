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
