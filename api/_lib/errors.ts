import type { ErrorCode } from '../../shared/types.js'

export const HTTP_STATUS: Record<ErrorCode, number> = {
  VALIDATION: 400,
  UNAUTHORIZED: 401,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  RATE_LIMITED: 429,
  CLOSED: 409,
  PAUSED: 409,
  ITEM_UNAVAILABLE: 409,
  SLOT_FULL: 409,
  SLOT_PASSED: 409,
  SLOT_CLOSED: 409,
  ORDER_TOO_LARGE: 409,
  ORDER_LOCKED: 409,
  INTERNAL: 500,
}

export class ApiError extends Error {
  readonly status: number
  constructor(readonly code: ErrorCode, message: string, readonly details?: unknown) {
    super(message)
    this.status = HTTP_STATUS[code]
  }
  toBody() {
    return { code: this.code, message: this.message, ...(this.details !== undefined && { details: this.details }) }
  }
}

export const fail = (code: ErrorCode, message: string, details?: unknown) => new ApiError(code, message, details)
