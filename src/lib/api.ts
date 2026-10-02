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
  items: { itemId: string; qty: number; sugar: string | null }[]
  slotId: string
  note: string | null
}

export const api = {
  createOrder: (id: string, b: OrderBody) =>
    request<{ order: Order }>('POST', '/api/orders', { id, ...b }),
  editOrder: (id: string, b: Pick<OrderBody, 'items' | 'slotId' | 'note'>) =>
    request<{ order: Order }>('PATCH', `/api/orders/${id}`, { action: 'edit', ...b }),
  cancelOrder: (id: string) => request<{ order: Order }>('PATCH', `/api/orders/${id}`, { action: 'cancel' }),
}
