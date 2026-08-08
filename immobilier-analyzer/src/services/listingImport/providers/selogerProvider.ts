/**
 * Provider SeLoger : reconnaît les URLs seloger.com et en extrait
 * l'identifiant d'annonce et les indices du slug (ville, code postal,
 * type de bien). Le contenu de la page n'est pas téléchargé
 * (voir genericProvider pour les raisons).
 */
import type { ListingImporter, ListingImportResult } from '../types'
import { parseUrlClues, urlOnlyWarnings } from './genericProvider'

function hostnameOf(url: string): string {
  try {
    return new URL(url.trim()).hostname.toLowerCase()
  } catch {
    return ''
  }
}

export const selogerProvider: ListingImporter = {
  name: 'seloger',

  canHandle(url: string): boolean {
    const host = hostnameOf(url)
    return host === 'seloger.com' || host.endsWith('.seloger.com')
  },

  async importListing(url: string): Promise<ListingImportResult> {
    const trimmed = url.trim()
    const listingId = /(\d{6,})(?:\.htm|\/|$|\?)/.exec(new URL(trimmed).pathname)?.[1]
    return {
      ...parseUrlClues(trimmed),
      source: 'SeLoger',
      sourceUrl: trimmed,
      rawData: { method: 'url', provider: 'seloger', listingId },
      importedAt: new Date().toISOString(),
      warnings: urlOnlyWarnings(),
    }
  },
}
