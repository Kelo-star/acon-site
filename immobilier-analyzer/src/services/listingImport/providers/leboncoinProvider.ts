/**
 * Provider Leboncoin : reconnaît les URLs leboncoin.fr et en extrait
 * l'identifiant d'annonce et les indices du slug. Le contenu de la page
 * n'est pas téléchargé (voir genericProvider pour les raisons).
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

export const leboncoinProvider: ListingImporter = {
  name: 'leboncoin',

  canHandle(url: string): boolean {
    const host = hostnameOf(url)
    return host === 'leboncoin.fr' || host.endsWith('.leboncoin.fr')
  },

  async importListing(url: string): Promise<ListingImportResult> {
    const trimmed = url.trim()
    const adId = /\/(\d{7,12})(?:\.htm|\/|$|\?)/.exec(new URL(trimmed).pathname)?.[1]
    return {
      ...parseUrlClues(trimmed),
      source: 'Leboncoin',
      sourceUrl: trimmed,
      rawData: { method: 'url', provider: 'leboncoin', adId },
      importedAt: new Date().toISOString(),
      warnings: urlOnlyWarnings(),
    }
  },
}
