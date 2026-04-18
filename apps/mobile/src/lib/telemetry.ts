import * as SecureStore from "expo-secure-store"

const TELEMETRY_KEY = "aurea_mobile_telemetry_events"
const MAX_EVENTS = 60

export type TelemetryEvent = {
  id: string
  level: "info" | "warning" | "error"
  category: string
  message: string
  timestamp: string
}

const readEvents = async (): Promise<TelemetryEvent[]> => {
  try {
    const raw = await SecureStore.getItemAsync(TELEMETRY_KEY)
    if (!raw) return []
    return JSON.parse(raw) as TelemetryEvent[]
  } catch {
    return []
  }
}

const writeEvents = async (events: TelemetryEvent[]) => {
  try {
    await SecureStore.setItemAsync(TELEMETRY_KEY, JSON.stringify(events.slice(0, MAX_EVENTS)))
  } catch {
    // best-effort
  }
}

export const telemetry = {
  async track(level: TelemetryEvent["level"], category: string, message: string) {
    const event: TelemetryEvent = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      level,
      category,
      message,
      timestamp: new Date().toISOString(),
    }
    const current = await readEvents()
    await writeEvents([event, ...current])
  },

  async list() {
    return readEvents()
  },

  async clear() {
    await writeEvents([])
  },
}