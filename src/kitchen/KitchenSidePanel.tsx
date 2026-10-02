import { useState } from 'react'

/** Reserved for the future "paste from WhatsApp" tool (spec 5.6). Collapsed and empty for now. */
export function KitchenSidePanel() {
  const [open, setOpen] = useState(false)
  return (
    <aside className="fixed right-0 top-1/2 z-30 flex -translate-y-1/2 items-stretch" aria-label="Tools">
      {open && (
        <div className="flex h-72 w-72 flex-col justify-between rounded-l-card border-[3px] border-r-0 border-ink-deep bg-paper p-4 text-ink-deep">
          <p className="m-0 font-display text-display-m text-ink">Tools</p>
          <p className="m-0 text-small">Nothing here yet. The WhatsApp paste tool will live in this panel.</p>
          <button type="button" className="min-h-14 rounded-btn border-2 border-ink bg-paper-raised font-bold text-ink cursor-pointer" onClick={() => setOpen(false)}>Collapse</button>
        </div>
      )}
      {!open && (
        <button
          type="button" onClick={() => setOpen(true)} aria-expanded={false} aria-label="Open tools panel"
          className="flex w-8 items-center justify-center rounded-l-btn border-[3px] border-r-0 border-ink-deep bg-paper py-8 [writing-mode:vertical-rl] font-bold text-small text-ink cursor-pointer"
        >
          Tools
        </button>
      )}
    </aside>
  )
}
