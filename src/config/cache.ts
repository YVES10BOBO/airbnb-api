const cache = new Map<string, { value: unknown; expiresAt: number }>();

export function getCache<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.value as T;
}

export function setCache(key: string, value: unknown, ttlSeconds: number): void {
  cache.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
}

export function deleteCache(key: string): void {
  cache.delete(key);
}

export function deleteCacheByPrefix(prefix: string): void {
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) cache.delete(key);
  }
}
