import { z } from 'zod'

export const orderIdSchema = z.string().regex(/^[A-Za-z0-9_-]{21}$/, 'Invalid order id')

export function normalizeFlat(s: string): string {
  return s.trim().toUpperCase().replace(/\s+/g, ' ')
}

export const nameSchema = z.string().trim().min(2, 'Enter at least 2 characters').max(30, 'Keep it under 30 characters')

export const flatSchema = z
  .string()
  .transform(normalizeFlat)
  .pipe(
    z
      .string()
      .min(2, 'Enter your flat, e.g. B-402')
      .max(12, 'Keep it under 12 characters')
      .regex(/\d/, 'Flat needs a number, e.g. B-402')
      .regex(/^[A-Z0-9][A-Z0-9 /-]*$/, 'Use letters, numbers and dashes only'),
  )

export const sugarSchema = z.enum(['regular', 'less', 'none'])

/** groupId -> choice ids. Bounded so a hostile client cannot send a huge object. */
export const selectionsSchema = z
  .record(z.string().min(1).max(32), z.array(z.string().min(1).max(32)).max(12))
  .refine((o) => Object.keys(o).length <= 8, 'Too many option groups')

export const lineSchema = z.object({
  itemId: z.string().min(1).max(64),
  qty: z.number().int().min(1).max(99),
  sugar: sugarSchema.nullish(),
  options: selectionsSchema.nullish(),
})

export const slotIdSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}_([01]\d|2[0-3])[0-5]\d$/, 'Invalid slot')

const noteSchema = z
  .string()
  .trim()
  .max(80, 'Keep the note under 80 characters')
  .nullish()
  .transform((v) => (v ? v : null))

const itemsSchema = z.array(lineSchema).min(1, 'Add at least one item').max(60)

export const createOrderSchema = z.object({
  id: orderIdSchema,
  customer: z.object({ name: nameSchema, flat: flatSchema }),
  items: itemsSchema,
  slotId: slotIdSchema,
  note: noteSchema,
})
export type CreateOrderInput = z.infer<typeof createOrderSchema>

export const customerPatchSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('edit'), items: itemsSchema, slotId: slotIdSchema, note: noteSchema }),
  z.object({ action: z.literal('cancel') }),
])
export type CustomerPatch = z.infer<typeof customerPatchSchema>

export const statusSchema = z.enum(['new', 'preparing', 'ready', 'picked_up', 'cancelled'])

export const sessionSchema = z.object({ pin: z.string().min(1).max(32) })

export const kitchenActionSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('advance'), orderId: orderIdSchema, expectedStatus: statusSchema }),
  z.object({ type: z.literal('revert'), orderId: orderIdSchema, expectedStatus: statusSchema }),
  z.object({ type: z.literal('cancel'), orderId: orderIdSchema, reason: z.string().trim().min(1).max(80) }),
  z.object({ type: z.literal('ackChanges'), orderId: orderIdSchema }),
  z.object({
    type: z.literal('setItem'),
    itemId: z.string().min(1).max(64),
    available: z.boolean().optional(),
    stock: z.number().int().min(0).max(9999).nullable().optional(),
  }),
  z.object({ type: z.literal('setSlot'), slotId: slotIdSchema, closed: z.boolean() }),
  z.object({
    type: z.literal('setChoice'),
    itemId: z.string().min(1).max(64),
    groupId: z.string().min(1).max(32),
    choiceId: z.string().min(1).max(32),
    available: z.boolean(),
  }),
  z.object({
    type: z.literal('setSettings'),
    paused: z.boolean().optional(),
    forceOpen: z.boolean().optional(),
    banner: z.string().trim().max(80).nullable().optional(),
  }),
])
export type KitchenAction = z.infer<typeof kitchenActionSchema>

/** A shareable order template: just the lines (no customer, slot or note). */
export const createTemplateSchema = z.object({ items: itemsSchema })
export type CreateTemplateInput = z.infer<typeof createTemplateSchema>
export const templateIdSchema = z.string().regex(/^[A-Za-z0-9_-]{8,32}$/, 'Invalid template id')
