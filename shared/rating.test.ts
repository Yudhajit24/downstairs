import { describe, expect, it } from 'vitest'
import { ratingSummary } from './rating.js'

describe('ratingSummary', () => {
  it('averages valid ratings to one decimal and ignores unrated or bad values', () => {
    expect(ratingSummary([{ rating: 5 }, { rating: 4 }, { rating: 4 }, {}, { rating: null }, { rating: 9 }, { rating: 0 }])).toEqual({ count: 3, average: 4.3 })
  })
  it('has no average when nobody rated', () => { expect(ratingSummary([{}, { rating: null }])).toEqual({ count: 0, average: null }) })
})
