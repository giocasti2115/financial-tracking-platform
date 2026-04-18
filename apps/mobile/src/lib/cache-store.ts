import * as SecureStore from "expo-secure-store"

type CachedRecord<T> = {
  value: T
  updatedAt: string
}

const keyFor = (scope: string) => `aurea_cache_${scope}`

export const cacheStore = {
  async get<T>(scope: string): Promise<CachedRecord<T> | null> {
    try {
      const raw = await SecureStore.getItemAsync(keyFor(scope))
      if (!raw) return null
      return JSON.parse(raw) as CachedRecord<T>
    } catch {
      return null
    }
  },

  async set<T>(scope: string, value: T): Promise<void> {
    try {
      const payload: CachedRecord<T> = {
        value,
        updatedAt: new Date().toISOString(),
      }
      await SecureStore.setItemAsync(keyFor(scope), JSON.stringify(payload))
    } catch {
      // no-op: cache is best-effort
    }
  },

  async clear(scope: string): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(keyFor(scope))
    } catch {
      // no-op
    }
  },
}