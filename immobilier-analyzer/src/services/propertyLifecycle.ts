/**
 * Création et mise à jour des biens à partir d'un import validé.
 *
 * Règle centrale : une donnée issue de l'annonce n'écrase JAMAIS
 * silencieusement une information constatée en visite ou tirée d'un
 * document. Les champs protégés sont ignorés et remontés à l'appelant.
 */
import type { ListingImportResult } from './listingImport/types'
import type {
  FieldProvenance,
  ListingSnapshot,
  Property,
  PropertyData,
} from '../types/property'
import { createId } from './propertyStore'

const PROTECTED_ORIGINS = new Set(['visit', 'document'])

function definedKeys(values: PropertyData): (keyof PropertyData)[] {
  return (Object.keys(values) as (keyof PropertyData)[]).filter(
    (key) => values[key] !== undefined && values[key] !== '',
  )
}

function provenanceFor(
  key: keyof PropertyData,
  base: ListingImportResult | null,
  changedFields: Set<string>,
): FieldProvenance {
  const cameFromImport = base !== null && base[key] !== undefined && !changedFields.has(key)
  if (!cameFromImport) return { origin: 'manual' }
  return {
    origin: 'listing',
    source: base.source,
    sourceUrl: base.sourceUrl,
    importedAt: base.importedAt,
    confidence: 'medium',
  }
}

function snapshotFrom(values: PropertyData, date: string): ListingSnapshot {
  return {
    date,
    askingPrice: values.askingPrice,
    title: values.title,
    description: values.description,
    status: 'active',
  }
}

/**
 * Crée un bien depuis l'écran de vérification.
 * @param base    résultat d'import d'origine (null pour la saisie manuelle)
 * @param values  valeurs validées/corrigées par l'utilisateur
 * @param changedFields  champs modifiés à la main sur l'écran de vérification
 */
export function createPropertyFromReview(options: {
  base: ListingImportResult | null
  values: PropertyData
  changedFields?: Set<string>
  now?: string
}): Property {
  const { base, values } = options
  const changedFields = options.changedFields ?? new Set<string>()
  const now = options.now ?? new Date().toISOString()

  const data: PropertyData = {}
  const provenance: Property['provenance'] = {}
  for (const key of definedKeys(values)) {
    ;(data as Record<string, unknown>)[key] = values[key]
    provenance[key] = provenanceFor(key, base, changedFields)
  }

  return {
    id: createId(),
    createdAt: now,
    updatedAt: now,
    data,
    provenance,
    listing: base
      ? { source: base.source, sourceUrl: base.sourceUrl, importedAt: base.importedAt }
      : undefined,
    snapshots: base ? [snapshotFrom(values, base.importedAt)] : [],
    observations: [],
  }
}

/**
 * Met à jour un bien existant depuis un nouvel import validé
 * (option « Mettre à jour les informations » de la détection de doublon,
 * et base de la future fonction « Mettre à jour depuis l'annonce »).
 *
 * Retourne le bien mis à jour et la liste des champs protégés qui n'ont
 * pas été modifiés parce qu'une observation (visite/document) les couvre.
 */
export function updatePropertyFromReview(options: {
  property: Property
  base: ListingImportResult
  values: PropertyData
  changedFields?: Set<string>
  now?: string
}): { property: Property; skippedFields: (keyof PropertyData)[] } {
  const { property, base, values } = options
  const changedFields = options.changedFields ?? new Set<string>()
  const now = options.now ?? new Date().toISOString()

  const data: PropertyData = { ...property.data }
  const provenance: Property['provenance'] = { ...property.provenance }
  const skippedFields: (keyof PropertyData)[] = []

  for (const key of definedKeys(values)) {
    const existingOrigin = provenance[key]?.origin
    const userEdited = changedFields.has(key)
    // Ne jamais écraser silencieusement une observation : seul un champ
    // explicitement corrigé par l'utilisateur peut remplacer sa valeur.
    if (existingOrigin && PROTECTED_ORIGINS.has(existingOrigin) && !userEdited) {
      if (data[key] !== values[key]) skippedFields.push(key)
      continue
    }
    ;(data as Record<string, unknown>)[key] = values[key]
    provenance[key] = provenanceFor(key, base, changedFields)
  }

  return {
    property: {
      ...property,
      data,
      provenance,
      updatedAt: now,
      listing: { source: base.source, sourceUrl: base.sourceUrl, importedAt: base.importedAt },
      snapshots: [...property.snapshots, snapshotFrom(values, base.importedAt)],
    },
    skippedFields,
  }
}
