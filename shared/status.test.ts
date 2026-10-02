import { describe, expect, it } from 'vitest'
import { advance, canCancel, customerCanEdit, revert } from './status.js'

describe('status machine', () => {
  it('advances one step when the expected status matches', () => {
    expect(advance('new', 'new')).toEqual({ kind: 'ok', to: 'preparing' })
    expect(advance('preparing', 'preparing')).toEqual({ kind: 'ok', to: 'ready' })
    expect(advance('ready', 'ready')).toEqual({ kind: 'ok', to: 'picked_up' })
  })
  it('is a no-op (not a skipped step) when another tablet already moved it', () => {
    expect(advance('preparing', 'new')).toEqual({ kind: 'noop' })
    expect(revert('new', 'preparing')).toEqual({ kind: 'noop' })
  })
  it('cannot advance past picked_up or revert past new', () => {
    expect(advance('picked_up', 'picked_up')).toEqual({ kind: 'invalid' })
    expect(revert('new', 'new')).toEqual({ kind: 'invalid' })
    expect(advance('cancelled', 'cancelled')).toEqual({ kind: 'invalid' })
    expect(revert('cancelled', 'cancelled')).toEqual({ kind: 'invalid' })
  })
  it('reverts one step', () => {
    expect(revert('picked_up', 'picked_up')).toEqual({ kind: 'ok', to: 'ready' })
    expect(revert('ready', 'ready')).toEqual({ kind: 'ok', to: 'preparing' })
    expect(revert('preparing', 'preparing')).toEqual({ kind: 'ok', to: 'new' })
  })
  it('customer cancels only while new; kitchen until picked up', () => {
    expect(canCancel('new', 'customer')).toBe(true)
    expect(canCancel('preparing', 'customer')).toBe(false)
    expect(canCancel('preparing', 'kitchen')).toBe(true)
    expect(canCancel('ready', 'kitchen')).toBe(true)
    expect(canCancel('picked_up', 'kitchen')).toBe(false)
    expect(canCancel('cancelled', 'kitchen')).toBe(false)
  })
  it('customer edits only while new', () => {
    expect(customerCanEdit('new')).toBe(true)
    expect(customerCanEdit('preparing')).toBe(false)
  })
})
