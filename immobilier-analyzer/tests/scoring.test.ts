import { describe, expect, it } from 'vitest'
import { createEmptyProperty, type Property } from '../src/models/property'
import { ALL_INSPECTION_ITEMS } from '../src/data/inspectionSections'
import {
  computeCompleteness,
  computeScore,
  computeVerdict,
  listRedFlags,
} from '../src/services/scoring'

function baseProperty(): Property {
  return createEmptyProperty('p1', 'Test', 'Lens', '2026-08-08T00:00:00.000Z')
}

function rateAll(property: Property, status: 'good' | 'average' | 'bad') {
  for (const item of ALL_INSPECTION_ITEMS) {
    property.inspection[item.id] = { itemId: item.id, status }
  }
}

describe('computeScore', () => {
  it('returns null when nothing is rated', () => {
    expect(computeScore(baseProperty()).total).toBeNull()
  })

  it('scores high when everything is good', () => {
    const property = baseProperty()
    rateAll(property, 'good')
    property.info.dpe = 'C'
    const score = computeScore(property).total
    expect(score).not.toBeNull()
    expect(score!).toBeGreaterThanOrEqual(85)
  })

  it('scores low when everything is bad', () => {
    const property = baseProperty()
    rateAll(property, 'bad')
    expect(computeScore(property).total!).toBeLessThanOrEqual(15)
  })

  it('weights critical items more than minor ones', () => {
    const critical = baseProperty()
    critical.inspection['struct-fissures'] = { itemId: 'struct-fissures', status: 'bad' }
    critical.inspection['struct-escaliers'] = { itemId: 'struct-escaliers', status: 'good' }

    const minor = baseProperty()
    minor.inspection['struct-fissures'] = { itemId: 'struct-fissures', status: 'good' }
    minor.inspection['struct-escaliers'] = { itemId: 'struct-escaliers', status: 'bad' }

    expect(computeScore(minor).total!).toBeGreaterThan(computeScore(critical).total!)
  })

  it('includes documents and price categories when available', () => {
    const property = baseProperty()
    property.documents['dpe'] = { status: 'received' }
    property.prices.askingPrice = 100000
    property.finance.afterWorksValue.low = 200000
    const categories = computeScore(property).categories
    expect(categories.find((c) => c.id === 'documents')?.score).toBe(1)
    expect(categories.find((c) => c.id === 'price')?.score).toBe(1)
  })
})

describe('computeCompleteness', () => {
  it('counts controlled items, to-check remains unverified', () => {
    const property = baseProperty()
    property.inspection['env-bruit'] = { itemId: 'env-bruit', status: 'good' }
    property.inspection['env-odeurs'] = { itemId: 'env-odeurs', status: 'to-check' }
    property.documents['dpe'] = { status: 'missing' }
    const result = computeCompleteness(property)
    expect(result.totalCount).toBe(ALL_INSPECTION_ITEMS.length)
    expect(result.controlledCount).toBe(1)
    expect(result.toCheckCount).toBe(1)
    expect(result.unverifiedCount).toBe(result.totalCount - 1)
    expect(result.missingDocumentsCount).toBe(1)
    expect(result.ratio).toBeCloseTo(1 / result.totalCount)
  })
})

describe('red flags and verdict', () => {
  it('collects red flags from checklist and anomalies', () => {
    const property = baseProperty()
    property.inspection['struct-fissures'] = {
      itemId: 'struct-fissures',
      status: 'bad',
      redFlag: true,
      comment: 'Fissure traversante',
    }
    property.anomalies.push({
      id: 'a1',
      category: 'Humidité',
      description: 'Infiltration généralisée',
      severity: 'critical',
      redFlag: true,
      photoIds: [],
      createdAt: '2026-08-08T00:00:00.000Z',
    })
    const flags = listRedFlags(property)
    expect(flags).toHaveLength(2)
    expect(flags.map((f) => f.source).sort()).toEqual(['anomalie', 'checklist'])
  })

  it('never lets a good score mask red flags in the verdict', () => {
    const property = baseProperty()
    rateAll(property, 'good')
    expect(computeVerdict(property).level).toBe('tres-interessant')

    property.inspection['struct-fissures'] = { itemId: 'struct-fissures', status: 'bad', redFlag: true }
    property.anomalies.push({
      id: 'a1',
      category: 'Structure',
      description: 'Affaissement',
      severity: 'critical',
      redFlag: true,
      photoIds: [],
      createdAt: '2026-08-08T00:00:00.000Z',
    })
    const verdict = computeVerdict(property)
    expect(['risque-eleve', 'a-eviter']).toContain(verdict.level)
  })

  it('flags low completeness as unreliable', () => {
    const property = baseProperty()
    property.inspection['env-bruit'] = { itemId: 'env-bruit', status: 'good' }
    const verdict = computeVerdict(property)
    expect(verdict.reliability).toBe('low')
    expect(verdict.reliabilityMessage).toContain('peu fiable')
  })

  it('downgrades when the asking price exceeds the computed maximum', () => {
    const property = baseProperty()
    rateAll(property, 'good')
    property.prices.askingPrice = 200000
    property.finance.afterWorksValue.low = 150000
    const verdict = computeVerdict(property)
    expect(verdict.level).not.toBe('tres-interessant')
    expect(verdict.reasons.some((r) => r.includes('prix maximum'))).toBe(true)
  })
})
