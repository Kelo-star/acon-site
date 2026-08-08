/** Normalisation d'URL d'annonce et détection de doublon. */
import type { Property } from '../models/property'

export function normalizeSourceUrl(url: string): string {
  const trimmed = url.trim()
  if (!trimmed) return ''
  try {
    const u = new URL(trimmed)
    for (const param of [...u.searchParams.keys()]) {
      if (/^(utm_|fbclid|gclid|mtm_)/i.test(param)) u.searchParams.delete(param)
    }
    const query = u.searchParams.toString()
    return u.origin.toLowerCase() + u.pathname.replace(/\/+$/, '') + (query ? `?${query}` : '')
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
