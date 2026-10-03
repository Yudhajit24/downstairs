import { afterEach, describe, expect, it, vi } from 'vitest'
import { smoothScrollTo } from './smoothScroll'

/** A tiny fake browser: scroll position, a manual frame clock, and user-input events. */
function fakeBrowser(o: { scrollHeight?: number; innerHeight?: number; reduced?: boolean } = {}) {
  let y = 0, now = 0, nextId = 0
  const frames = new Map<number, FrameRequestCallback>()
  const listeners = new Map<string, Set<() => void>>()
  vi.stubGlobal('window', {
    get scrollY() { return y },
    innerHeight: o.innerHeight ?? 800,
    scrollTo: (_x: number, ny: number) => { y = ny },
    matchMedia: () => ({ matches: !!o.reduced }),
    addEventListener: (ev: string, fn: () => void) => { (listeners.get(ev) ?? listeners.set(ev, new Set()).get(ev)!).add(fn) },
    removeEventListener: (ev: string, fn: () => void) => { listeners.get(ev)?.delete(fn) },
  })
  vi.stubGlobal('document', { documentElement: { scrollHeight: o.scrollHeight ?? 6000 } })
  vi.stubGlobal('performance', { now: () => now })
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => { frames.set(++nextId, cb); return nextId })
  vi.stubGlobal('cancelAnimationFrame', (id: number) => { frames.delete(id) })
  return {
    y: () => y,
    /** Advance one 16 ms frame. */
    frame() { now += 16; const due = [...frames.values()]; frames.clear(); due.forEach((cb) => cb(now)) },
    emit(ev: string) { [...(listeners.get(ev) ?? [])].forEach((fn) => fn()) },
    pending: () => frames.size,
  }
}

afterEach(() => vi.unstubAllGlobals())

async function run(b: ReturnType<typeof fakeBrowser>, p: Promise<void>, max = 400) {
  const ys = [b.y()]
  let done = false
  void p.then(() => { done = true })
  for (let i = 0; i < max && !done; i++) { b.frame(); ys.push(b.y()); await Promise.resolve() }
  await p
  return ys
}

describe('smoothScrollTo', () => {
  it('eases: slow start, fast middle, gentle landing, exactly on target', async () => {
    const b = fakeBrowser()
    const ys = await run(b, smoothScrollTo(2000))
    expect(b.y()).toBe(2000)
    const steps = ys.slice(1).map((v, i) => v - ys[i])
    const peak = Math.max(...steps)
    expect(steps[0]).toBeLessThan(peak / 3)               // eases in
    expect(steps.at(-1)!).toBeLessThan(peak / 3)          // eases out
    expect(steps.every((s) => s >= 0)).toBe(true)         // never goes backwards
    expect(peak).toBeGreaterThan(40)                      // and it actually moves quickly in the middle
    expect(ys.length).toBeGreaterThan(20)                 // takes real time, not one jump
  })

  it('scrolls up as well as down', async () => {
    const b = fakeBrowser()
    await run(b, smoothScrollTo(1500))
    const ys = await run(b, smoothScrollTo(200))
    expect(b.y()).toBe(200)
    expect(ys[1]).toBeLessThan(ys[0])
  })

  it('never scrolls past the bottom of the page', async () => {
    const b = fakeBrowser({ scrollHeight: 3000, innerHeight: 800 })
    await run(b, smoothScrollTo(99999))
    expect(b.y()).toBe(2200)
  })

  it('longer trips take longer, within a cap', async () => {
    const short = await run(fakeBrowser(), smoothScrollTo(300))
    vi.unstubAllGlobals()
    const long = await run(fakeBrowser(), smoothScrollTo(4000))
    expect(long.length).toBeGreaterThan(short.length)
    expect(long.length * 16).toBeLessThanOrEqual(900 + 32) // 900 ms cap
  })

  it('stops the moment the user touches or wheels, and resolves', async () => {
    for (const ev of ['wheel', 'touchstart', 'keydown', 'mousedown']) {
      vi.unstubAllGlobals()
      const b = fakeBrowser()
      const p = smoothScrollTo(3000)
      let done = false
      void p.then(() => { done = true })
      for (let i = 0; i < 8; i++) b.frame()
      const mid = b.y()
      expect(mid).toBeGreaterThan(0)
      expect(mid).toBeLessThan(3000)
      b.emit(ev)
      await p
      expect(done).toBe(true)
      b.frame(); b.frame()
      expect(b.y()).toBe(mid)       // no further movement
      expect(b.pending()).toBe(0)
    }
  })

  it('a new scroll replaces the one in flight', async () => {
    const b = fakeBrowser()
    void smoothScrollTo(3000)
    for (let i = 0; i < 6; i++) b.frame()
    const ys = await run(b, smoothScrollTo(400))
    expect(b.y()).toBe(400)
    expect(Math.max(...ys)).toBeLessThan(3000) // never heads to the abandoned target
  })

  it('jumps instantly for reduced motion, and for tiny distances', async () => {
    const reduced = fakeBrowser({ reduced: true })
    await smoothScrollTo(1800)
    expect(reduced.y()).toBe(1800)
    expect(reduced.pending()).toBe(0)
    vi.unstubAllGlobals()
    const tiny = fakeBrowser()
    await smoothScrollTo(1)
    expect(tiny.y()).toBe(1)
    expect(tiny.pending()).toBe(0)
  })
})
