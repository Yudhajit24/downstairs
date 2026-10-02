import { describe, expect, it } from 'vitest'
import { ticketTime } from './ticketTime.js'

const at = (hhmm: string) => new Date(`2026-10-03T${hhmm}:00+05:30`)
const order = (status: any, slot: string, history: { status: string; at: Date }[] = []) => ({ status, slotStart: at(slot), statusHistory: history })

describe('ticketTime', () => {
  it('shows minutes until the slot', () => {
    expect(ticketTime(order('new', '08:15'), at('08:08'))).toEqual({ tone: 'normal', label: 'in 7 min' })
  })
  it('flags due soon within 5 minutes', () => {
    expect(ticketTime(order('new', '08:15'), at('08:10'))).toEqual({ tone: 'soon', label: 'due soon' })
    expect(ticketTime(order('preparing', '08:15'), at('08:14'))).toEqual({ tone: 'soon', label: 'due soon' })
  })
  it('flags late once past the slot', () => {
    expect(ticketTime(order('new', '08:15'), at('08:18'))).toEqual({ tone: 'late', label: 'late 3 min' })
    expect(ticketTime(order('preparing', '08:15'), new Date(at('08:15').getTime() + 20_000))).toEqual({ tone: 'late', label: 'late 1 min' })
  })
  it('ready waits, then becomes "not collected" after 15 minutes', () => {
    const h = [{ status: 'ready', at: at('08:00') }]
    expect(ticketTime(order('ready', '08:00', h), at('08:04'))).toEqual({ tone: 'normal', label: 'waiting 4 min' })
    expect(ticketTime(order('ready', '08:00', h), at('08:15'))).toEqual({ tone: 'normal', label: 'waiting 15 min' })
    expect(ticketTime(order('ready', '08:00', h), at('08:17'))).toEqual({ tone: 'late', label: 'not collected 17 min' })
  })
  it('uses the latest time it entered ready (after a move back)', () => {
    const h = [{ status: 'ready', at: at('07:00') }, { status: 'preparing', at: at('07:30') }, { status: 'ready', at: at('08:00') }]
    expect(ticketTime(order('ready', '08:00', h), at('08:05')).label).toBe('waiting 5 min')
  })
  it('picked up has no time line', () => {
    expect(ticketTime(order('picked_up', '08:00'), at('09:00')).label).toBe('')
  })
})
