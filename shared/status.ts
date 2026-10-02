import type { Status } from './types.js'

const FLOW: Status[] = ['new', 'preparing', 'ready', 'picked_up']

export type Transition =
  | { kind: 'noop' }              // order is no longer in the expected status (double tap, two tablets)
  | { kind: 'invalid' }           // expected status matches but there is no such step
  | { kind: 'ok'; to: Status }

export function nextStatus(s: Status): Status | null {
  const i = FLOW.indexOf(s)
  return i >= 0 && i < FLOW.length - 1 ? FLOW[i + 1] : null
}

export function prevStatus(s: Status): Status | null {
  const i = FLOW.indexOf(s)
  return i > 0 ? FLOW[i - 1] : null
}

export function advance(current: Status, expected: Status): Transition {
  if (current !== expected) return { kind: 'noop' }
  const to = nextStatus(current)
  return to ? { kind: 'ok', to } : { kind: 'invalid' }
}

export function revert(current: Status, expected: Status): Transition {
  if (current !== expected) return { kind: 'noop' }
  const to = prevStatus(current)
  return to ? { kind: 'ok', to } : { kind: 'invalid' }
}

/** new → cancelled by anyone; preparing/ready → cancelled by kitchen only. */
export function canCancel(current: Status, by: 'customer' | 'kitchen'): boolean {
  if (current === 'new') return true
  return by === 'kitchen' && (current === 'preparing' || current === 'ready')
}

export const customerCanEdit = (s: Status) => s === 'new'
