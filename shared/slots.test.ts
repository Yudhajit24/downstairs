import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS } from './constants.js'
import {
  dateKey, daySlotTimes, formatTime12, isCafeOpen, makeSlotId, nextBookableSlots, parseSlotId, slotStartDate, slotState,
} from './slots.js'
import type { CafeSettings, SlotDoc } from './types.js'

const S: CafeSettings = { ...DEFAULT_SETTINGS, forceOpen: false }
const at = (hhmm: string, date = '2026-10-03') => new Date(`${date}T${hhmm}:00+05:30`)
const slot = (usedUnits: number, closed = false): SlotDoc => ({ date: '2026-10-03', time: '08:30', usedUnits, closed })

describe('IST handling', () => {
  it('dateKey uses IST, not UTC', () => {
    expect(dateKey(new Date('2026-10-02T19:00:00Z'))).toBe('2026-10-03') // 00:30 IST
    expect(dateKey(new Date('2026-10-03T18:29:00Z'))).toBe('2026-10-03') // 23:59 IST
    expect(dateKey(new Date('2026-10-03T18:30:00Z'))).toBe('2026-10-04') // 00:00 IST
  })
  it('slot start is the IST wall-clock instant', () => {
    expect(slotStartDate('2026-10-03_0815').toISOString()).toBe('2026-10-03T02:45:00.000Z')
  })
  it('slot id round-trips and rejects junk', () => {
    expect(makeSlotId('2026-10-03', '08:15')).toBe('2026-10-03_0815')
    expect(parseSlotId('2026-10-03_0815')).toEqual({ date: '2026-10-03', time: '08:15' })
    expect(parseSlotId('2026-10-03_2515')).toBeNull()
    expect(parseSlotId('nonsense')).toBeNull()
  })
  it('formats 12-hour labels', () => {
    expect(formatTime12('07:00')).toBe('7:00 AM')
    expect(formatTime12('00:15')).toBe('12:15 AM')
    expect(formatTime12('21:45')).toBe('9:45 PM')
  })
})

describe('hours and forceOpen', () => {
  it('opens at 07:00 and closes at 22:00', () => {
    expect(isCafeOpen(S, at('06:59'))).toBe(false)
    expect(isCafeOpen(S, at('07:00'))).toBe(true)
    expect(isCafeOpen(S, at('21:59'))).toBe(true)
    expect(isCafeOpen(S, at('22:00'))).toBe(false)
  })
  it('forceOpen is open at 03:00 IST', () => {
    expect(isCafeOpen({ ...S, forceOpen: true }, at('03:00'))).toBe(true)
  })
  it('grid is 07:00–21:45 normally, whole day with forceOpen', () => {
    const t = daySlotTimes(S)
    expect(t[0]).toBe('07:00')
    expect(t.at(-1)).toBe('21:45')
    expect(t).toHaveLength(60)
    const all = daySlotTimes({ ...S, forceOpen: true })
    expect(all[0]).toBe('00:00')
    expect(all.at(-1)).toBe('23:45')
    expect(all).toHaveLength(96)
  })
})

describe('slotState', () => {
  const st = (time: string, now: string, units: number, doc?: SlotDoc, ownUnits = 0) =>
    slotState({ slotId: makeSlotId('2026-10-03', time), slot: doc, now: at(now), settings: S, units, ownUnits })

  it('needs 10 minutes of lead time', () => {
    expect(st('08:15', '08:05', 1)).toBe('open')   // exactly 10 min
    expect(st('08:15', '08:06', 1)).toBe('past')   // 9 min
    expect(st('08:00', '08:00', 1)).toBe('past')
    expect(st('07:45', '08:00', 1)).toBe('past')
  })
  it('capacity is relative to the cart', () => {
    const d = slot(13) // 3 left
    expect(st('08:30', '08:00', 4, d)).toBe('full')
    expect(st('08:30', '08:00', 3, d)).toBe('few')
    expect(st('08:30', '08:00', 1, d)).toBe('few')
  })
  it('"few" is at most 25% of capacity remaining', () => {
    expect(st('08:30', '08:00', 1, slot(12))).toBe('few')  // 4 left
    expect(st('08:30', '08:00', 1, slot(11))).toBe('open') // 5 left
  })
  it('a bakes-only cart (0 units) fits even a full slot', () => {
    expect(st('08:30', '08:00', 0, slot(16))).toBe('few')
  })
  it('closed slots are closed, past beats closed', () => {
    expect(st('08:30', '08:00', 1, slot(0, true))).toBe('closed')
    expect(st('07:45', '08:00', 1, slot(0, true))).toBe('past')
  })
  it('an edited order does not count against itself', () => {
    expect(st('08:30', '08:00', 4, slot(16))).toBe('full')
    expect(st('08:30', '08:00', 4, slot(16), 4)).toBe('few')
  })
})

describe('nextBookableSlots', () => {
  it('returns the next 3 bookable slots, skipping full and closed ones', () => {
    const slots: Record<string, SlotDoc> = {
      '2026-10-03_0815': { date: '2026-10-03', time: '08:15', usedUnits: 16, closed: false },
      '2026-10-03_0830': { date: '2026-10-03', time: '08:30', usedUnits: 0, closed: true },
    }
    const r = nextBookableSlots({ settings: S, slots, now: at('08:00'), units: 2 })
    expect(r.map((x) => x.time)).toEqual(['08:45', '09:00', '09:15'])
  })
  it('is empty after the last slot', () => {
    expect(nextBookableSlots({ settings: S, slots: {}, now: at('21:40'), units: 1 })).toEqual([])
  })
})
