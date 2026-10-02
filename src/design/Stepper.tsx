import clsx from 'clsx'
import { AnimatePresence, motion } from 'motion/react'

/** Quantity stepper. At qty 0 it is the "Add" button; the button morphs into the stepper. */
export function QtyStepper({
  qty, onChange, min = 0, max = 99, addLabel = 'Add', label,
}: { qty: number; onChange: (n: number) => void; min?: number; max?: number; addLabel?: string; label: string }) {
  const btn = 'grid size-11 place-items-center text-body font-bold cursor-pointer disabled:opacity-40 text-paper-raised'
  const spring = { type: 'spring' as const, stiffness: 500, damping: 30 }
  return (
    <div className="h-11 min-w-[88px]">
      <AnimatePresence mode="popLayout" initial={false}>
        {qty <= 0 ? (
          <motion.button
            key="add"
            type="button"
            aria-label={`Add ${label}`}
            onClick={() => onChange(1)}
            initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }}
            transition={spring}
            className="press h-11 w-full rounded-btn border-2 border-ink bg-paper-raised px-4 text-small font-bold text-ink cursor-pointer"
          >
            {addLabel}
          </motion.button>
        ) : (
          <motion.div
            key="step"
            role="group"
            aria-label={`${label} quantity`}
            initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }}
            transition={spring}
            className="flex h-11 items-center rounded-btn border-2 border-ink bg-ink text-paper-raised shadow-hard"
          >
            <button type="button" aria-label={`Remove one ${label}`} className={btn} onClick={() => onChange(Math.max(min, qty - 1))}>−</button>
            <motion.span key={qty} initial={{ y: -6, scale: 1.3 }} animate={{ y: 0, scale: 1 }} className="min-w-5 text-center text-small font-bold tnum">{qty}</motion.span>
            <button type="button" aria-label={`Add one more ${label}`} disabled={qty >= max} className={btn} onClick={() => onChange(Math.min(max, qty + 1))}>+</button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/** Segmented control, e.g. sugar level. */
export function Segmented<T extends string>({
  value, options, onChange, label,
}: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="flex rounded-btn border-2 border-ink bg-paper-raised p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={clsx(
            'min-h-11 flex-1 rounded-[10px] text-small font-bold cursor-pointer',
            value === o.value ? 'bg-ink text-paper-raised' : 'text-ink',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
