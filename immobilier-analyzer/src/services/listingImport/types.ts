/**
 * Types du système d'import d'annonces.
 *
 * Ce module est volontairement autonome (aucune dépendance vers le reste de
 * l'application) : il pourra être extrait tel quel vers un backend en V2.
 */

/** Niveau de confiance associé à une valeur importée. */
export type Confidence = 'high' | 'medium' | 'low'

/**
 * Champs normalisés d'une annonce immobilière.
 * Tous les champs sont facultatifs : une annonce ne contient jamais tout.
 */
export interface ListingFields {
  title?: string
  address?: string
  postalCode?: string
  city?: string

  propertyType?: string

  askingPrice?: number
  pricePerSquareMeter?: number
  surface?: number
  landSurface?: number

  rooms?: number
  bedrooms?: number
  bathrooms?: number

  constructionYear?: number

  dpe?: string
  ges?: string

  propertyTax?: number
  condominiumFees?: number

  garden?: boolean
  garage?: boolean
  parking?: boolean
  cellar?: boolean
  attic?: boolean
  balcony?: boolean
  doubleGlazing?: boolean

  orientation?: string
  heating?: string

  description?: string

  agencyName?: string
  agentName?: string

  energyCostMin?: number
  energyCostMax?: number
}

/** Résultat normalisé d'un import d'annonce, quelle que soit la méthode. */
export interface ListingImportResult extends ListingFields {
  /** Nom lisible de la plateforme ("SeLoger", "Leboncoin", "Texte collé"…). */
  source: string
  /** URL d'origine de l'annonce (vide si import par texte sans URL). */
  sourceUrl: string
  /** Données brutes conservées pour debug / réanalyse future. */
  rawData?: unknown
  /** Date ISO de l'import. */
  importedAt: string
  /** Avertissements à montrer à l'utilisateur (limites, champs manquants…). */
  warnings: string[]
}

/**
 * Un provider sait traiter certaines URLs (par plateforme).
 * L'architecture est générique : ajouter une plateforme = ajouter un provider,
 * sans toucher au reste de l'application.
 */
export interface ListingImporter {
  /** Identifiant technique du provider ("seloger", "generic"…). */
  readonly name: string
  canHandle(url: string): boolean
  importListing(url: string): Promise<ListingImportResult>
}

/**
 * Contenu d'une page transmis par un canal externe (future extension
 * navigateur, backend de scraping…). Voir docs/LISTING_IMPORT.md.
 */
export interface PageContent {
  url: string
  title?: string
  visibleText?: string
  metadata?: Record<string, string>
}

/**
 * Abstraction appelée par le frontend. Le composant UI ne dépend jamais
 * d'une implémentation concrète : en V2, LocalListingImportService pourra
 * être remplacé par ApiListingImportService (POST /api/listing/import)
 * sans modifier l'interface utilisateur.
 */
export interface ListingImportService {
  /** Méthode A : import depuis une URL d'annonce. */
  import(url: string): Promise<ListingImportResult>
  /** Méthode B : import depuis le texte collé d'une annonce. */
  importFromText(text: string, sourceUrl?: string): Promise<ListingImportResult>
}
