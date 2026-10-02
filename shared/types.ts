export type Category = 'hot' | 'cold' | 'breakfast' | 'bakes'
export type Sugar = 'regular' | 'less' | 'none'
export type Status = 'new' | 'preparing' | 'ready' | 'picked_up' | 'cancelled'

export interface MenuItem {
  name: string
  category: Category
  description: string
  price: number
  veg: boolean
  prepUnits: number
  available: boolean
  stock: number | null
  hasSugarOption: boolean
  illustration: string
  sortOrder: number
  tags: string[]
}

export interface CafeSettings {
  name: string
  timezone: string
  openTime: string // 'HH:mm'
  closeTime: string
  slotMinutes: number
  leadMinutes: number
  slotCapacityUnits: number
  maxUnitsPerOrder: number
  maxItemsPerOrder: number
  paused: boolean
  forceOpen: boolean
}

export interface SlotDoc {
  date: string
  time: string
  usedUnits: number
  closed: boolean
}

export interface OrderLine {
  itemId: string
  name: string
  price: number
  qty: number
  sugar: Sugar | null
  prepUnits: number
}

export interface OrderChange {
  kind: 'added' | 'removed' | 'qty' | 'slot' | 'note'
  label: string
}

export interface Order {
  id: string
  token: number
  date: string
  customer: { name: string; flat: string }
  items: OrderLine[]
  itemCount: number
  units: number
  total: number
  note: string | null
  slotId: string
  slotTime: string
  slotStart: Date
  status: Status
  cancelledBy: 'customer' | 'kitchen' | null
  cancelReason: string | null
  changes: OrderChange[] | null
  changesSeen: boolean
  editCount: number
  statusHistory: { status: string; at: Date }[]
  createdAt: Date
  updatedAt: Date
}

export type ErrorCode =
  | 'VALIDATION' | 'CLOSED' | 'PAUSED' | 'ITEM_UNAVAILABLE'
  | 'SLOT_FULL' | 'SLOT_PASSED' | 'SLOT_CLOSED'
  | 'ORDER_TOO_LARGE' | 'ORDER_LOCKED' | 'NOT_FOUND' | 'UNAUTHORIZED'
  | 'METHOD_NOT_ALLOWED' | 'INTERNAL'

export interface ApiErrorBody {
  code: ErrorCode
  message: string
  details?: unknown
}

export interface ItemProblem {
  itemId: string
  reason: 'missing' | 'unavailable' | 'stock'
  remaining: number | null
}

export interface SlotSuggestion {
  slotId: string
  time: string
}

/** templates/{id}: a shared cart. The id is a hash of the normalised lines, so the same cart always has the same link. */
export interface TemplateDoc {
  id: string
  items: { itemId: string; sugar: Sugar | null; qty: number }[]
  itemCount: number
  createdAt: Date
}
