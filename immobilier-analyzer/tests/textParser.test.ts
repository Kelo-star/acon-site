import { describe, expect, it } from 'vitest'
import { parseListingText, toNumber } from '../src/services/listingImport/textParser'

const SAMPLE = `Maison 3 pièces 56 m² à vendre
Lens (62300)
Prix : 67 000 €
soit 1 196 €/m²
Maison de ville construite en 1930, 3 pièces, 2 chambres, 1 salle de bain.
Surface habitable de 56 m², terrain de 250 m².
Jardin, garage, cave. Sans balcon.
Double vitrage : oui
Chauffage : gaz
Orientation : sud
DPE : D
GES : E
Taxe foncière : 650 € par an
Montant estimé des dépenses annuelles d'énergie entre 1 100 € et 1 530 €`

describe('toNumber', () => {
  it('parses French number formats', () => {
    expect(toNumber('67 000')).toBe(67000)
    expect(toNumber('67.000')).toBe(67000)
    expect(toNumber('1 196')).toBe(1196)
    expect(toNumber('56,5')).toBe(56.5)
    expect(toNumber('abc')).toBeUndefined()
  })
})

describe('parseListingText', () => {
  const result = parseListingText(SAMPLE, 'https://www.seloger.com/annonces/achat/maison/lens-62300/123456789.htm')

  it('extracts price information', () => {
    expect(result.askingPrice).toBe(67000)
    expect(result.pricePerSquareMeter).toBe(1196)
  })

  it('extracts surfaces', () => {
    expect(result.surface).toBe(56)
    expect(result.landSurface).toBe(250)
  })

  it('extracts rooms', () => {
    expect(result.rooms).toBe(3)
    expect(result.bedrooms).toBe(2)
    expect(result.bathrooms).toBe(1)
  })

  it('extracts location', () => {
    expect(result.city).toBe('Lens')
    expect(result.postalCode).toBe('62300')
  })

  it('extracts energy diagnostics and costs', () => {
    expect(result.dpe).toBe('D')
    expect(result.ges).toBe('E')
    expect(result.energyCostMin).toBe(1100)
    expect(result.energyCostMax).toBe(1530)
  })

  it('extracts taxes and construction year', () => {
    expect(result.propertyTax).toBe(650)
    expect(result.constructionYear).toBe(1930)
  })

  it('extracts amenities including negations', () => {
    expect(result.garden).toBe(true)
    expect(result.garage).toBe(true)
    expect(result.cellar).toBe(true)
    expect(result.balcony).toBe(false)
    expect(result.doubleGlazing).toBe(true)
  })

  it('extracts heating, orientation and property type', () => {
    expect(result.heating?.toLowerCase()).toContain('gaz')
    expect(result.orientation).toBe('sud')
    expect(result.propertyType).toBe('Maison')
  })

  it('keeps title, description, provenance and asks for validation', () => {
    expect(result.title).toBe('Maison 3 pièces 56 m² à vendre')
    expect(result.description).toContain('Maison de ville')
    expect(result.source).toBe('SeLoger')
    expect(result.sourceUrl).toContain('seloger.com')
    expect(result.importedAt).toBeTruthy()
    expect(result.warnings.length).toBeGreaterThan(0)
  })

  it('handles negated features and missing fields', () => {
    const sparse = parseListingText('Appartement lumineux, pas de garage, sans cave.')
    expect(sparse.propertyType).toBe('Appartement')
    expect(sparse.garage).toBe(false)
    expect(sparse.cellar).toBe(false)
    expect(sparse.askingPrice).toBeUndefined()
    expect(sparse.source).toBe('Texte collé')
    expect(sparse.warnings.some((w) => w.includes('Prix non détecté'))).toBe(true)
  })

  it('computes price per square meter when absent', () => {
    const computed = parseListingText('Maison 100 m², prix : 200 000 €')
    expect(computed.pricePerSquareMeter).toBe(2000)
    expect(computed.warnings.some((w) => w.includes('calculé'))).toBe(true)
  })
})
