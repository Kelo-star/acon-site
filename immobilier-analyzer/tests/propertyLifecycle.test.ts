import { describe, expect, it } from 'vitest'
import {
  createPropertyFromReview,
  updatePropertyFromReview,
} from '../src/services/propertyLifecycle'
import type { ListingImportResult } from '../src/services/listingImport/types'

const baseImport: ListingImportResult = {
  source: 'SeLoger',
  sourceUrl: 'https://www.seloger.com/annonces/123.htm',
  askingPrice: 75000,
  surface: 56,
  city: 'Lens',
  title: 'Maison 3 pièces',
  importedAt: '2026-04-12T10:00:00.000Z',
  warnings: [],
}

describe('createPropertyFromReview', () => {
  it('tracks provenance of imported vs manually corrected fields', () => {
    const property = createPropertyFromReview({
      base: baseImport,
      values: { askingPrice: 75000, surface: 58, city: 'Lens' },
      changedFields: new Set(['surface']),
    })
    expect(property.provenance.askingPrice?.origin).toBe('listing')
    expect(property.provenance.askingPrice?.source).toBe('SeLoger')
    expect(property.provenance.askingPrice?.sourceUrl).toBe(baseImport.sourceUrl)
    expect(property.provenance.askingPrice?.importedAt).toBe(baseImport.importedAt)
    expect(property.provenance.surface?.origin).toBe('manual')
    expect(property.listing?.source).toBe('SeLoger')
  })

  it('records an initial listing snapshot', () => {
    const property = createPropertyFromReview({
      base: baseImport,
      values: { askingPrice: 75000, title: 'Maison 3 pièces' },
    })
    expect(property.snapshots).toHaveLength(1)
    expect(property.snapshots[0].askingPrice).toBe(75000)
    expect(property.snapshots[0].date).toBe(baseImport.importedAt)
  })

  it('creates a fully manual property without listing reference', () => {
    const property = createPropertyFromReview({ base: null, values: { city: 'Douai' } })
    expect(property.listing).toBeUndefined()
    expect(property.snapshots).toHaveLength(0)
    expect(property.provenance.city?.origin).toBe('manual')
  })
})

describe('updatePropertyFromReview', () => {
  it('updates listing-sourced fields and appends a snapshot', () => {
    const property = createPropertyFromReview({
      base: baseImport,
      values: { askingPrice: 75000, surface: 56 },
    })
    const newImport: ListingImportResult = {
      ...baseImport,
      askingPrice: 67000,
      importedAt: '2026-08-08T10:00:00.000Z',
    }
    const { property: updated, skippedFields } = updatePropertyFromReview({
      property,
      base: newImport,
      values: { askingPrice: 67000, surface: 56 },
    })
    expect(updated.data.askingPrice).toBe(67000)
    expect(skippedFields).toEqual([])
    expect(updated.snapshots.map((s) => s.askingPrice)).toEqual([75000, 67000])
  })

  it('never silently overwrites visit or document observations', () => {
    const property = createPropertyFromReview({
      base: baseImport,
      values: { askingPrice: 75000, surface: 56 },
    })
    // La surface a été re-mesurée pendant la visite.
    property.data.surface = 52
    property.provenance.surface = { origin: 'visit' }

    const { property: updated, skippedFields } = updatePropertyFromReview({
      property,
      base: { ...baseImport, importedAt: '2026-08-08T10:00:00.000Z' },
      values: { askingPrice: 72000, surface: 56 },
    })
    expect(updated.data.surface).toBe(52)
    expect(updated.provenance.surface?.origin).toBe('visit')
    expect(updated.data.askingPrice).toBe(72000)
    expect(skippedFields).toEqual(['surface'])
  })

  it('lets the user explicitly override a protected field', () => {
    const property = createPropertyFromReview({ base: baseImport, values: { surface: 56 } })
    property.provenance.surface = { origin: 'visit' }
    const { property: updated, skippedFields } = updatePropertyFromReview({
      property,
      base: baseImport,
      values: { surface: 60 },
      changedFields: new Set(['surface']),
    })
    expect(updated.data.surface).toBe(60)
    expect(updated.provenance.surface?.origin).toBe('manual')
    expect(skippedFields).toEqual([])
  })
})
