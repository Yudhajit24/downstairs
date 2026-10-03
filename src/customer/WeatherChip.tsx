import { WEATHER_SIMS, weatherLabel, type WeatherNow, type WeatherSim } from '../../shared/suggest'

const SIMS: { id: WeatherSim | null; label: string }[] = [
  { id: null, label: 'Live' }, { id: 'rain', label: 'Rain' }, { id: 'hot', label: 'Hot' }, { id: 'cool', label: 'Chilly' },
]

/**
 * Shows the weather the menu is using and where it came from (Open-Meteo, live). In demo mode a reviewer can
 * switch to a simulated rain / heat / chill and watch the picks and banner react, without waiting for real weather.
 */
export function WeatherChip({ live, sim, onSim, demo }: { live: WeatherNow | null; sim: WeatherSim | null; onSim: (s: WeatherSim | null) => void; demo: boolean }) {
  const shown = sim ? WEATHER_SIMS[sim] : live
  if (!shown && !demo) return null
  return (
    <section aria-label="Weather" className="rounded-card border-2 border-ink bg-paper-raised px-3 py-2">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <p className="m-0 text-small font-bold">
          {shown ? weatherLabel(shown) : 'Weather unavailable'}
          <span className="font-normal text-ink-deep/80">{sim ? ' · simulated' : shown ? ' · live from Open-Meteo' : ''}</span>
        </p>
        <p className="m-0 text-micro text-ink-deep/70">Picks below follow it</p>
      </div>
      {demo && (
        <div className="mt-1.5 flex flex-wrap items-center gap-2" role="group" aria-label="Demo: simulate weather">
          <span className="text-micro font-bold uppercase tracking-wide text-ink-deep/70">Demo</span>
          {SIMS.map((s) => (
            <button key={s.label} type="button" aria-pressed={sim === s.id} onClick={() => onSim(s.id)}
              className={`min-h-11 rounded-full border-2 border-ink px-3 text-small font-bold cursor-pointer ${sim === s.id ? 'bg-ink text-paper' : 'bg-paper text-ink'}`}>
              {s.label}
            </button>
          ))}
        </div>
      )}
    </section>
  )
}
