import { TZDate } from '@date-fns/tz'
import { TIMEZONE } from './constants.js'
import { isQuickAddable } from './pricing.js'
import { nextBookableSlots } from './slots.js'
import type { CafeSettings, MenuItem, SlotDoc } from './types.js'

export interface WeatherNow { tempC: number; precipMm: number; code: number }
export type Mood = 'rainy' | 'hot' | 'cool' | 'mild'
export type MenuRow = MenuItem & { id: string }

// WMO weather codes for drizzle, rain, showers and thunderstorms.
const RAIN_CODES = new Set([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99])

export function weatherMood(w: WeatherNow): Mood {
  if (RAIN_CODES.has(w.code) || w.precipMm >= 0.2) return 'rainy'
  if (w.tempC >= 32) return 'hot'
  if (w.tempC <= 20) return 'cool'
  return 'mild'
}

/** Demo control: pretend the weather is something else, so the weather-aware features can be shown on demand. */
export type WeatherSim = 'rain' | 'hot' | 'cool'
export const WEATHER_SIMS: Record<WeatherSim, WeatherNow> = {
  rain: { tempC: 24, precipMm: 2.4, code: 63 },
  hot: { tempC: 36, precipMm: 0, code: 0 },
  cool: { tempC: 17, precipMm: 0, code: 3 },
}

/** Human label for the weather chip, e.g. "Rain · 24°C". */
export function weatherLabel(w: WeatherNow): string {
  const t = `${Math.round(w.tempC)}°C`
  switch (weatherMood(w)) {
    case 'rainy': return `Rain · ${t}`
    case 'hot': return `Hot · ${t}`
    case 'cool': return `Chilly · ${t}`
    default: return `Pleasant · ${t}`
  }
}

/** A short banner line, only when the weather is worth a mention (otherwise null, and no banner shows). */
export function weatherBanner(w: WeatherNow): string | null {
  switch (weatherMood(w)) {
    case 'rainy': return "Rainy out there. Perfect chai weather."
    case 'hot': return `${Math.round(w.tempC)}°C outside. Something cold?`
    case 'cool': return "Bit chilly out. Something hot?"
    default: return null
  }
}

/** How full the next few bookable slots are (0..1). `known` is false when no slot is left today. */
export function kitchenLoad(a: { settings: CafeSettings; slots: Record<string, SlotDoc | undefined>; now: Date }) {
  const next = nextBookableSlots({ ...a, units: 1, limit: 3 })
  if (next.length === 0) return { load: 0, busy: false, known: false }
  const cap = a.settings.slotCapacityUnits
  const load = next.reduce((n, s) => n + (a.slots[s.slotId]?.usedUnits ?? 0) / cap, 0) / next.length
  return { load, busy: load >= 0.6, known: true }
}

export interface RightNow { headline: string; reason: string; items: MenuRow[] }

const MAX_PICKS = 3
const MAX_PER_CATEGORY = 2

/**
 * Up to three "right now" picks, ranked by weather, IST time of day and how busy the kitchen is.
 *  - rain/cool lifts hot drinks, heat lifts cold drinks
 *  - morning lifts breakfast, evening lifts bakes
 *  - when the next slots are filling up, grab-and-go items (0 prep units) come first
 * Sold-out items are never suggested. At most two per category, so the row has some variety.
 */
export function rightNow(a: {
  now: Date; menu: MenuRow[]; weather?: WeatherNow | null; busy?: boolean
}): RightNow | null {
  const hour = new TZDate(a.now.getTime(), TIMEZONE).getHours()
  const mood = a.weather ? weatherMood(a.weather) : 'mild'
  const pool = a.menu.filter((m) => m.available && (m.stock === null || m.stock > 0) && isQuickAddable(m))
  if (pool.length === 0) return null

  const score = (m: MenuRow) => {
    let s = 0
    if (mood === 'rainy' || mood === 'cool') { if (m.tags.includes('hot')) s += 3 }
    if (mood === 'hot') { if (m.tags.includes('cold')) s += 3 }
    if (hour < 11) { if (m.category === 'breakfast') s += 2; if (m.category === 'hot') s += 1 }
    else if (hour < 17) { if (m.category === 'cold') s += 1; if (m.tags.includes('light') || m.tags.includes('protein')) s += 1 }
    else { if (m.category === 'bakes') s += 1; if (m.category === 'hot') s += 1 }
    if (a.busy) { if (m.prepUnits === 0) s += 3; else if (m.prepUnits === 1) s += 1; else s -= 2 }
    return s
  }

  const ranked = [...pool].sort((x, y) => score(y) - score(x) || x.sortOrder - y.sortOrder)
  const picks: MenuRow[] = []
  const perCat: Record<string, number> = {}
  for (const m of ranked) {
    if ((perCat[m.category] ?? 0) >= MAX_PER_CATEGORY) continue
    picks.push(m); perCat[m.category] = (perCat[m.category] ?? 0) + 1
    if (picks.length === MAX_PICKS) break
  }

  const headline = a.busy ? "Kitchen's busy. Grab and go:"
    : mood === 'rainy' ? 'Rain outside. Something hot?'
    : mood === 'hot' ? 'Hot out there. Something cold?'
    : mood === 'cool' ? 'Bit chilly. Chai time?'
    : hour < 11 ? 'Good with your morning:' : hour < 17 ? 'Right now:' : 'For the evening:'
  const reason = a.busy ? 'The next pickup slots are filling up. Bakes need no wait.' : ''
  return { headline, reason, items: picks }
}
