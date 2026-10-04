import clsx from 'clsx'
import { useState } from 'react'
import { useToast } from '../design'
import { api } from '../lib/api'

/** A coffee bean: tilted oval with the centre crease. Filled in tomato when chosen, cream when not. */
function Bean({ filled, size = 40 }: { filled: boolean; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" stroke="var(--ink)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <g transform="rotate(35 20 20)">
        <ellipse cx="20" cy="20" rx="11" ry="16" fill={filled ? 'var(--tomato)' : 'var(--paper-raised)'} />
        <path d="M20 5.5c7 4.5-7 9 0 14.5s7 9.5 0 14" />
      </g>
    </svg>
  )
}

const WORDS = ['', 'Not great', 'Meh', 'Good', 'Really good', 'Perfect brew']

/**
 * Tap-to-rate, one to five coffee beans, no typing. Saves straight away; tapping again changes it.
 * `saved` is the rating already on the order (it arrives live), so a reload shows what you gave.
 */
export function BeanRating({ orderId, saved }: { orderId: string; saved: number | null | undefined }) {
  const toast = useToast()
  const [pending, setPending] = useState<number | null>(null)
  const shown = pending ?? saved ?? 0

  async function rate(n: number) {
    if (n === shown && pending === null) return
    setPending(n)
    try {
      await api.rateOrder(orderId, n)
    } catch {
      toast({ message: "Couldn't save your rating. Try again." }, 4000)
    } finally {
      setPending(null) // from here the live order carries the saved value
    }
  }

  return (
    <section aria-label="Rate your order" className="rounded-card border-2 border-ink bg-paper-raised p-3 text-center">
      <p className="m-0 font-display text-[17px] leading-6 text-ink">{shown ? 'Thanks for rating!' : 'How was it?'}</p>
      <div role="radiogroup" aria-label="Rating, 1 to 5 coffee beans" className="mt-1 flex justify-center gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n} type="button" role="radio" aria-checked={shown === n} aria-label={`${n} ${n === 1 ? 'bean' : 'beans'}: ${WORDS[n]}`}
            onClick={() => void rate(n)}
            className={clsx('grid size-12 place-items-center border-0 bg-transparent p-0 cursor-pointer transition-transform active:scale-90', n <= shown && 'scale-105')}
          >
            <Bean filled={n <= shown} />
          </button>
        ))}
      </div>
      <p aria-live="polite" className="mb-0 mt-1 min-h-5 text-small text-ink-deep/80">{shown ? WORDS[shown] : 'Tap a bean'}</p>
    </section>
  )
}
