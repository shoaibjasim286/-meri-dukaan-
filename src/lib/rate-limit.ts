const requests = new Map<string, number[]>();

export function checkRateLimit(
  identifier: string,
  limit: number = 10,
  windowMs: number = 60000,
): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const timestamps = requests.get(identifier) ?? [];
  const recent = timestamps.filter((t) => now - t < windowMs);

  if (recent.length >= limit) {
    return { allowed: false, remaining: 0 };
  }

  recent.push(now);
  requests.set(identifier, recent);
  return { allowed: true, remaining: limit - recent.length };
}
