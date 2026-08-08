/**
 * Modèle principal : le dossier d'un bien visité.
 * Tous les champs (hors identité) sont facultatifs : une fiche peut rester
 * incomplète et être complétée au fil des visites.
 */
import type {
  Anomaly,
  DocumentState,
  InspectionResult,
  Photo,
  QuestionEntry,
  Room,
} from './inspection'
import type { RenovationLine } from './renovation'
import { DEFAULT_CONTINGENCY_RATE } from './renovation'

export type PropertyStatus =
  | 'a-visiter'
  | 'visite'
  | 'deuxieme-visite'
  | 'offre-envisagee'
  | 'offre-faite'
  | 'refuse'
  | 'abandonne'
  | 'achete'

export const PROPERTY_STATUS_LABELS: Record<PropertyStatus, string> = {
  'a-visiter': 'À visiter',
  visite: 'Visité',
  'deuxieme-visite': 'Deuxième visite',
  'offre-envisagee': 'Offre envisagée',
  'offre-faite': 'Offre faite',
  refuse: 'Refusé',
  abandonne: 'Abandonné',
  achete: 'Acheté',
}

export interface GeneralInfo {
  title: string
  address?: string
  postalCode?: string
  city: string
  propertyType?: string
  surface?: number
  landSurface?: number
  rooms?: number
  bedrooms?: number
  bathrooms?: number
  floors?: number
  constructionYear?: number
}

export interface PriceInfo {
  askingPrice?: number
  negotiatedPrice?: number
  targetOffer?: number
  maximumOffer?: number
}

export interface RealEstateInfo {
  dpe?: string
  ges?: string
  propertyTax?: number
  orientation?: string
  condominium?: boolean
  condominiumFees?: number
  garden?: boolean
  garage?: boolean
  parking?: boolean
  cellar?: boolean
  attic?: boolean
  balcony?: boolean
}

export interface VisitInfo {
  visitDate?: string
  /** Durée de la visite en minutes. */
  visitDuration?: number
  agency?: string
  agentName?: string
  agentPhone?: string
  peoplePresent?: string
}

/* Intégration import d'annonces (voir services/listingImport/). */

export interface ListingRef {
  source: string
  sourceUrl: string
  importedAt: string
}

export interface ListingSnapshot {
  date: string
  askingPrice?: number
  title?: string
  description?: string
  status?: 'active' | 'removed' | 'unknown'
}

export type FieldOrigin = 'listing' | 'manual' | 'visit' | 'document' | 'computed'

export interface FieldProvenance {
  origin: FieldOrigin
  source?: string
  sourceUrl?: string
  importedAt?: string
  confidence?: 'high' | 'medium' | 'low'
}

/* Finances */

export interface AfterWorksValue {
  low?: number
  probable?: number
  high?: number
}

export interface RentalInputs {
  monthlyRent?: number
  monthlyRecoverableCharges?: number
  annualPropertyTax?: number
  annualInsurance?: number
  annualManagement?: number
  annualMaintenance?: number
  /** Vacance locative, entre 0 et 1 (ex. 0.08 = ~1 mois par an). */
  vacancyRate: number
  monthlyLoanPayment?: number
}

export interface FinanceInputs {
  /** Taux de frais de notaire (défaut 8 %, ancien). */
  notaryRate: number
  /** Frais annexes (déménagement, dossier bancaire, courtier…). */
  otherCosts?: number
  /** Réserve pour imprévus appliquée aux travaux. */
  contingencyRate: number
  /** Marge de sécurité du calcul de prix maximum. */
  safetyMarginRate: number
  afterWorksValue: AfterWorksValue
  rental?: RentalInputs
}

export const DEFAULT_NOTARY_RATE = 0.08
export const DEFAULT_SAFETY_MARGIN_RATE = 0.1
export const MARGIN_RATES = [0, 0.05, 0.1, 0.15, 0.2, 0.25]

export interface Property {
  id: string
  createdAt: string
  updatedAt: string
  status: PropertyStatus
  general: GeneralInfo
  prices: PriceInfo
  info: RealEstateInfo
  visit: VisitInfo
  notes: string
  /** Annonce d'origine si le bien a été créé par import. */
  listing?: ListingRef
  snapshots: ListingSnapshot[]
  /** Provenance par champ (annonce / manuel / visite / document / calculé). */
  provenance: Partial<Record<string, FieldProvenance>>
  /** Réponses de checklist, indexées par id de critère. */
  inspection: Record<string, InspectionResult>
  anomalies: Anomaly[]
  rooms: Room[]
  renovations: RenovationLine[]
  /** États des documents, indexés par id de document. */
  documents: Record<string, DocumentState>
  questions: QuestionEntry[]
  photos: Photo[]
  finance: FinanceInputs
}

export function createEmptyProperty(id: string, title: string, city: string, now: string): Property {
  return {
    id,
    createdAt: now,
    updatedAt: now,
    status: 'a-visiter',
    general: { title, city },
    prices: {},
    info: {},
    visit: {},
    notes: '',
    snapshots: [],
    provenance: {},
    inspection: {},
    anomalies: [],
    rooms: [],
    renovations: [],
    documents: {},
    questions: [],
    photos: [],
    finance: {
      notaryRate: DEFAULT_NOTARY_RATE,
      contingencyRate: DEFAULT_CONTINGENCY_RATE,
      safetyMarginRate: DEFAULT_SAFETY_MARGIN_RATE,
      afterWorksValue: {},
    },
  }
}

/**
 * Complète un objet partiel (données importées, anciennes versions du
 * schéma) pour garantir la présence de tous les champs attendus.
 */
export function normalizeProperty(raw: Partial<Property> & { id: string }): Property {
  const now = new Date().toISOString()
  const empty = createEmptyProperty(raw.id, 'Bien sans nom', '', now)
  return {
    ...empty,
    ...raw,
    general: { ...empty.general, ...raw.general },
    prices: { ...raw.prices },
    info: { ...raw.info },
    visit: { ...raw.visit },
    notes: raw.notes ?? '',
    snapshots: raw.snapshots ?? [],
    provenance: raw.provenance ?? {},
    inspection: raw.inspection ?? {},
    anomalies: raw.anomalies ?? [],
    rooms: raw.rooms ?? [],
    renovations: raw.renovations ?? [],
    documents: raw.documents ?? {},
    questions: raw.questions ?? [],
    photos: raw.photos ?? [],
    finance: {
      ...empty.finance,
      ...raw.finance,
      afterWorksValue: { ...raw.finance?.afterWorksValue },
    },
  }
}
