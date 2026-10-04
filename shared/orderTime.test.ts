import { describe, expect, it } from 'vitest'
import { formatMinutes, minutesToPickup } from './orderTime.js'

const t = (hhmm: string) => new Date(`2026-10-03T${hhmm}:00+05:30`)
const order = (status: 'picked_up' | 'ready', pickedAt?: string) => ({
  status, createdAt: t('09:00'),
  statusHistory: [{ status: 'new', at: t('09:00') }, { status: 'ready', at: t('09:20') }, ...(pickedAt ? [{ status: 'picked_up', at: t(pickedAt) }] : [])],
})

describe('minutesToPickup', () => {
  it('is the time from ordering to the picked-up stamp', () => { expect(minutesToPickup(order('picked_up', '09:23'))).toBe(23) })
  it('uses the last picked-up stamp if it was moved back and forth', () => {
    const o = order('picked_up', '09:25'); o.statusHistory.push({ status: 'ready', at: t('09:26') }, { status: 'picked_up', at: t('09:40') })
    expect(minutesToPickup(o)).toBe(40)
  })
  it('is null until picked up, or without a stamp', () => {
    expect(minutesToPickup(order('ready'))).toBeNull()
    expect(minutesToPickup(order('picked_up'))).toBeNull()
  })
  it('never goes negative', () => { expect(minutesToPickup({ ...order('picked_up', '08:55') })).toBe(0) })
})

describe('formatMinutes', () => {
  it('reads naturally', () => {
    expect([0, 1, 23, 59, 60, 65, 120].map(formatMinutes)).toEqual(['under a minute', '1 min', '23 min', '59 min', '1 h', '1 h 5 min', '2 h'])
  })
})
