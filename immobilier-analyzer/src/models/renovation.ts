/** Modèle du module travaux. */

export type RenovationPriority = 'immediate' | 'lt-1-an' | '1-3-ans' | 'confort'

export const RENOVATION_PRIORITY_LABELS: Record<RenovationPriority, string> = {
  immediate: 'Immédiat',
  'lt-1-an': '< 1 an',
  '1-3-ans': '1 à 3 ans',
  confort: 'Confort / esthétique',
}

export type RenovationStatus = 'suppose' | 'a-deviser' | 'devis-recu' | 'confirme'

export const RENOVATION_STATUS_LABELS: Record<RenovationStatus, string> = {
  suppose: 'Supposé',
  'a-deviser': 'À deviser',
  'devis-recu': 'Devis reçu',
  confirme: 'Confirmé',
}

export type SelectedBudget = 'low' | 'expected' | 'high'

export interface RenovationLine {
  id: string
  category: string
  description: string
  priority: RenovationPriority
  budgetLow?: number
  budgetExpected?: number
  budgetHigh?: number
  /** Quelle hypothèse de budget est retenue dans les totaux. */
  selectedBudget: SelectedBudget
  status: RenovationStatus
}

/** Taux d'imprévus proposés (défaut : 15 %). */
export const CONTINGENCY_RATES = [0, 0.05, 0.1, 0.15, 0.2, 0.25]
export const DEFAULT_CONTINGENCY_RATE = 0.15
