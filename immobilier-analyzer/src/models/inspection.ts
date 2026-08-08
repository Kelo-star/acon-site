/** Modèles liés à l'inspection du bien pendant la visite. */

export type Importance = 'minor' | 'medium' | 'major' | 'critical'

/** Catégories du moteur de score (voir services/scoring.ts). */
export type ScoreCategoryId =
  | 'structure'
  | 'humidity'
  | 'roof'
  | 'electricity'
  | 'plumbing-heating'
  | 'energy'
  | 'layout'
  | 'environment'
  | 'documents'
  | 'price'

export interface InspectionItem {
  id: string
  label: string
  description?: string
  importance: Importance
  /** Catégorie de score à laquelle ce critère contribue. */
  category: ScoreCategoryId
  /** Ordre de grandeur de coût si le point est mauvais (indicatif). */
  possibleCost?: string
}

export interface InspectionSection {
  id: string
  title: string
  icon: string
  description?: string
  items: InspectionItem[]
}

export type InspectionStatus =
  | 'good'
  | 'average'
  | 'bad'
  | 'to-check'
  | 'not-applicable'
  | 'not-inspected'

export const INSPECTION_STATUS_LABELS: Record<InspectionStatus, string> = {
  good: 'Bon',
  average: 'Moyen',
  bad: 'Mauvais',
  'to-check': 'À vérifier',
  'not-applicable': 'N/A',
  'not-inspected': 'Non contrôlé',
}

export type Severity = 'low' | 'medium' | 'high' | 'critical'

export const SEVERITY_LABELS: Record<Severity, string> = {
  low: 'Faible',
  medium: 'Moyenne',
  high: 'Importante',
  critical: 'Critique',
}

/** Réponse de l'utilisateur pour un critère de checklist. */
export interface InspectionResult {
  itemId: string
  status: InspectionStatus
  comment?: string
  estimatedCost?: number
  severity?: Severity
  redFlag?: boolean
  photoIds?: string[]
}

/** Anomalie saisie rapidement pendant la visite (bouton « + Anomalie »). */
export interface Anomaly {
  id: string
  category: string
  room?: string
  description: string
  severity: Severity
  estimatedCost?: number
  checkByPro?: boolean
  redFlag?: boolean
  photoIds: string[]
  createdAt: string
}

export interface Room {
  id: string
  name: string
  surface?: number
  height?: number
  luminosity?: 'good' | 'average' | 'bad'
  condition?: 'good' | 'average' | 'bad'
  notes?: string
  photoIds: string[]
}

export type DocumentStatus = 'received' | 'requested' | 'missing' | 'to-check' | 'not-applicable'

export const DOCUMENT_STATUS_LABELS: Record<DocumentStatus, string> = {
  received: 'Reçu',
  requested: 'Demandé',
  missing: 'Manquant',
  'to-check': 'À vérifier',
  'not-applicable': 'Non applicable',
}

export interface DocumentDef {
  id: string
  label: string
  description?: string
}

export interface DocumentState {
  status: DocumentStatus
  notes?: string
}

export interface QuestionEntry {
  id: string
  question: string
  answer?: string
  satisfactory?: boolean
  toVerify?: boolean
  /** true pour une question ajoutée par l'utilisateur. */
  custom?: boolean
}

/** Métadonnées de photo ; le fichier lui-même est stocké dans IndexedDB. */
export interface Photo {
  id: string
  propertyId: string
  roomId?: string
  inspectionItemId?: string
  category?: string
  caption?: string
  severity?: Severity
  createdAt: string
}
