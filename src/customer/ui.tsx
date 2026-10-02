import clsx from 'clsx'
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { ActiveOrderPill } from '../design'
import { useActiveOrder } from './RecentOrders'

/** Pinned to the bottom of the 440px column (thumb zone). */
export function Dock({ children }: { children: ReactNode }) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 mx-auto w-full max-w-[440px] px-4 pb-[max(16px,env(safe-area-inset-bottom))] pt-8 bg-gradient-to-t from-paper from-75% to-transparent">
      <div className="pointer-events-auto">{children}</div>
    </div>
  )
}

export function Notice({ tone = 'tomato', children, className, role = 'status' }: {
  tone?: 'tomato' | 'ink' | 'leaf'; children: ReactNode; className?: string; role?: string
}) {
  return (
    <div
      role={role}
      className={clsx(
        'rounded-btn border-2 px-4 py-3 text-small font-medium',
        tone === 'tomato' && 'border-tomato-text bg-paper-raised text-tomato-text',
        tone === 'ink' && 'border-ink bg-paper-raised text-ink',
        tone === 'leaf' && 'border-leaf bg-paper-raised text-leaf',
        className,
      )}
    >
      {children}
    </div>
  )
}

/** Active-order pill: shown in the header of every customer screen. */
export function ActivePill() {
  const order = useActiveOrder()
  const nav = useNavigate()
  if (!order) return null
  return <ActiveOrderPill token={order.token} status={order.status} onClick={() => nav(`/order/${order.id}`)} />
}

/** Slim top bar for inner screens. */
export function TopBar({ title, onBack }: { title: string; onBack?: () => void }) {
  return (
    <header className="sticky top-0 z-30 flex min-h-14 items-center gap-2 border-b-2 border-ink bg-paper px-3">
      {onBack && (
        <button type="button" onClick={onBack} aria-label="Back" className="grid size-11 shrink-0 place-items-center rounded-full text-ink cursor-pointer">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 5l-7 7 7 7" /></svg>
        </button>
      )}
      <h1 className="m-0 flex-1 whitespace-nowrap font-display text-[20px] leading-6 text-ink">{title}</h1>
      <ActivePill />
    </header>
  )
}

/** Reserved for weather-driven promos (spec section 15). Renders nothing for now. */
export function PromoBanner() { return null }

export function Spinner({ className }: { className?: string }) {
  return (
    <svg className={clsx('animate-spin', className)} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" aria-hidden>
      <path d="M12 3a9 9 0 1 0 9 9" />
    </svg>
  )
}

export function ReconnectingBar() {
  return (
    <div role="status" className="sticky top-0 z-40 bg-mustard px-4 py-1.5 text-center text-small font-bold text-ink-deep">
      Reconnecting…
    </div>
  )
}
