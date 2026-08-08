import { describe, expect, it } from 'vitest'
import {
  LocalListingImportService,
  findProvider,
} from '../src/services/listingImport/listingImporter'

const service = new LocalListingImportService()

describe('provider routing', () => {
  it('routes Leboncoin URLs to the Leboncoin provider', () => {
    expect(findProvider('https://www.leboncoin.fr/ventes_immobilieres/2894567890.htm')?.name).toBe(
      'leboncoin',
    )
  })

  it('routes SeLoger URLs to the SeLoger provider', () => {
    expect(
      findProvider('https://www.seloger.com/annonces/achat/maison/lens-62300/123456789.htm')?.name,
    ).toBe('seloger')
  })

  it('routes any other http(s) URL to the generic provider', () => {
    expect(findProvider('https://www.pap.fr/annonces/maison-lens-62300-r434700000')?.name).toBe(
      'generic',
    )
    expect(findProvider('https://www.agence-locale.fr/bien/123')?.name).toBe('generic')
  })

  it('rejects non-http URLs', () => {
    expect(findProvider('ftp://exemple.fr/annonce')).toBeUndefined()
    expect(findProvider('pas une url')).toBeUndefined()
  })
})

describe('LocalListingImportService.import', () => {
  it('extracts clues from a SeLoger URL without fetching the page', async () => {
    const result = await service.import(
      'https://www.seloger.com/annonces/achat/maison/lens-62300/123456789.htm',
    )
    expect(result.source).toBe('SeLoger')
    expect(result.city).toBe('Lens')
    expect(result.postalCode).toBe('62300')
    expect(result.propertyType).toBe('Maison')
    expect(result.warnings.length).toBeGreaterThan(0)
  })

  it('names known platforms via the generic provider', async () => {
    const result = await service.import('https://www.pap.fr/annonces/maison-lens-62300-r434700000')
    expect(result.source).toBe('PAP')
    expect(result.postalCode).toBe('62300')
  })

  it('throws for unusable input', async () => {
    await expect(service.import('pas une url')).rejects.toThrow()
  })
})

describe('LocalListingImportService.importFromText', () => {
  it('parses text and merges URL clues without overriding text values', async () => {
    const result = await service.importFromText(
      'Appartement 2 pièces\nPrix : 120 000 €\nSurface : 45 m²',
      'https://www.leboncoin.fr/ventes_immobilieres/maison-douai-59500-123456789.htm',
    )
    expect(result.source).toBe('Leboncoin')
    expect(result.askingPrice).toBe(120000)
    // Le type vient du texte (Appartement), pas du slug de l'URL (maison).
    expect(result.propertyType).toBe('Appartement')
    // Le code postal absent du texte est complété depuis l'URL.
    expect(result.postalCode).toBe('59500')
  })

  it('rejects empty text', async () => {
    await expect(service.importFromText('   ')).rejects.toThrow()
  })
})
