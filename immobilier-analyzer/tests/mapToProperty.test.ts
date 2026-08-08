import { describe, expect, it } from 'vitest'
import type { ListingImportResult } from '../src/services/listingImport/types'
import {
  propertyFromImport,
  updatePropertyFromImport,
} from '../src/services/listingImport/mapToProperty'
import { findBySourceUrl, normalizeSourceUrl } from '../src/utils/sourceUrl'

const importResult: ListingImportResult = {
  source: 'SeLoger',
  sourceUrl: 'https://www.seloger.com/annonces/123.htm',
  title: 'Maison 3 pièces',
  city: 'Lens',
  postalCode: '62300',
  askingPrice: 75000,
  surface: 56,
  dpe: 'D',
  garden: true,
  description: 'Belle maison de ville.',
  importedAt: '2026-04-12T10:00:00.000Z',
  warnings: [],
}

describe('propertyFromImport', () => {
  const property = propertyFromImport(importResult, new Set(['surface']))

  it('maps listing fields into the property model', () => {
    expect(property.general.title).toBe('Maison 3 pièces')
    expect(property.general.city).toBe('Lens')
    expect(property.general.surface).toBe(56)
    expect(property.prices.askingPrice).toBe(75000)
    expect(property.info.dpe).toBe('D')
    expect(property.info.garden).toBe(true)
    expect(property.notes).toContain('Belle maison')
  })

  it('keeps the listing reference and an initial snapshot', () => {
    expect(property.listing?.source).toBe('SeLoger')
    expect(property.listing?.sourceUrl).toBe(importResult.sourceUrl)
    expect(property.snapshots).toHaveLength(1)
    expect(property.snapshots[0].askingPrice).toBe(75000)
  })

  it('tracks provenance: imported vs manually corrected fields', () => {
    expect(property.provenance['askingPrice']?.origin).toBe('listing')
    expect(property.provenance['askingPrice']?.source).toBe('SeLoger')
    expect(property.provenance['surface']?.origin).toBe('manual')
  })
})

describe('updatePropertyFromImport', () => {
  it('updates listing fields, protects manual ones, appends a snapshot', () => {
    const property = propertyFromImport(importResult)
    // L'utilisateur corrige la surface à la main plus tard.
    property.general.surface = 52
    property.provenance['surface'] = { origin: 'manual' }

    const updated = updatePropertyFromImport(property, {
      ...importResult,
      askingPrice: 67000,
      surface: 56,
      importedAt: '2026-08-08T10:00:00.000Z',
    })
    expect(updated.prices.askingPrice).toBe(67000)
    expect(updated.general.surface).toBe(52)
    expect(updated.provenance['surface']?.origin).toBe('manual')
    expect(updated.snapshots.map((s) => s.askingPrice)).toEqual([75000, 67000])
  })
})

describe('duplicate detection', () => {
  it('normalizes URLs and finds duplicates by source URL', () => {
    expect(normalizeSourceUrl('https://WWW.SeLoger.com/annonces/123.htm/?utm_source=x#photos')).toBe(
      normalizeSourceUrl('https://www.seloger.com/annonces/123.htm'),
    )
    const property = propertyFromImport(importResult)
    expect(
      findBySourceUrl([property], 'https://www.seloger.com/annonces/123.htm?utm_source=alerte')?.id,
    ).toBe(property.id)
    expect(findBySourceUrl([property], 'https://autre.fr/annonce')).toBeUndefined()
    expect(findBySourceUrl([property], '')).toBeUndefined()
  })
})
