/**
 * Provider générique : accepte toute URL http(s).
 *
 * Contrainte assumée : une application 100 % navigateur ne peut pas
 * télécharger le HTML des plateformes (CORS, protections anti-robot,
 * rendu dynamique). On n'installe aucun contournement fragile : ce
 * provider n'exploite que les indices présents dans l'URL elle-même
 * (code postal, ville, type de bien dans le slug) et renvoie des
 * avertissements orientant vers le collage de texte ou le futur backend.
 */
import type { ListingFields, ListingImporter, ListingImportResult } from '../types'
import { sourceNameFromUrl } from '../sources'

const SLUG_STOP_WORDS = new Set([
  'maison', 'appartement', 'studio', 'villa', 'terrain', 'immeuble', 'loft',
  'duplex', 'vente', 'ventes', 'achat', 'acheter', 'location', 'louer',
  'annonce', 'annonces', 'immobilier', 'immobilieres', 'bien', 'a', 'de',
])

const URL_PROPERTY_TYPES = ['appartement', 'maison', 'studio', 'villa', 'terrain', 'immeuble', 'loft', 'duplex']

/** Extrait les indices disponibles dans l'URL (slug, segments). */
export function parseUrlClues(url: string): ListingFields {
  const clues: ListingFields = {}
  let path: string
  try {
    path = decodeURIComponent(new URL(url).pathname).toLowerCase()
  } catch {
    return clues
  }

  for (const type of URL_PROPERTY_TYPES) {
    if (new RegExp(`(^|[-/_])${type}([-/_]|$)`).test(path)) {
      clues.propertyType = type.charAt(0).toUpperCase() + type.slice(1)
      break
    }
  }

  // Motif fréquent dans les slugs : "lens-62300", "maison-lens-62300-…"
  const cityPostal = /([a-zà-ÿ][a-zà-ÿ-]{1,40})-(\d{5})(?!\d)/.exec(path)
  if (cityPostal) {
    clues.postalCode = cityPostal[2]
    const words = cityPostal[1].split('-').filter((w) => w && !SLUG_STOP_WORDS.has(w))
    if (words.length > 0) {
      clues.city = words.map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
    }
  } else {
    const postal = /(^|[-/_])(\d{5})([-/_.]|$)/.exec(path)
    if (postal) clues.postalCode = postal[2]
  }

  return clues
}

/** Avertissements communs aux imports par URL, sans accès au contenu. */
export function urlOnlyWarnings(): string[] {
  return [
    "Le contenu de la page n'a pas pu être analysé depuis le navigateur (CORS, protections anti-robot). Seules les informations présentes dans l'URL ont été utilisées.",
    "Pour un import plus complet, collez le texte de l'annonce (méthode « Coller le texte ») ou attendez le backend d'import (V2).",
  ]
}

export const genericProvider: ListingImporter = {
  name: 'generic',

  canHandle(url: string): boolean {
    return /^https?:\/\/\S+$/i.test(url.trim())
  },

  async importListing(url: string): Promise<ListingImportResult> {
    const trimmed = url.trim()
    return {
      ...parseUrlClues(trimmed),
      source: sourceNameFromUrl(trimmed),
      sourceUrl: trimmed,
      rawData: { method: 'url', provider: 'generic' },
      importedAt: new Date().toISOString(),
      warnings: urlOnlyWarnings(),
    }
  },
}
