/**
 * Méthode B : extraction locale d'informations depuis le texte collé d'une
 * annonce, à base de règles simples et d'expressions régulières.
 *
 * Toutes les valeurs extraites sont ensuite proposées à l'utilisateur pour
 * validation : ce parseur n'a jamais le dernier mot.
 */
import type { ListingFields, ListingImportResult } from './types'
import { sourceNameFromUrl } from './sources'

const NBSP = /[  ]/g

/** Convertit "67 000", "67.000", "1 196,50" en nombre. */
export function toNumber(raw: string): number | undefined {
  let s = raw.replace(NBSP, ' ').trim().replace(/\s+/g, '')
  if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '')
  s = s.replace(',', '.')
  const n = Number(s)
  return Number.isFinite(n) ? n : undefined
}

const AMOUNT = String.raw`\d{1,3}(?:[   .]\d{3})+|\d+(?:[.,]\d+)?`

function matchNumber(text: string, pattern: RegExp): number | undefined {
  const m = pattern.exec(text)
  return m ? toNumber(m[1]) : undefined
}

/**
 * Détecte une caractéristique booléenne en tenant compte des négations
 * ("sans garage", "pas de jardin") et des mentions explicites ("… : non").
 */
function detectFeature(text: string, pattern: RegExp): boolean | undefined {
  const re = new RegExp(pattern.source, pattern.flags.includes('g') ? pattern.flags : pattern.flags + 'g')
  const m = re.exec(text)
  if (!m) return undefined
  const before = text.slice(Math.max(0, m.index - 15), m.index)
  if (/(sans|pas\s+de|aucune?)\s*$/i.test(before)) return false
  const after = text.slice(m.index + m[0].length, m.index + m[0].length + 12)
  if (/^\s*[:=]?\s*non\b/i.test(after)) return false
  return true
}

function detectPrice(text: string): { askingPrice?: number; pricePerSquareMeter?: number } {
  const out: { askingPrice?: number; pricePerSquareMeter?: number } = {}

  const perM2 = new RegExp(String.raw`(${AMOUNT})\s*€\s*(?:\/|par\s+)m[²2]`, 'i')
  out.pricePerSquareMeter = matchNumber(text, perM2)

  // 1. Prix étiqueté explicitement.
  const labeled = new RegExp(String.raw`prix(?:\s+de\s+vente)?\s*[:=]?\s*(${AMOUNT})\s*€`, 'i')
  const labeledPrice = matchNumber(text, labeled)
  if (labeledPrice !== undefined) {
    out.askingPrice = labeledPrice
    return out
  }

  // 2. Sinon : le plus grand montant en € hors contextes parasites
  //    (taxe, charges, dépenses d'énergie, loyer, prix au m²…).
  const amountRe = new RegExp(String.raw`(${AMOUNT})\s*€`, 'gi')
  let best: number | undefined
  for (let m = amountRe.exec(text); m; m = amountRe.exec(text)) {
    const before = text.slice(Math.max(0, m.index - 60), m.index).toLowerCase()
    const after = text.slice(m.index + m[0].length, m.index + m[0].length + 10)
    if (/(taxe|charge|d[ée]pense|[ée]nergie|loyer|honoraire|caution|entre|\bet\b)[^.]*$/i.test(before)) continue
    if (/^\s*(?:\/|par\s+)m[²2]/i.test(after) || /^\s*(?:\/|par\s+)(?:mois|an)/i.test(after)) continue
    const value = toNumber(m[1])
    if (value !== undefined && value >= 5000 && (best === undefined || value > best)) best = value
  }
  out.askingPrice = best
  return out
}

function detectLocation(text: string): { city?: string; postalCode?: string; address?: string } {
  const out: { city?: string; postalCode?: string; address?: string } = {}

  const labeledCity = /ville\s*[:=]\s*([A-Za-zÀ-ÿ' -]{2,40})/i.exec(text)
  if (labeledCity) out.city = labeledCity[1].trim()
  const labeledPostal = /code\s+postal\s*[:=]\s*(\d{5})/i.exec(text)
  if (labeledPostal) out.postalCode = labeledPostal[1]

  // "Lens (62300)"
  if (!out.city || !out.postalCode) {
    const m = /([A-ZÀ-Ÿ][A-Za-zÀ-ÿ' -]{1,40}?)\s*\(\s*(\d{5})\s*\)/.exec(text)
    if (m) {
      out.city = out.city ?? m[1].trim()
      out.postalCode = out.postalCode ?? m[2]
    }
  }

  // "62300 Lens"
  if (!out.city || !out.postalCode) {
    const m = /\b(\d{5})\s+([A-ZÀ-Ÿ][A-Za-zÀ-ÿ'-]+(?:[ -][A-ZÀ-Ÿ][A-Za-zÀ-ÿ'-]+)*)/.exec(text)
    if (m) {
      out.postalCode = out.postalCode ?? m[1]
      out.city = out.city ?? m[2].trim()
    }
  }

  const addr = /adresse\s*[:=]\s*([^\n]{5,120})/i.exec(text)
  if (addr) out.address = addr[1].trim()

  return out
}

function detectEnergyCosts(text: string): { energyCostMin?: number; energyCostMax?: number } {
  const re = new RegExp(String.raw`entre\s+(${AMOUNT})\s*€\s+et\s+(${AMOUNT})\s*€`, 'gi')
  for (let m = re.exec(text); m; m = re.exec(text)) {
    const context = text.slice(Math.max(0, m.index - 120), m.index + m[0].length + 40)
    if (/[ée]nerg/i.test(context)) {
      return { energyCostMin: toNumber(m[1]), energyCostMax: toNumber(m[2]) }
    }
  }
  return {}
}

const PROPERTY_TYPES = [
  'appartement', 'maison', 'studio', 'loft', 'villa', 'duplex', 'triplex',
  'terrain', 'immeuble', 'ferme', 'longère', 'château', 'pavillon', 'chalet',
]

/** Analyse le texte d'une annonce et retourne un résultat normalisé. */
export function parseListingText(text: string, sourceUrl?: string): ListingImportResult {
  const warnings: string[] = []
  const fields: ListingFields = {}

  const firstLine = text.split('\n').map((l) => l.trim()).find((l) => l.length > 0)
  if (firstLine && firstLine.length <= 120) fields.title = firstLine

  const typeRe = new RegExp(`\\b(${PROPERTY_TYPES.join('|')})\\b`, 'i')
  const typeMatch = typeRe.exec(text)
  if (typeMatch) {
    const t = typeMatch[1].toLowerCase()
    fields.propertyType = t.charAt(0).toUpperCase() + t.slice(1)
  }

  Object.assign(fields, detectPrice(text), detectLocation(text), detectEnergyCosts(text))

  fields.surface =
    matchNumber(text, /(?:surface(?:\s+habitable)?|superficie)\s*(?:de\s+|d'environ\s+)?[:=]?\s*(\d+(?:[.,]\d+)?)\s*m[²2]/i) ??
    (() => {
      const re = /(\d+(?:[.,]\d+)?)\s*m[²2]/g
      for (let m = re.exec(text); m; m = re.exec(text)) {
        const before = text.slice(Math.max(0, m.index - 30), m.index)
        const after = text.slice(m.index + m[0].length, m.index + m[0].length + 15)
        if (/terrain|parcelle|jardin/i.test(before) || /^\s*de\s+(terrain|parcelle|jardin)/i.test(after)) continue
        return toNumber(m[1])
      }
      return undefined
    })()

  fields.landSurface =
    matchNumber(text, /(?:terrain|parcelle)\s*(?:de\s+|d'environ\s+)?[:=]?\s*(\d+(?:[.,]\d+)?)\s*m[²2]/i) ??
    matchNumber(text, /(\d+(?:[.,]\d+)?)\s*m[²2]\s+de\s+(?:terrain|parcelle)/i)

  fields.rooms =
    matchNumber(text, /(\d+)\s*pi[èe]ces?\b/i) ??
    matchNumber(text, /\b[TF](\d)\b/)
  fields.bedrooms = matchNumber(text, /(\d+)\s*chambres?\b/i)
  fields.bathrooms =
    matchNumber(text, /(\d+)\s*salles?\s+de\s+bains?\b/i) ??
    matchNumber(text, /(\d+)\s*salles?\s+d'eau\b/i)

  fields.constructionYear =
    matchNumber(text, /construite?s?\s+en\s+((?:18|19|20)\d{2})/i) ??
    matchNumber(text, /ann[ée]e\s+de\s+construction\s*[:=]?\s*((?:18|19|20)\d{2})/i) ??
    matchNumber(text, /\bconstruction\s*[:=]\s*((?:18|19|20)\d{2})/i)

  const dpe = /(?:\bDPE\b|classe\s+[ée]nerg(?:ie|[ée]tique))\s*[:=\-]?\s*([A-G])\b/i.exec(text)
  if (dpe) fields.dpe = dpe[1].toUpperCase()
  const ges = /(?:\bGES\b|classe\s+climat|[ée]missions?\s+de\s+GES)\s*[:=\-]?\s*([A-G])\b/i.exec(text)
  if (ges) fields.ges = ges[1].toUpperCase()

  fields.propertyTax = matchNumber(
    text,
    new RegExp(String.raw`taxe\s+fonci[èe]re\s*[^0-9€\n]{0,20}(${AMOUNT})\s*€`, 'i'),
  )
  fields.condominiumFees = matchNumber(
    text,
    new RegExp(String.raw`charges?\s+(?:annuelles?\s+)?(?:de\s+)?copropri[ée]t[ée]\s*[^0-9€\n]{0,20}(${AMOUNT})\s*€`, 'i'),
  )

  fields.garden = detectFeature(text, /jardin/i)
  fields.garage = detectFeature(text, /garage/i)
  fields.parking = detectFeature(text, /parking|place\s+de\s+stationnement/i)
  fields.cellar = detectFeature(text, /\bcave\b/i)
  fields.attic = detectFeature(text, /grenier|combles/i)
  fields.balcony = detectFeature(text, /balcon/i)
  fields.doubleGlazing = detectFeature(text, /double\s+vitrage/i)

  const heating = /chauffage\s*(?:individuel|collectif)?\s*[:=]?\s*(?:au\s+|à\s+|électrique\b)?([^\n.,;]{2,40})/i.exec(text)
  if (heating) {
    const label = /chauffage\s*[^\n.,;]*/i.exec(text)
    fields.heating = (label ? label[0] : heating[0]).replace(/^chauffage\s*[:=]?\s*/i, '').trim()
  }

  const orientation = /(?:orient[ée]e?\s*|exposition\s*|orientation\s*)[:=]?\s*(sud-ouest|sud-est|nord-ouest|nord-est|sud|nord|est|ouest)/i.exec(text)
  if (orientation) fields.orientation = orientation[1].toLowerCase()

  const agency = /agence\s*[:=]\s*([^\n]{2,60})/i.exec(text)
  if (agency) fields.agencyName = agency[1].trim()

  fields.description = text.trim()

  if (fields.askingPrice !== undefined && fields.surface && fields.pricePerSquareMeter === undefined) {
    fields.pricePerSquareMeter = Math.round(fields.askingPrice / fields.surface)
    warnings.push('Le prix au m² a été calculé à partir du prix et de la surface.')
  }

  if (fields.askingPrice === undefined) warnings.push('Prix non détecté dans le texte.')
  if (fields.surface === undefined) warnings.push('Surface non détectée dans le texte.')
  if (!fields.city) warnings.push('Ville non détectée dans le texte.')
  warnings.push('Extraction automatique par règles simples : vérifiez chaque valeur avant de créer le bien.')

  // Nettoie les champs restés indéfinis pour garder un objet compact.
  for (const key of Object.keys(fields) as (keyof ListingFields)[]) {
    if (fields[key] === undefined) delete fields[key]
  }

  return {
    ...fields,
    source: sourceUrl ? sourceNameFromUrl(sourceUrl) : 'Texte collé',
    sourceUrl: sourceUrl ?? '',
    rawData: { method: 'text', textLength: text.length },
    importedAt: new Date().toISOString(),
    warnings,
  }
}
