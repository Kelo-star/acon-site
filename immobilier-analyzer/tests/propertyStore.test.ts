import { describe, expect, it } from 'vitest'
import {
  findBySourceUrl,
  loadProperties,
  normalizeSourceUrl,
  saveProperties,
  type StorageLike,
} from '../src/services/propertyStore'
import { createPropertyFromReview } from '../src/services/propertyLifecycle'
import type { ListingImportResult } from '../src/services/listingImport/types'

function makeImport(overrides: Partial<ListingImportResult> = {}): ListingImportResult {
  return {
    source: 'SeLoger',
    sourceUrl: 'https://www.seloger.com/annonces/achat/maison/lens-62300/123456789.htm',
    askingPrice: 67000,
    importedAt: '2026-08-08T10:00:00.000Z',
    warnings: [],
    ...overrides,
  }
}

function memoryStorage(): StorageLike {
  const map = new Map<string, string>()
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => void map.set(key, value),
  }
}

describe('normalizeSourceUrl', () => {
  it('ignores tracking params, fragments, trailing slashes and host case', () => {
    const a = normalizeSourceUrl('https://WWW.SeLoger.com/annonces/123.htm/?utm_source=mail#photos')
    const b = normalizeSourceUrl('https://www.seloger.com/annonces/123.htm')
    expect(a).toBe(b)
  })

  it('keeps meaningful query parameters', () => {
    expect(normalizeSourceUrl('https://ex.fr/annonce?id=1')).not.toBe(
      normalizeSourceUrl('https://ex.fr/annonce?id=2'),
    )
  })
})

describe('duplicate detection', () => {
  it('finds an existing property by source URL', () => {
    const property = createPropertyFromReview({ base: makeImport(), values: { askingPrice: 67000 } })
    const found = findBySourceUrl(
      [property],
      'https://www.seloger.com/annonces/achat/maison/lens-62300/123456789.htm?utm_source=alerte',
    )
    expect(found?.id).toBe(property.id)
  })

  it('returns undefined for unknown or empty URLs', () => {
    const property = createPropertyFromReview({ base: makeImport(), values: {} })
    expect(findBySourceUrl([property], 'https://autre.fr/annonce')).toBeUndefined()
    expect(findBySourceUrl([property], '')).toBeUndefined()
  })
})

describe('persistence', () => {
  it('saves and reloads properties', () => {
    const storage = memoryStorage()
    const property = createPropertyFromReview({ base: makeImport(), values: { city: 'Lens' } })
    saveProperties([property], storage)
    const loaded = loadProperties(storage)
    expect(loaded).toHaveLength(1)
    expect(loaded[0].data.city).toBe('Lens')
  })

  it('returns an empty list for corrupted storage', () => {
    const storage = memoryStorage()
    storage.setItem('immobilier-analyzer.properties.v1', '{pas du json')
    expect(loadProperties(storage)).toEqual([])
  })
})
