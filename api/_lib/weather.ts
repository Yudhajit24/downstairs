import { CAFE_COORDS } from '../../shared/constants.js'
import type { WeatherNow } from '../../shared/suggest.js'

// Open-Meteo needs no key. A 10 minute in-memory cache keeps us far below its free limits however many
// customers (or assist calls) ask. Any upstream failure resolves to null and callers simply skip weather.
let cache: { at: number; value: WeatherNow } | null = null
const TTL_MS = 10 * 60_000

export async function fetchWeather(fetchImpl: typeof fetch = fetch): Promise<WeatherNow | null> {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${CAFE_COORDS.lat}&longitude=${CAFE_COORDS.lon}&current=temperature_2m,precipitation,weather_code&timezone=Asia%2FKolkata`
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 4000)
  try {
    const r = await fetchImpl(url, { signal: ctrl.signal })
    if (!r.ok) return null
    const j = (await r.json()) as { current?: { temperature_2m?: number; precipitation?: number; weather_code?: number } }
    const c = j.current
    if (!c || typeof c.temperature_2m !== 'number' || typeof c.weather_code !== 'number') return null
    return { tempC: c.temperature_2m, precipMm: c.precipitation ?? 0, code: c.weather_code }
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

export function resetWeatherCache() { cache = null }

/** Cached current weather, or null when unknown. */
export async function currentWeather(): Promise<WeatherNow | null> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.value
  const w = await fetchWeather()
  if (w) cache = { at: Date.now(), value: w }
  return w
}

