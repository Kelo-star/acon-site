/**
 * Export / import JSON, pour ne jamais dépendre du navigateur.
 * Les données exportées portent un schemaVersion pour gérer les
 * évolutions futures. Les imports sont validés avant enregistrement.
 *
 * Limite V1 : les fichiers photo (blobs IndexedDB) ne sont pas inclus
 * dans le JSON ; seules leurs métadonnées le sont.
 */
import type { Property } from '../models/property'
import { normalizeProperty } from '../models/property'

export const SCHEMA_VERSION = 2

export interface PropertyExport {
  schemaVersion: number
  type: 'property'
  exportedAt: string
  property: Property
}

export interface BackupExport {
  schemaVersion: number
  type: 'backup'
  exportedAt: string
  properties: Property[]
}

export function exportProperty(property: Property): string {
  const payload: PropertyExport = {
    schemaVersion: SCHEMA_VERSION,
    type: 'property',
    exportedAt: new Date().toISOString(),
    property,
  }
  return JSON.stringify(payload, null, 2)
}

export function exportAll(properties: Property[]): string {
  const payload: BackupExport = {
    schemaVersion: SCHEMA_VERSION,
    type: 'backup',
    exportedAt: new Date().toISOString(),
    properties,
  }
  return JSON.stringify(payload, null, 2)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function validateRawProperty(raw: unknown, index?: number): Property {
  const where = index === undefined ? '' : ` (bien n° ${index + 1})`
  if (!isRecord(raw)) throw new Error(`Données de bien invalides${where}.`)
  if (typeof raw.id !== 'string' || raw.id.length === 0) {
    throw new Error(`Identifiant manquant${where}.`)
  }
  if (!isRecord(raw.general) || typeof raw.general.title !== 'string') {
    throw new Error(`Informations générales invalides${where} : titre manquant.`)
  }
  for (const key of ['anomalies', 'rooms', 'renovations', 'questions', 'photos', 'snapshots']) {
    if (raw[key] !== undefined && !Array.isArray(raw[key])) {
      throw new Error(`Champ « ${key} » invalide${where}.`)
    }
  }
  for (const key of ['inspection', 'documents', 'prices', 'info', 'visit']) {
    if (raw[key] !== undefined && !isRecord(raw[key])) {
      throw new Error(`Champ « ${key} » invalide${where}.`)
    }
  }
  return normalizeProperty(raw as Partial<Property> & { id: string })
}

export interface ImportResult {
  type: 'property' | 'backup'
  properties: Property[]
}

/** Analyse et valide un fichier JSON exporté (bien seul ou sauvegarde). */
export function parseImport(json: string): ImportResult {
  let data: unknown
  try {
    data = JSON.parse(json)
  } catch {
    throw new Error('Fichier illisible : ce n’est pas du JSON valide.')
  }
  if (!isRecord(data)) throw new Error('Format inattendu.')

  const version = data.schemaVersion
  if (typeof version !== 'number') {
    throw new Error('schemaVersion manquant : ce fichier ne vient pas de cette application.')
  }
  if (version > SCHEMA_VERSION) {
    throw new Error(
      `Ce fichier vient d'une version plus récente de l'application (schéma ${version} > ${SCHEMA_VERSION}).`,
    )
  }

  if (data.type === 'property') {
    return { type: 'property', properties: [validateRawProperty(data.property)] }
  }
  if (data.type === 'backup') {
    if (!Array.isArray(data.properties)) throw new Error('Sauvegarde invalide : liste absente.')
    return {
      type: 'backup',
      properties: data.properties.map((raw, index) => validateRawProperty(raw, index)),
    }
  }
  throw new Error('Type de fichier inconnu (attendu : property ou backup).')
}

/** Déclenche le téléchargement d'un fichier JSON dans le navigateur. */
export function downloadJson(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}
