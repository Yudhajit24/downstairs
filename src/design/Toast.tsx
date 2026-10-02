import { AnimatePresence, motion } from 'motion/react'
import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react'

type ToastItem = { id: number; message: string; actionLabel?: string; onAction?: () => void }
const Ctx = createContext<{ show: (t: Omit<ToastItem, 'id'>, ms?: number) => void } | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])
  const n = useRef(0)
  const show = useCallback((t: Omit<ToastItem, 'id'>, ms = 5000) => {
    const id = ++n.current
    setItems((x) => [...x, { ...t, id }])
    setTimeout(() => setItems((x) => x.filter((i) => i.id !== id)), ms)
  }, [])
  const value = useMemo(() => ({ show }), [show])
  return (
    <Ctx.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex flex-col items-center gap-2 px-4" role="status" aria-live="polite">
        <AnimatePresence>
          {items.map((t) => (
            <motion.div
              key={t.id}
              layout
              initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="pointer-events-auto flex min-h-12 items-center gap-4 rounded-btn border-2 border-ink-deep bg-ink-deep px-4 text-small text-paper-raised shadow-hard-paper"
            >
              <span>{t.message}</span>
              {t.actionLabel && (
                <button
                  className="min-h-11 font-bold text-mustard underline underline-offset-4 cursor-pointer"
                  onClick={() => { t.onAction?.(); setItems((x) => x.filter((i) => i.id !== t.id)) }}
                >
                  {t.actionLabel}
                </button>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </Ctx.Provider>
  )
}

export function useToast() {
  const c = useContext(Ctx)
  if (!c) throw new Error('useToast outside ToastProvider')
  return c.show
}
