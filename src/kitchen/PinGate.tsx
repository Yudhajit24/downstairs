import { useState } from 'react'
import { Keypad } from '../design'
import { ApiClientError } from '../lib/api'
import { unlockAudio } from '../lib/audio'
import { unlock } from './staff'

export function PinGate() {
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(value: string) {
    if (!value || busy) return
    unlockAudio() // this tap is the gesture that lets the chime play later
    setBusy(true); setError('')
    try {
      await unlock(value)
    } catch (e) {
      setError(e instanceof ApiClientError && e.code === 'UNAUTHORIZED' ? 'Wrong PIN. Try again.' : e instanceof ApiClientError ? e.message : 'Could not unlock.')
      setPin('')
    } finally { setBusy(false) }
  }

  return (
    <main className="grid min-h-dvh place-items-center bg-ink px-4 py-8">
      <div className="w-full max-w-sm text-center">
        <h1 className="m-0 font-display text-display-l text-paper">downstairs</h1>
        <p className="mb-8 mt-1 font-script text-script-l font-bold text-paper">kitchen</p>
        <Keypad value={pin} onChange={setPin} length={6} error={!!error} onSubmit={submit} />
        <p role="alert" className="mb-0 mt-5 min-h-6 text-body font-bold text-paper">{error}</p>
        <button
          type="button" disabled={!pin || busy} onClick={() => submit(pin)}
          className="mt-3 min-h-14 w-full max-w-[300px] rounded-btn border-2 border-paper bg-paper text-body font-bold text-ink disabled:opacity-50 cursor-pointer"
        >
          {busy ? 'Checking…' : 'Unlock'}
        </button>
      </div>
    </main>
  )
}
