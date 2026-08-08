import { describe, expect, it } from 'vitest'
import { createEmptyProperty } from '../src/models/property'
import {
  SCHEMA_VERSION,
  exportAll,
  exportProperty,
  parseImport,
} from '../src/services/importExport'

function sample() {
  const property = createEmptyProperty('p1', 'Maison test', 'Lens', '2026-08-08T00:00:00.000Z')
  property.prices.askingPrice = 67000
  property.inspection['env-bruit'] = { itemId: 'env-bruit', status: 'good' }
  return property
}

describe('export / import round-trip', () => {
  it('round-trips a single property', () => {
    const property = sample()
    const result = parseImport(exportProperty(property))
    expect(result.type).toBe('property')
    expect(result.properties).toHaveLength(1)
    expect(result.properties[0]).toEqual(property)
  })

  it('round-trips a full backup', () => {
    const a = sample()
    const b = createEmptyProperty('p2', 'Appartement', 'Douai', '2026-08-08T00:00:00.000Z')
    const result = parseImport(exportAll([a, b]))
    expect(result.type).toBe('backup')
    expect(result.properties.map((p) => p.id)).toEqual(['p1', 'p2'])
  })

  it('normalizes older/partial payloads with defaults', () => {
    const json = JSON.stringify({
      schemaVersion: 1,
      type: 'property',
      property: { id: 'old-1', general: { title: 'Ancien format', city: 'Lens' } },
    })
    const [property] = parseImport(json).properties
    expect(property.finance.contingencyRate).toBe(0.15)
    expect(property.snapshots).toEqual([])
    expect(property.status).toBe('a-visiter')
  })
})

describe('validation', () => {
  it('rejects invalid JSON', () => {
    expect(() => parseImport('{pas du json')).toThrow(/JSON/)
  })

  it('rejects files without schemaVersion', () => {
    expect(() => parseImport('{"type":"property"}')).toThrow(/schemaVersion/)
  })

  it('rejects newer schema versions', () => {
    const json = JSON.stringify({ schemaVersion: SCHEMA_VERSION + 1, type: 'property', property: {} })
    expect(() => parseImport(json)).toThrow(/plus récente/)
  })

  it('rejects unknown types and malformed properties', () => {
    expect(() => parseImport(JSON.stringify({ schemaVersion: SCHEMA_VERSION, type: 'autre' }))).toThrow(
      /inconnu/,
    )
    expect(() =>
      parseImport(
        JSON.stringify({ schemaVersion: SCHEMA_VERSION, type: 'property', property: { id: 'x' } }),
      ),
    ).toThrow(/titre/)
    expect(() =>
      parseImport(
        JSON.stringify({
          schemaVersion: SCHEMA_VERSION,
          type: 'property',
          property: { id: 'x', general: { title: 'ok' }, anomalies: 'pas-une-liste' },
        }),
      ),
    ).toThrow(/anomalies/)
  })
})
