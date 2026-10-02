export const CAFE_NAME = 'Downstairs'
export const CAFE_WORDMARK = CAFE_NAME.toLowerCase()
export const CAFE_TAGLINE = 'your café, one lift ride away'
export const CAFE_LOCATION = 'Palm Grove Residency · Clubhouse, ground floor'
export const TIMEZONE = 'Asia/Kolkata'
/** Palm Grove Residency, Bengaluru (used for the weather lookup). */
export const CAFE_COORDS = { lat: 12.9716, lon: 77.5946 } as const

export const COPY = {
  closed: (opensAt: string) => `We're closed. Back at ${opensAt}.`,
  paused: "The kitchen's swamped right now. New orders back in a few minutes.",
  locked: "The kitchen's already on it. For changes, talk to the counter.",
  tooLarge: 'Large order? Message the café directly.',
} as const

export const CANCEL_REASONS = ['item ran out', 'closing early', 'customer asked', 'other'] as const

export const DEFAULT_SETTINGS = {
  name: CAFE_NAME,
  timezone: TIMEZONE,
  openTime: '07:00',
  closeTime: '22:00',
  slotMinutes: 15,
  leadMinutes: 10,
  slotCapacityUnits: 16,
  maxUnitsPerOrder: 12,
  maxItemsPerOrder: 15,
  paused: false,
  forceOpen: true,
  banner: null,
} as const
