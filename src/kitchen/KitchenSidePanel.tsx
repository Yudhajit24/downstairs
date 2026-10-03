import { useState } from 'react'
import { ApiClientError, type BriefResponse } from '../lib/api'
import { kitchenBrief } from './staff'

/** Tools drawer. Holds the AI briefing: a short "what to do next" built from today's live orders and stock. */
export function KitchenSidePanel() {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [brief, setBrief] = useState<BriefResponse | null>(null)

  async function run() {
    if (busy) return
    setBusy(true); setError('')
    try { setBrief(await kitchenBrief()) }
    catch (e) { setError(e instanceof ApiClientError && e.code === 'RATE_LIMITED' ? e.message : "Couldn't brief just now.") }
    finally { setBusy(false) }
  }

  return (
    <aside className="fixed right-0 top-1/2 z-30 flex -translate-y-1/2 items-stretch" aria-label="Tools">
      {open && (
        <div className="flex max-h-[80vh] w-80 flex-col gap-3 overflow-y-auto rounded-l-card border-[3px] border-r-0 border-ink-deep bg-paper p-4 text-ink-deep">
          <p className="m-0 font-display text-display-m text-ink">Shift brief</p>
          <button type="button" disabled={busy} onClick={() => void run()}
            className="press min-h-14 rounded-btn border-2 border-ink bg-tomato font-bold text-paper cursor-pointer disabled:opacity-60">
            {busy ? 'Thinking…' : brief ? 'Refresh brief' : 'Brief me'}
          </button>
          <div aria-live="polite">
            {error && <p role="alert" className="m-0 text-small font-bold text-tomato-text">{error}</p>}
            {brief && (
              <>
                <ul className="m-0 flex list-none flex-col gap-1.5 p-0 text-body">
                  {brief.text.split('\n').map((l) => <li key={l}>{l}</li>)}
                </ul>
                <p className="mb-0 mt-2 text-micro text-ink-deep/70">{brief.source === 'ai' ? 'Written by AI from live orders and stock.' : 'Summed up from live orders and stock.'}</p>
              </>
            )}
          </div>
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
