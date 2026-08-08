/**
 * Persistance locale des biens (localStorage) et détection de doublon
 * par URL d'annonce normalisée.
 */
import type { Property } from '../types/property'

const STORAGE_KEY = 'immobilier-analyzer.properties.v1'

/** Sous-ensemble de l'API Storage, injectable dans les tests. */
export interface StorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

function defaultStorage(): StorageLike | undefined {
  return typeof localStorage !== 'undefined' ? localStorage : undefined
}

export function loadProperties(storage: StorageLike | undefined = defaultStorage()): Property[] {
  if (!storage) return []
  try {
    const raw = storage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as Property[]) : []
  } catch {
    return []
  }
}

export function saveProperties(
  properties: Property[],
  storage: StorageLike | undefined = defaultStorage(),
): void {
  storage?.setItem(STORAGE_KEY, JSON.stringify(properties))
}

/**
 * Normalise une URL d'annonce pour la comparaison de doublons :
 * hôte en minuscules, sans fragment, sans barre oblique finale,
 * sans paramètres de tracking.
 */
export function normalizeSourceUrl(url: string): string {
  const trimmed = url.trim()
  if (!trimmed) return ''
  try {
    const u = new URL(trimmed)
    for (const param of [...u.searchParams.keys()]) {
      if (/^(utm_|fbclid|gclid|mtm_)/i.test(param)) u.searchParams.delete(param)
    }
    const query = u.searchParams.toString()
    return (
      u.origin.toLowerCase() +
      u.pathname.replace(/\/+$/, '') +
      (query ? `?${query}` : '')
    )
  } catch {
    return trimmed
  }
}

/** Retourne le bien déjà importé depuis cette URL, s'il existe. */
export function findBySourceUrl(properties: Property[], url: string): Property | undefined {
  const normalized = normalizeSourceUrl(url)
  if (!normalized) return undefined
  return properties.find(
    (p) => p.listing && normalizeSourceUrl(p.listing.sourceUrl) === normalized,
  )
}

export function createId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `id-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`
}
