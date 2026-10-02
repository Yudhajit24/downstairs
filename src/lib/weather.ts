import { useEffect, useState } from 'react'
import type { WeatherNow } from '../../shared/suggest'

/** Current weather for the café, refreshed every 15 minutes. null = unknown (suggestions just skip weather). */
export function useWeather(): WeatherNow | null {
  const [w, setW] = useState<WeatherNow | null>(null)
  useEffect(() => {
    let alive = true
    const load = () =>
      fetch('/api/weather')
        .then((r) => (r.ok ? r.json() : null))
        .then((j) => { if (alive) setW(j?.weather ?? null) })
        .catch(() => { if (alive) setW(null) })
    load()
    const t = setInterval(load, 15 * 60_000)
    return () => { alive = false; clearInterval(t) }
  }, [])
  return w
}
