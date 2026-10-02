import clsx from 'clsx'
import type { ButtonHTMLAttributes, ReactNode } from 'react'

/** Category / filter chip. Active chips get the hard shadow. */
export function Chip({
  active, className, children, ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return (
    <button
      {...rest}
      aria-pressed={active}
      className={clsx(
        'min-h-11 rounded-full border-2 border-ink px-4 text-small font-bold whitespace-nowrap cursor-pointer',
        active ? 'bg-ink text-paper-raised press' : 'bg-paper-raised text-ink',
        className,
      )}
    >
      {children}
    </button>
  )
}

export type SlotState = 'open' | 'few' | 'full' | 'past' | 'closed'

/** Pickup slot chip: time + state. Full / past / closed are struck through and disabled. */
export function SlotChip({
  time, state, selected, onClick,
}: { time: string; state: SlotState; selected?: boolean; onClick?: () => void }) {
  const dead = state === 'full' || state === 'past' || state === 'closed'
  const label: ReactNode = state === 'few' ? 'few left' : state === 'full' ? 'full' : state === 'closed' ? 'closed' : null
  return (
    <button
      type="button"
      disabled={dead}
      aria-pressed={selected}
      onClick={onClick}
      className={clsx(
        'flex min-h-14 min-w-[84px] shrink-0 flex-col items-center justify-center rounded-full border-2 px-4 tnum',
        dead
          ? 'border-fog text-fog bg-transparent cursor-not-allowed'
          : selected
            ? 'border-ink bg-ink text-paper-raised press'
            : 'border-ink bg-paper-raised text-ink cursor-pointer',
      )}
    >
      <span className={clsx('text-small font-bold leading-4', dead && 'line-through')}>{time}</span>
      {label && (
        <span className={clsx('text-micro leading-4', state === 'few' && !selected && 'text-tomato-text font-bold')}>
          {label}
        </span>
      )}
    </button>
  )
}
