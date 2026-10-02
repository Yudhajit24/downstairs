import { motion } from 'motion/react'

export type OrderStatus = 'new' | 'preparing' | 'ready' | 'picked_up' | 'cancelled'

export const STATUS_COLOR: Record<OrderStatus, string> = {
  new: 'var(--tomato)', preparing: 'var(--mustard)', ready: 'var(--leaf)', picked_up: 'var(--fog)', cancelled: 'var(--fog)',
}
export const STATUS_LABEL: Record<OrderStatus, string> = {
  new: 'New', preparing: 'Preparing', ready: 'Ready', picked_up: 'Picked up', cancelled: 'Cancelled',
}
const STEPS: OrderStatus[] = ['new', 'preparing', 'ready', 'picked_up']
const LINE = 'M36 22 C 60 17, 84 28, 124 22 S 180 17, 212 23 S 276 20, 300 22'

/** Four dots joined by a hand-drawn line. Current step wears its status colour. */
export function StatusStepper({ status }: { status: Exclude<OrderStatus, 'cancelled'> }) {
  const cur = STEPS.indexOf(status)
  const x = (i: number) => 36 + i * 88
  return (
    <figure className="m-0" aria-label={`Order status: ${STATUS_LABEL[status]}`}>
      <svg viewBox="0 0 336 64" className="w-full" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path d={LINE} stroke="var(--fog)" strokeWidth="2.5" strokeDasharray="1 7" />
        <motion.path
          d={LINE} stroke="var(--ink)" strokeWidth="3"
          initial={false}
          animate={{ pathLength: cur / 3 }}
          transition={{ type: 'spring', stiffness: 120, damping: 20 }}
        />
        {STEPS.map((s, i) => {
          const done = i < cur, now = i === cur
          return (
            <g key={s}>
              <circle cx={x(i)} cy={22} r={now ? 12 : 9} fill={now ? STATUS_COLOR[s] : done ? 'var(--ink)' : 'var(--paper-raised)'} stroke="var(--ink)" strokeWidth="2.5" />
              {done && <path d={`M${x(i) - 4} 22l3 3 5-6`} stroke="var(--paper-raised)" strokeWidth="2.5" />}
              <text x={x(i)} y={56} textAnchor="middle" fontSize="12" fontFamily="DM Sans" fontWeight={now ? 700 : 500} fill={now ? 'var(--ink-deep)' : 'var(--fog)'} stroke="none">
                {STATUS_LABEL[s]}
              </text>
            </g>
          )
        })}
      </svg>
    </figure>
  )
}
