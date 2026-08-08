import { describe, expect, it } from 'vitest'
import { findInconsistencies, valuesConflict } from '../src/services/consistency'
import { createPropertyFromReview } from '../src/services/propertyLifecycle'
import type { ListingImportResult } from '../src/services/listingImport/types'
import type { Observation } from '../src/types/property'

const baseImport: ListingImportResult = {
  source: 'SeLoger',
  sourceUrl: 'https://www.seloger.com/annonces/123.htm',
  doubleGlazing: true,
  surface: 56,
  importedAt: '2026-08-08T10:00:00.000Z',
  warnings: [],
}

function observation(overrides: Partial<Observation>): Observation {
  return {
    id: 'obs-1',
    label: 'Observation',
    value: true,
    origin: 'visit',
    notedAt: '2026-08-09T10:00:00.000Z',
    ...overrides,
  }
}

describe('valuesConflict', () => {
  it('compares booleans, including oui/non strings', () => {
    expect(valuesConflict(true, false)).toBe(true)
    expect(valuesConflict(true, 'non')).toBe(true)
    expect(valuesConflict(true, 'oui')).toBe(false)
  })

  it('compares numbers with a small tolerance', () => {
    expect(valuesConflict(56, 52)).toBe(true)
    expect(valuesConflict(56, 56.4)).toBe(false)
    expect(valuesConflict(56, '52')).toBe(true)
  })

  it('compares strings loosely', () => {
    expect(valuesConflict('Gaz', 'gaz')).toBe(false)
    expect(valuesConflict('Gaz', 'électrique')).toBe(true)
  })
})

describe('findInconsistencies', () => {
  it('flags a contradiction between the listing and a visit observation', () => {
    const property = createPropertyFromReview({
      base: baseImport,
      values: { doubleGlazing: true, surface: 56 },
    })
    property.observations.push(
      observation({
        field: 'doubleGlazing',
        label: 'Fenêtre chambre : simple vitrage',
        value: false,
      }),
    )
    const issues = findInconsistencies(property)
    expect(issues).toHaveLength(1)
    expect(issues[0].field).toBe('doubleGlazing')
    expect(issues[0].declaredOrigin).toBe('listing')
    expect(issues[0].observedOrigin).toBe('visit')
    expect(issues[0].message).toContain('Double vitrage')
  })

  it('does not flag matching observations', () => {
    const property = createPropertyFromReview({
      base: baseImport,
      values: { doubleGlazing: true, surface: 56 },
    })
    property.observations.push(
      observation({ field: 'doubleGlazing', label: 'Double vitrage vérifié', value: true }),
      observation({ id: 'obs-2', field: 'surface', label: 'Surface mesurée', value: 56.3 }),
    )
    expect(findInconsistencies(property)).toHaveLength(0)
  })

  it('flags contradictions between visit and document observations', () => {
    const property = createPropertyFromReview({ base: null, values: {} })
    property.observations.push(
      observation({ id: 'a', field: 'surface', label: 'Surface mesurée en visite', value: 52 }),
      observation({
        id: 'b',
        field: 'surface',
        label: 'Surface du diagnostic',
        value: 56,
        origin: 'document',
      }),
    )
    const issues = findInconsistencies(property)
    expect(issues).toHaveLength(1)
    expect(issues[0].observedOrigin).toBe('document')
  })

  it('ignores observations without a linked field', () => {
    const property = createPropertyFromReview({ base: baseImport, values: { doubleGlazing: true } })
    property.observations.push(observation({ label: 'Belle luminosité', value: 'oui' }))
    expect(findInconsistencies(property)).toHaveLength(0)
  })
})
