import { AnimatePresence, motion } from 'motion/react'
import { useEffect, type ReactNode } from 'react'

/** Right-hand drawer for the tablet (Stock, Slots). No hover needed. */
export function Drawer({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <motion.div className="absolute inset-0 bg-ink-deep/70" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
          <motion.aside
            role="dialog" aria-modal="true" aria-label={title}
            className="relative flex h-full w-full max-w-[460px] flex-col border-l-[3px] border-ink-deep bg-paper text-ink-deep"
            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 380, damping: 38 }}
          >
            <header className="flex items-center justify-between border-b-2 border-ink px-5 py-3">
              <h2 className="m-0 font-display text-display-m text-ink">{title}</h2>
              <button type="button" onClick={onClose} className="min-h-14 min-w-14 rounded-btn border-2 border-ink bg-paper-raised text-body font-bold text-ink cursor-pointer">Close</button>
            </header>
            <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  )
}

/** Big toggle switch (56px target). */
export function Switch({ on, onChange, label, disabled }: { on: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <button
      type="button" role="switch" aria-checked={on} aria-label={label} disabled={disabled}
      onClick={() => onChange(!on)}
      className={`relative h-9 w-16 shrink-0 rounded-full border-2 border-ink transition-colors disabled:opacity-50 cursor-pointer ${on ? 'bg-leaf' : 'bg-paper-raised'}`}
    >
      <span className={`absolute top-0.5 size-6 rounded-full border-2 border-ink bg-paper-raised transition-all ${on ? 'left-8' : 'left-0.5'}`} />
      <span className="absolute -inset-2" aria-hidden />
    </button>
  )
}
