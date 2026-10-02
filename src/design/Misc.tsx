import clsx from 'clsx'
import { motion } from 'motion/react'
import type { HTMLAttributes } from 'react'
import { STATUS_COLOR, STATUS_LABEL, type OrderStatus } from './StatusStepper'

export function Skeleton({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div {...rest} aria-hidden className={clsx('animate-pulse rounded-btn bg-ink/10', className)} />
}

/** Status pill: colour + text, never colour alone. */
export function StatusPill({ status }: { status: OrderStatus }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-ink-deep bg-paper-raised px-3 py-0.5 text-micro font-bold text-ink-deep">
      <span className="size-2.5 rounded-full border border-ink-deep" style={{ background: STATUS_COLOR[status] }} />
      {STATUS_LABEL[status]}
    </span>
  )
}

/** Sticky cobalt cart bar. */
export function CartBar({ count, total, onClick }: { count: number; total: number; onClick?: () => void }) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      initial={{ y: 80 }} animate={{ y: 0 }} transition={{ type: 'spring', stiffness: 400, damping: 32 }}
      className="press flex min-h-14 w-full items-center justify-between rounded-btn border-2 border-ink-deep bg-ink px-5 text-paper-raised cursor-pointer"
    >
      <span className="text-small font-bold tnum">
        <motion.span key={count} className="inline-block" initial={{ scale: 1.4 }} animate={{ scale: 1 }}>{count}</motion.span>
        {' '}{count === 1 ? 'item' : 'items'} · ₹{total}
      </span>
      <span className="text-small font-bold">Review order →</span>
    </motion.button>
  )
}

/** Active order pill for the header. */
export function ActiveOrderPill({ token, status, onClick }: { token: number; status: OrderStatus; onClick?: () => void }) {
  return (
    <button
      type="button" onClick={onClick}
      className="press inline-flex min-h-11 shrink-0 items-center gap-2 whitespace-nowrap rounded-full border-2 border-ink bg-paper-raised px-3 text-small font-bold text-ink cursor-pointer"
    >
      <span className="size-2.5 rounded-full border border-ink-deep" style={{ background: STATUS_COLOR[status] }} />
      <span className="tnum">#{String(token).padStart(3, '0')} · {STATUS_LABEL[status]} →</span>
    </button>
  )
}

export function OpenPill({ open, label }: { open: boolean; label: string }) {
  return (
    <span className={clsx('inline-flex items-center gap-1.5 rounded-full border-2 px-3 py-0.5 text-micro font-bold', open ? 'border-leaf text-leaf' : 'border-tomato-text text-tomato-text')}>
      <span className={clsx('size-2 rounded-full', open ? 'bg-leaf' : 'bg-tomato')} />
      {label}
    </span>
  )
}
