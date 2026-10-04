import { describe, expect, it } from 'vitest'
import { greeting, orderPosterIndex, posterIndex } from './poster.js'

const at = (hhmm: string) => new Date(`2026-10-03T${hhmm}:00+05:30`)

describe('posterIndex', () => {
  it('is deterministic per date and within range', () => {
    expect(posterIndex('2026-10-03', 13)).toBe(posterIndex('2026-10-03', 13))
    for (let d = 1; d <= 31; d++) {
      const i = posterIndex(`2026-10-${String(d).padStart(2, '0')}`, 13)
      expect(i).toBeGreaterThanOrEqual(0)
      expect(i).toBeLessThan(13)
    }
  })
  it('varies across days (not stuck on one poster)', () => {
    const seen = new Set(Array.from({ length: 30 }, (_, d) => posterIndex(`2026-11-${String(d + 1).padStart(2, '0')}`, 13)))
    expect(seen.size).toBeGreaterThan(6)
  })
  it('handles an empty set', () => expect(posterIndex('2026-10-03', 0)).toBe(0))
})

describe('greeting', () => {
  it('changes by IST time band', () => {
    expect(greeting(at('07:00'), 'Riya')).toBe('Good morning, Riya')
    expect(greeting(at('11:59'), 'Riya')).toBe('Good morning, Riya')
    expect(greeting(at('12:00'), 'Riya')).toBe('Afternoon, Riya')
    expect(greeting(at('16:59'), 'Riya')).toBe('Afternoon, Riya')
    expect(greeting(at('17:00'), 'Riya')).toBe('Evening, Riya')
    expect(greeting(at('23:30'), 'Riya')).toBe('Evening, Riya')
  })
  it('uses IST, not the UTC hour', () => {
    expect(greeting(new Date('2026-10-03T06:15:00Z'), 'Riya')).toBe('Good morning, Riya') // 11:45 IST
    expect(greeting(new Date('2026-10-03T06:35:00Z'), 'Riya')).toBe('Afternoon, Riya') // 12:05 IST
    expect(greeting(new Date('2026-10-02T19:00:00Z'), 'Riya')).toBe('Good morning, Riya') // 00:30 IST next day
  })
  it('uses only the first name and drops it when none is saved', () => {
    expect(greeting(at('08:00'), '  Riya Sharma ')).toBe('Good morning, Riya')
    expect(greeting(at('08:00'))).toBe('Good morning')
    expect(greeting(at('08:00'), '   ')).toBe('Good morning')
  })
})

describe('orderPosterIndex', () => {
  it('never matches the poster of the day, is stable per order, and varies across orders', () => {
    const seen = new Set<number>()
    for (let d = 1; d <= 28; d++) {
      const day = `2026-10-${String(d).padStart(2, '0')}`
      for (const id of ['order-aaaaaaaaaaaaaaaaaa', 'order-bbbbbbbbbbbbbbbbbb', 'order-cccccccccccccccccc']) {
        const i = orderPosterIndex(day, id, 13)
        expect(i).not.toBe(posterIndex(day, 13))
        expect(i).toBeGreaterThanOrEqual(0)
        expect(i).toBeLessThan(13)
        expect(orderPosterIndex(day, id, 13)).toBe(i)
        seen.add(i)
      }
    }
    expect(seen.size).toBeGreaterThan(5)
    expect(orderPosterIndex('2026-10-03', 'x', 1)).toBe(0)
  })
})
