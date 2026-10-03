/**
 * Eased programmatic scrolling.
 * Native `behavior: 'smooth'` is linear-ish, differs between browsers and (on older Safari) is missing; this gives one
 * consistent ease-in-out. It stops the instant the user touches, wheels or presses a key, and does nothing fancy
 * (jumps) when the user prefers reduced motion.
 */
const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)

let cancel: (() => void) | null = null

export function smoothScrollTo(targetY: number, opts: { duration?: number } = {}): Promise<void> {
  cancel?.()
  const startY = window.scrollY
  const max = document.documentElement.scrollHeight - window.innerHeight
  const to = Math.max(0, Math.min(targetY, max))
  const dist = to - startY
  if (Math.abs(dist) < 2 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    window.scrollTo(0, to)
    return Promise.resolve()
  }
  // Longer trips take a little longer, but never feel sluggish.
  const duration = opts.duration ?? Math.min(900, 380 + Math.abs(dist) * 0.18)

  return new Promise((resolve) => {
    let raf = 0
    const t0 = performance.now()
    const stop = () => {
      cancelAnimationFrame(raf)
      for (const ev of ['wheel', 'touchstart', 'keydown', 'mousedown'] as const) window.removeEventListener(ev, stop)
      cancel = null
      resolve()
    }
    const step = (now: number) => {
      const p = Math.min(1, (now - t0) / duration)
      window.scrollTo(0, startY + dist * easeInOutCubic(p))
      if (p < 1) raf = requestAnimationFrame(step)
      else stop()
    }
    cancel = stop
    for (const ev of ['wheel', 'touchstart', 'keydown', 'mousedown'] as const) window.addEventListener(ev, stop, { passive: true, once: true })
    raf = requestAnimationFrame(step)
  })
}

/** Scroll so `el` sits `offset` px below the top of the viewport. */
export function smoothScrollToElement(el: HTMLElement, offset = 0) {
  return smoothScrollTo(el.getBoundingClientRect().top + window.scrollY - offset)
}
