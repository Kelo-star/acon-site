/**
 * Point d'entrée du système d'import d'annonces.
 *
 * - Un registre de providers (un par plateforme + un générique) route
 *   chaque URL vers l'adaptateur capable de la traiter.
 * - Le frontend n'appelle que l'abstraction ListingImportService :
 *   LocalListingImportService en V1, ApiListingImportService quand un
 *   backend existera (POST /api/listing/import), sans changer l'UI.
 */
import type { ListingImporter, ListingImportResult, ListingImportService } from './types'
import { genericProvider } from './providers/genericProvider'
import { leboncoinProvider } from './providers/leboncoinProvider'
import { selogerProvider } from './providers/selogerProvider'
import { parseListingText } from './textParser'

/** Registre ordonné : providers spécifiques d'abord, générique en dernier. */
const providers: ListingImporter[] = [leboncoinProvider, selogerProvider, genericProvider]

/** Retourne le premier provider capable de traiter cette URL. */
export function findProvider(url: string): ListingImporter | undefined {
  return providers.find((p) => p.canHandle(url))
}

/** Enregistre un provider supplémentaire (avant le générique). */
export function registerProvider(provider: ListingImporter): void {
  providers.splice(providers.length - 1, 0, provider)
}

/** V1 : tout se passe dans le navigateur, sans backend. */
export class LocalListingImportService implements ListingImportService {
  async import(url: string): Promise<ListingImportResult> {
    const provider = findProvider(url)
    if (!provider) {
      throw new Error("URL non reconnue : collez une adresse complète commençant par http(s)://")
    }
    return provider.importListing(url)
  }

  async importFromText(text: string, sourceUrl?: string): Promise<ListingImportResult> {
    if (!text.trim()) {
      throw new Error("Le texte de l'annonce est vide.")
    }
    const result = parseListingText(text, sourceUrl)
    // Si une URL est fournie en plus du texte, on complète avec les indices
    // de l'URL sans jamais écraser ce que le texte a permis d'extraire.
    if (sourceUrl) {
      const provider = findProvider(sourceUrl)
      if (provider) {
        const fromUrl = await provider.importListing(sourceUrl)
        for (const [key, value] of Object.entries(fromUrl)) {
          if (['source', 'sourceUrl', 'importedAt', 'warnings', 'rawData'].includes(key)) continue
          const k = key as keyof ListingImportResult
          if (result[k] === undefined && value !== undefined) {
            ;(result as unknown as Record<string, unknown>)[key] = value
          }
        }
      }
    }
    return result
  }
}

/**
 * V2 (préparé, non branché) : délègue l'import à un backend qui, lui,
 * pourra télécharger et analyser les pages dans les règles.
 *
 *   POST {baseUrl}/listing/import        body: { url }
 *   POST {baseUrl}/listing/import-text   body: { text, sourceUrl? }
 *   → ListingImportResult
 */
export class ApiListingImportService implements ListingImportService {
  constructor(private readonly baseUrl: string = '/api') {}

  async import(url: string): Promise<ListingImportResult> {
    return this.post('/listing/import', { url })
  }

  async importFromText(text: string, sourceUrl?: string): Promise<ListingImportResult> {
    return this.post('/listing/import-text', { text, sourceUrl })
  }

  private async post(path: string, body: unknown): Promise<ListingImportResult> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!response.ok) {
      throw new Error(`Échec de l'import (${response.status})`)
    }
    return (await response.json()) as ListingImportResult
  }
}

/**
 * Fabrique du service d'import. L'UI ne connaît que cette fonction :
 * pour basculer sur le backend en V2, définir VITE_IMPORT_API_URL.
 */
export function createListingImportService(): ListingImportService {
  const apiUrl =
    typeof import.meta !== 'undefined' && import.meta.env
      ? (import.meta.env.VITE_IMPORT_API_URL as string | undefined)
      : undefined
  return apiUrl ? new ApiListingImportService(apiUrl) : new LocalListingImportService()
}
