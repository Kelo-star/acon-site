import { describe, expect, it } from 'vitest'
import {
  acquisitionCost,
  contingencyAmount,
  maxPurchasePrice,
  notaryFees,
  pricePerSquareMeter,
  rentalAnalysis,
  renovationBudget,
  renovationLineAmount,
  renovationSubtotal,
} from '../src/services/calculations'
import { createEmptyProperty } from '../src/models/property'
import type { RenovationLine } from '../src/models/renovation'

function line(overrides: Partial<RenovationLine>): RenovationLine {
  return {
    id: 'l1',
    category: 'Électricité',
    description: '',
    priority: 'immediate',
    selectedBudget: 'expected',
    status: 'suppose',
    ...overrides,
  }
}

describe('pricePerSquareMeter', () => {
  it('computes price per square meter', () => {
    expect(Math.round(pricePerSquareMeter(67000, 56)!)).toBe(1196)
  })
  it('returns undefined without price or surface', () => {
    expect(pricePerSquareMeter(undefined, 56)).toBeUndefined()
    expect(pricePerSquareMeter(67000, undefined)).toBeUndefined()
    expect(pricePerSquareMeter(67000, 0)).toBeUndefined()
  })
})

describe('notaryFees', () => {
  it('defaults to 8 % (old property)', () => {
    expect(notaryFees(100000)).toBe(8000)
  })
  it('accepts a custom rate', () => {
    expect(notaryFees(100000, 0.025)).toBe(2500)
  })
})

describe('renovation budget', () => {
  const lines = [
    line({ id: 'a', budgetLow: 1000, budgetExpected: 2000, budgetHigh: 3000 }),
    line({ id: 'b', budgetLow: 500, budgetExpected: 800, budgetHigh: 1200, selectedBudget: 'high' }),
    line({ id: 'c', budgetLow: 400, selectedBudget: 'expected' }), // retombe sur le budget bas
  ]

  it('uses the selected budget with sensible fallbacks', () => {
    expect(renovationLineAmount(lines[0])).toBe(2000)
    expect(renovationLineAmount(lines[1])).toBe(1200)
    expect(renovationLineAmount(lines[2])).toBe(400)
  })

  it('sums lines and applies contingency', () => {
    expect(renovationSubtotal(lines)).toBe(3600)
    expect(contingencyAmount(3600, 0.15)).toBeCloseTo(540)
    const budget = renovationBudget(lines, 0.15)
    expect(budget.subtotal).toBe(3600)
    expect(budget.contingency).toBeCloseTo(540)
    expect(budget.total).toBeCloseTo(4140)
  })
})

describe('acquisitionCost', () => {
  it('combines price, notary, works, contingency and other costs', () => {
    const property = createEmptyProperty('p1', 'Test', 'Lens', '2026-08-08T00:00:00.000Z')
    property.prices.askingPrice = 100000
    property.general.surface = 50
    property.renovations = [line({ budgetExpected: 20000 })]
    property.finance.otherCosts = 2000
    const cost = acquisitionCost(property)
    expect(cost.basePrice).toBe(100000)
    expect(cost.notary).toBe(8000)
    expect(cost.worksSubtotal).toBe(20000)
    expect(cost.contingency).toBeCloseTo(3000)
    expect(cost.total).toBeCloseTo(133000)
    expect(cost.totalPerM2).toBeCloseTo(2660)
  })

  it('prefers the negotiated price over the asking price', () => {
    const property = createEmptyProperty('p1', 'Test', 'Lens', '2026-08-08T00:00:00.000Z')
    property.prices.askingPrice = 100000
    property.prices.negotiatedPrice = 90000
    expect(acquisitionCost(property).basePrice).toBe(90000)
  })

  it('returns undefined totals without a price', () => {
    const property = createEmptyProperty('p1', 'Test', 'Lens', '2026-08-08T00:00:00.000Z')
    expect(acquisitionCost(property).total).toBeUndefined()
  })
})

describe('maxPurchasePrice', () => {
  it('solves price + notary + works + costs ≤ prudent value × (1 − margin)', () => {
    const max = maxPurchasePrice({
      prudentValue: 150000,
      worksTotal: 30000,
      otherCosts: 2000,
      marginRate: 0.1,
      notaryRate: 0.08,
    })!
    expect(max).toBeCloseTo(103000 / 1.08, 2)
    // Vérification inverse : au prix max, l'équation est équilibrée.
    expect(max * 1.08 + 30000 + 2000).toBeCloseTo(150000 * 0.9, 2)
  })

  it('clamps to zero when works exceed the prudent value', () => {
    expect(
      maxPurchasePrice({ prudentValue: 50000, worksTotal: 80000, otherCosts: 0, marginRate: 0, notaryRate: 0.08 }),
    ).toBe(0)
  })

  it('returns undefined without a prudent value', () => {
    expect(
      maxPurchasePrice({ prudentValue: undefined, worksTotal: 0, otherCosts: 0, marginRate: 0, notaryRate: 0.08 }),
    ).toBeUndefined()
  })
})

describe('rentalAnalysis', () => {
  it('computes yields and simplified cashflow', () => {
    const result = rentalAnalysis(
      {
        monthlyRent: 600,
        vacancyRate: 0.08,
        annualPropertyTax: 700,
        annualInsurance: 250,
        annualMaintenance: 500,
        monthlyLoanPayment: 450,
      },
      80000,
      100000,
    )
    expect(result.annualRent).toBeCloseTo(6624)
    expect(result.grossYieldOnPrice).toBeCloseTo(7200 / 80000)
    expect(result.grossYieldOnTotal).toBeCloseTo(7200 / 100000)
    expect(result.netYield).toBeCloseTo((6624 - 1450) / 100000)
    expect(result.monthlyCashflow).toBeCloseTo((6624 - 1450) / 12 - 450)
  })

  it('returns nothing without rent input', () => {
    expect(rentalAnalysis(undefined, 80000, 100000)).toEqual({})
  })
})
