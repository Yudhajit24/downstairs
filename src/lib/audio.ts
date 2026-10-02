/** Web Audio only: no audio files. Call unlockAudio() from a tap (the PIN keypad) so later sounds are allowed. */
let ctx: AudioContext | null = null

export function unlockAudio() {
  try {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    ctx ??= new AC()
    void ctx.resume()
  } catch { /* no audio available */ }
}

function tone(freq: number, start: number, dur: number, type: OscillatorType, peak: number) {
  if (!ctx) return
  const t0 = ctx.currentTime + start
  const osc = ctx.createOscillator()
  const g = ctx.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, t0)
  g.gain.setValueAtTime(0.0001, t0)
  g.gain.exponentialRampToValueAtTime(peak, t0 + 0.02)
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
  osc.connect(g).connect(ctx.destination)
  osc.start(t0)
  osc.stop(t0 + dur + 0.05)
}

/** New order: a bright two-note bell. */
export function chime() {
  tone(880, 0, 0.5, 'sine', 0.3)
  tone(1318.5, 0.16, 0.7, 'sine', 0.26)
  tone(1760, 0.16, 0.5, 'triangle', 0.08)
}

/** Customer cancelled: two low falling buzzes, clearly different from the chime. */
export function cancelSound() {
  tone(330, 0, 0.28, 'square', 0.12)
  tone(220, 0.3, 0.45, 'square', 0.12)
}
