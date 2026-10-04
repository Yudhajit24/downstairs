import type { ParsedLine } from '../../shared/orderParse'
import type { WeatherSim } from '../../shared/suggest'
import type { ErrorCode, Order } from '../../shared/types'

export class ApiClientError extends Error {
  constructor(
    readonly code: ErrorCode | 'NETWORK',
    message: string,
    readonly status: number,
    readonly details?: any,
  ) {
    super(message)
  }
}

async function request<T>(method: string, path: string, body?: unknown, token?: string): Promise<T> {
  let res: Response
  try {
    res = await fetch(path, {
      method,
      headers: { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    throw new ApiClientError('NETWORK', "Can't reach the café. Check your connection.", 0)
  }
  const json = await res.json().catch(() => null)
  if (!res.ok) {
    throw new ApiClientError(json?.code ?? 'INTERNAL', json?.message ?? 'Something went wrong.', res.status, json?.details)
  }
  return json as T
}

export interface OrderBody {
  customer: { name: string; flat: string }
  items: { itemId: string; qty: number; sugar: string | null; options?: Record<string, string[]> }[]
  slotId: string
  note: string | null
}

export type KitchenActionBody =
  | { type: 'advance' | 'revert'; orderId: string; expectedStatus: string }
  | { type: 'cancel'; orderId: string; reason: string }
  | { type: 'ackChanges'; orderId: string }
  | { type: 'setItem'; itemId: string; available?: boolean; stock?: number | null }
  | { type: 'setSlot'; slotId: string; closed: boolean }
  | { type: 'setChoice'; itemId: string; groupId: string; choiceId: string; available: boolean }
  | { type: 'setSettings'; paused?: boolean; forceOpen?: boolean; banner?: string | null }

export interface AssistResponse { source: 'ai' | 'rules'; picks: { itemId: string; reason: string }[]; note?: string }

export interface ParseOrderResponse {
  source: 'ai' | 'rules'; lines: ParsedLine[]; unmatched: string[]; needsChoices: string[]; soldOut: string[]
}
export interface OrderChatResponse { source: 'ai' | 'rules'; answer: string; relevant: boolean }
export interface BriefResponse { source: 'ai' | 'rules'; text: string }

export const api = {
  assist: (query: string, simulate?: WeatherSim | null) => request<AssistResponse>('POST', '/api/assist', { query, ...(simulate && { simulate }) }),
  parseOrder: (text: string) => request<ParseOrderResponse>('POST', '/api/parse-order', { text }),
  orderChat: (orderId: string, question: string) => request<OrderChatResponse>('POST', '/api/order-chat', { orderId, question }),
  kitchenBrief: (idToken: string) => request<BriefResponse>('POST', '/api/kitchen/brief', {}, idToken),
  kitchenSession: (pin: string) => request<{ token: string }>('POST', '/api/kitchen/session', { pin }),
  kitchenAction: (idToken: string, action: KitchenActionBody) =>
    request<{ noop: boolean; order?: Order }>('POST', '/api/kitchen/action', action, idToken),
  createOrder: (id: string, b: OrderBody) =>
    request<{ order: Order }>('POST', '/api/orders', { id, ...b }),
  editOrder: (id: string, b: Pick<OrderBody, 'items' | 'slotId' | 'note'>) =>
    request<{ order: Order }>('PATCH', `/api/orders/${id}`, { action: 'edit', ...b }),
  rateOrder: (id: string, rating: number) => request<{ order: Order }>('PATCH', `/api/orders/${id}`, { action: 'rate', rating }),
  cancelOrder: (id: string) => request<{ order: Order }>('PATCH', `/api/orders/${id}`, { action: 'cancel' }),
}
