/**
 * Pont entre le système d'import d'annonces et le modèle Property :
 * transforme un ListingImportResult validé par l'utilisateur en dossier
 * de bien, en conservant la provenance de chaque champ importé.
 */
import type { ListingImportResult } from './types'
import type { FieldProvenance, Property } from '../../models/property'
import { createEmptyProperty } from '../../models/property'
import { createId } from '../../utils/id'

/** Champs de l'annonce repris tels quels dans la fiche, avec leur cible. */
const GENERAL_KEYS = [
  'address',
  'postalCode',
  'propertyType',
  'surface',
  'landSurface',
  'rooms',
  'bedrooms',
  'bathrooms',
  'constructionYear',
] as const

const INFO_KEYS = [
  'dpe',
  'ges',
  'propertyTax',
  'orientation',
  'condominiumFees',
  'garden',
  'garage',
  'parking',
  'cellar',
  'attic',
  'balcony',
] as const

function provenanceOf(result: ListingImportResult): FieldProvenance {
  return {
    origin: 'listing',
    source: result.source,
    sourceUrl: result.sourceUrl,
    importedAt: result.importedAt,
    confidence: 'medium',
  }
}

/**
 * Crée un bien à partir d'un import validé sur l'écran de vérification.
 * @param changedFields  champs corrigés à la main (provenance « manual »)
 */
export function propertyFromImport(
  result: ListingImportResult,
  changedFields: Set<string> = new Set(),
): Property {
  const now = new Date().toISOString()
  const property = createEmptyProperty(
    createId(),
    result.title ?? 'Bien importé',
    result.city ?? '',
    now,
  )

  const mark = (key: string, value: unknown) => {
    if (value === undefined || value === '') return false
    property.provenance[key] = changedFields.has(key)
      ? { origin: 'manual' }
      : provenanceOf(result)
    return true
  }

  if (mark('title', result.title)) property.general.title = result.title!
  if (mark('city', result.city)) property.general.city = result.city!
  for (const key of GENERAL_KEYS) {
    const value = result[key]
    if (mark(key, value)) (property.general as unknown as Record<string, unknown>)[key] = value
  }
  for (const key of INFO_KEYS) {
    const value = result[key]
    if (mark(key, value)) (property.info as unknown as Record<string, unknown>)[key] = value
  }
  if (mark('askingPrice', result.askingPrice)) property.prices.askingPrice = result.askingPrice
  if (mark('agency', result.agencyName)) property.visit.agency = result.agencyName
  if (mark('agentName', result.agentName)) property.visit.agentName = result.agentName
  if (result.description) property.notes = result.description

  if (result.sourceUrl || result.source !== 'Texte collé') {
    property.listing = {
      source: result.source,
      sourceUrl: result.sourceUrl,
      importedAt: result.importedAt,
    }
  }
  property.snapshots = [
    {
      date: result.importedAt,
      askingPrice: result.askingPrice,
      title: result.title,
      description: result.description,
      status: 'active',
    },
  ]
  return property
}

/**
 * Met à jour un bien existant depuis un nouvel import de la même annonce
 * (option « Mettre à jour les informations » de la détection de doublon).
 * Les champs corrigés manuellement auparavant ne sont pas écrasés ;
 * un nouveau snapshot est ajouté à l'historique.
 */
export function updatePropertyFromImport(
  property: Property,
  result: ListingImportResult,
  changedFields: Set<string> = new Set(),
): Property {
  const fresh = propertyFromImport(result, changedFields)
  const updated: Property = structuredClone(property)

  const canOverwrite = (key: string) =>
    changedFields.has(key) || updated.provenance[key]?.origin !== 'manual'

  const merge = (target: Record<string, unknown>, source: Record<string, unknown>) => {
    for (const [key, value] of Object.entries(source)) {
      if (value === undefined || value === '') continue
      if (!canOverwrite(key)) continue
      target[key] = value
      updated.provenance[key] = fresh.provenance[key]
    }
  }
  merge(updated.general as unknown as Record<string, unknown>, fresh.general as unknown as Record<string, unknown>)
  merge(updated.info as unknown as Record<string, unknown>, fresh.info as unknown as Record<string, unknown>)
  merge(updated.prices as unknown as Record<string, unknown>, fresh.prices as unknown as Record<string, unknown>)

  updated.listing = fresh.listing ?? updated.listing
  updated.snapshots = [...updated.snapshots, ...fresh.snapshots]
  return updated
}
