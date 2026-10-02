import { useState } from 'react'
import { BottomSheet, Button, useToast } from '../design'
import { api, ApiClientError } from '../lib/api'
import { Spinner } from './ui'

interface Line { itemId: string; sugar: string | null; qty: number }

/**
 * "Share this order": turns a list of lines into a /t/<id> link (the server dedupes identical carts)
 * and offers the native share sheet, WhatsApp and copy.
 */
export function ShareButton({ items, label = 'Share this order' }: { items: Line[]; label?: string }) {
  const toast = useToast()
  const [busy, setBusy] = useState(false)
  const [url, setUrl] = useState<string | null>(null)

  async function create() {
    if (busy) return
    setBusy(true)
    try {
      const { id } = await api.createTemplate(items)
      setUrl(`${location.origin}/t/${id}`)
    } catch (e) {
      toast({ message: e instanceof ApiClientError && e.code === 'NETWORK' ? "Can't reach the café. Try again." : e instanceof Error ? e.message : "Couldn't make a link." }, 4000)
    } finally { setBusy(false) }
  }

  const text = "Here's what I'm having at Downstairs. Tap to add it to your cart:"
  const canShare = typeof navigator !== 'undefined' && !!navigator.share

  async function copy() {
    try { await navigator.clipboard.writeText(url!); toast({ message: 'Link copied.' }, 2500) }
    catch { toast({ message: `Copy this link: ${url}` }, 6000) }
  }

  return (
    <>
      <Button variant="secondary" block onClick={create} disabled={busy || items.length === 0}>
        {busy ? <><Spinner /> Making a link…</> : label}
      </Button>
      <BottomSheet open={!!url} onClose={() => setUrl(null)} title="Share this order">
        <h2 className="m-0 font-display text-display-m text-ink">Share this order</h2>
        <p className="mb-3 mt-1 text-body">Anyone with the link can add these items to their own cart.</p>
        <p className="mb-4 mt-0 break-all rounded-btn border-2 border-dashed border-ink bg-paper p-3 font-mono text-small">{url}</p>
        <div className="flex flex-col gap-2">
          {canShare && (
            <Button size="lg" block onClick={() => navigator.share({ title: 'Downstairs order', text, url: url! }).catch(() => {})}>Share…</Button>
          )}
          <a
            href={`https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`} target="_blank" rel="noreferrer"
            className="press inline-flex min-h-14 items-center justify-center rounded-btn border-2 border-ink bg-ink px-5 text-body font-bold text-paper-raised no-underline"
          >
            Send on WhatsApp
          </a>
          <Button size="lg" block variant="secondary" onClick={copy}>Copy link</Button>
        </div>
      </BottomSheet>
    </>
  )
}
