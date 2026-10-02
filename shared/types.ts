export type Category = 'hot' | 'cold' | 'breakfast' | 'bakes'
export type Sugar = 'regular' | 'less' | 'none'
export type Status = 'new' | 'preparing' | 'ready' | 'picked_up' | 'cancelled'

/** A choice inside an option group (a bread, a filling, a sauce). `available` is the kitchen's live switch. */
export interface OptionChoice {
  id: string
  label: string
  priceDelta: number
  prepDelta?: number
  /** True for ingredients that make the item non-veg (e.g. egg). */
  nonVeg?: boolean
  available: boolean
}

/** A group of choices. `min`/`max` are how many the customer must/may pick (min 1, max 1 = pick exactly one). */
export interface OptionGroup {
  id: string
  label: string
  min: number
  max: number
  choices: OptionChoice[]
}

/** The customer's picks: option group id -> chosen choice ids. */
export type Selections = Record<string, string[]>

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
  /** Build-your-own items (e.g. a sandwich). Absent for ordinary items. */
  options?: OptionGroup[]
  /** Approximate values per serving (estimates, labelled "approx" in the UI). */
  nutrition?: { kcal: number; protein: number }
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
  /** Hand-written note from the kitchen (today's special, an event). Shown on the menu. */
  banner?: string | null
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
  /** Chosen option ids per group (build-your-own items). `price` and `prepUnits` already include their deltas. */
  options?: Selections
  /** Snapshot of the chosen labels for the kitchen ticket and receipts, taken from the menu at order time. */
  custom?: { group: string; choices: string[] }[]
  /** True when a chosen ingredient is non-veg (e.g. egg), even though the base item is veg. */
  nonVeg?: boolean
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
  | 'METHOD_NOT_ALLOWED' | 'RATE_LIMITED' | 'INTERNAL'

export interface ApiErrorBody {
  code: ErrorCode
  message: string
  details?: unknown
}

export interface ItemProblem {
  itemId: string
  reason: 'missing' | 'unavailable' | 'stock' | 'option'
  remaining: number | null
  /** For reason 'option': which choice is the problem. */
  groupId?: string
  choiceId?: string
  label?: string
}

export interface SlotSuggestion {
  slotId: string
  time: string
}

/** templates/{id}: a shared cart. The id is a hash of the normalised lines, so the same cart always has the same link. */
export interface TemplateDoc {
  id: string
  items: { itemId: string; sugar: Sugar | null; qty: number; options?: Selections }[]
  itemCount: number
  createdAt: Date
}
