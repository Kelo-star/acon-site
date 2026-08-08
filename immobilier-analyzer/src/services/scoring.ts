/**
 * Moteur de score, paramétrable via DEFAULT_SCORING_CONFIG.
 *
 * Principes :
 * - le score ne masque jamais un red flag (comptés et affichés à part) ;
 * - la complétude de la visite est calculée séparément, pour éviter
 *   qu'un bon score sur peu de contrôles soit interprété comme fiable ;
 * - le verdict n'est jamais basé sur le seul score.
 */
import type { Property } from '../models/property'
import type { InspectionResult, ScoreCategoryId } from '../models/inspection'
import { ALL_INSPECTION_ITEMS, findInspectionItem } from '../data/inspectionSections'
import { DEFAULT_DOCUMENTS } from '../data/defaultDocuments'
import { acquisitionCost, maxPurchasePriceFor, renovationBudget } from './calculations'

export interface ScoreCategoryConfig {
  id: ScoreCategoryId
  label: string
  weight: number
}

/** Pondérations configurables (total indicatif : 100). */
export const DEFAULT_SCORING_CONFIG: ScoreCategoryConfig[] = [
  { id: 'structure', label: 'Structure', weight: 20 },
  { id: 'humidity', label: 'Humidité', weight: 15 },
  { id: 'roof', label: 'Toiture / charpente', weight: 15 },
  { id: 'electricity', label: 'Électricité', weight: 10 },
  { id: 'plumbing-heating', label: 'Plomberie / chauffage', weight: 10 },
  { id: 'energy', label: 'Énergie', weight: 5 },
  { id: 'layout', label: 'Agencement', weight: 5 },
  { id: 'environment', label: 'Environnement', weight: 5 },
  { id: 'documents', label: 'Documents', weight: 5 },
  { id: 'price', label: 'Prix / finances', weight: 10 },
]

const IMPORTANCE_WEIGHT = { minor: 1, medium: 1.5, major: 2, critical: 3 } as const
const STATUS_VALUE = { good: 1, average: 0.5, bad: 0 } as const

export interface CategoryScore {
  id: ScoreCategoryId
  label: string
  weight: number
  /** Note de 0 à 1, ou null si rien d'évaluable dans la catégorie. */
  score: number | null
}

export interface ScoreResult {
  /** Score sur 100, ou null si rien n'a encore été évalué. */
  total: number | null
  categories: CategoryScore[]
}

function dpeScore(dpe: string | undefined): number | null {
  if (!dpe) return null
  const values: Record<string, number> = { A: 1, B: 0.9, C: 0.7, D: 0.5, E: 0.35, F: 0.15, G: 0 }
  return values[dpe.trim().toUpperCase()] ?? null
}

function checklistCategoryScore(property: Property, category: ScoreCategoryId): number | null {
  let earned = 0
  let possible = 0
  for (const item of ALL_INSPECTION_ITEMS) {
    if (item.category !== category) continue
    const result = property.inspection[item.id]
    if (!result) continue
    const value = STATUS_VALUE[result.status as keyof typeof STATUS_VALUE]
    if (value === undefined) continue
    const weight = IMPORTANCE_WEIGHT[item.importance]
    earned += value * weight
    possible += weight
  }
  return possible > 0 ? earned / possible : null
}

function documentsScore(property: Property): number | null {
  const values: Record<string, number> = { received: 1, 'to-check': 0.5, requested: 0.25, missing: 0 }
  let earned = 0
  let count = 0
  for (const doc of DEFAULT_DOCUMENTS) {
    const state = property.documents[doc.id]
    if (!state || state.status === 'not-applicable') continue
    const value = values[state.status]
    if (value === undefined) continue
    earned += value
    count += 1
  }
  return count > 0 ? earned / count : null
}

function priceScore(property: Property): number | null {
  const asking = property.prices.negotiatedPrice ?? property.prices.askingPrice
  const max = maxPurchasePriceFor(property)
  if (asking === undefined || max === undefined) return null
  if (max <= 0) return 0
  if (asking <= max) return 1
  if (asking <= max * 1.1) return 0.6
  if (asking <= max * 1.25) return 0.3
  return 0
}

export function computeScore(
  property: Property,
  config: ScoreCategoryConfig[] = DEFAULT_SCORING_CONFIG,
): ScoreResult {
  const categories: CategoryScore[] = config.map((cat) => {
    let score: number | null
    if (cat.id === 'documents') score = documentsScore(property)
    else if (cat.id === 'price') score = priceScore(property)
    else if (cat.id === 'energy') {
      const checklist = checklistCategoryScore(property, 'energy')
      const dpe = dpeScore(property.info.dpe)
      const parts = [checklist, dpe].filter((v): v is number => v !== null)
      score = parts.length > 0 ? parts.reduce((a, b) => a + b, 0) / parts.length : null
    } else score = checklistCategoryScore(property, cat.id)
    return { id: cat.id, label: cat.label, weight: cat.weight, score }
  })

  const rated = categories.filter((c) => c.score !== null)
  const weightSum = rated.reduce((sum, c) => sum + c.weight, 0)
  const total =
    weightSum > 0
      ? Math.round((rated.reduce((sum, c) => sum + c.weight * (c.score as number), 0) / weightSum) * 100)
      : null

  return { total, categories }
}

/* ---------- Complétude ---------- */

export interface CompletenessResult {
  /** Part des contrôles effectués (0 à 1). */
  ratio: number
  controlledCount: number
  totalCount: number
  /** Éléments non vérifiés : non contrôlés + marqués « à vérifier ». */
  unverifiedCount: number
  toCheckCount: number
  missingDocumentsCount: number
  unansweredQuestionsCount: number
}

export function computeCompleteness(property: Property): CompletenessResult {
  const total = ALL_INSPECTION_ITEMS.length
  let controlled = 0
  let toCheck = 0
  for (const item of ALL_INSPECTION_ITEMS) {
    const status = property.inspection[item.id]?.status ?? 'not-inspected'
    if (status === 'to-check') toCheck += 1
    else if (status !== 'not-inspected') controlled += 1
  }
  const missingDocuments = Object.values(property.documents).filter(
    (d) => d.status === 'missing',
  ).length
  const unansweredQuestions = property.questions.filter((q) => !q.answer?.trim()).length
  return {
    ratio: total > 0 ? controlled / total : 0,
    controlledCount: controlled,
    totalCount: total,
    unverifiedCount: total - controlled,
    toCheckCount: toCheck,
    missingDocumentsCount: missingDocuments,
    unansweredQuestionsCount: unansweredQuestions,
  }
}

/* ---------- Red flags ---------- */

export interface RedFlag {
  label: string
  detail?: string
  source: 'checklist' | 'anomalie'
}

export function listRedFlags(property: Property): RedFlag[] {
  const flags: RedFlag[] = []
  for (const result of Object.values(property.inspection) as InspectionResult[]) {
    if (!result.redFlag) continue
    const item = findInspectionItem(result.itemId)
    flags.push({
      label: item?.label ?? result.itemId,
      detail: result.comment,
      source: 'checklist',
    })
  }
  for (const anomaly of property.anomalies) {
    if (!anomaly.redFlag) continue
    flags.push({ label: anomaly.description, detail: anomaly.category, source: 'anomalie' })
  }
  return flags
}

/* ---------- Verdict ---------- */

export type VerdictLevel =
  | 'tres-interessant'
  | 'interessant'
  | 'a-negocier'
  | 'prudence'
  | 'risque-eleve'
  | 'a-eviter'

export const VERDICT_LABELS: Record<VerdictLevel, string> = {
  'tres-interessant': 'Très intéressant',
  interessant: 'Intéressant',
  'a-negocier': 'À négocier',
  prudence: 'Prudence',
  'risque-eleve': 'Risque élevé',
  'a-eviter': 'À éviter',
}

const VERDICT_ORDER: VerdictLevel[] = [
  'tres-interessant',
  'interessant',
  'a-negocier',
  'prudence',
  'risque-eleve',
  'a-eviter',
]

export interface VerdictResult {
  level: VerdictLevel
  label: string
  reasons: string[]
  reliability: 'low' | 'medium' | 'high'
  reliabilityMessage?: string
}

function worst(a: VerdictLevel, b: VerdictLevel): VerdictLevel {
  return VERDICT_ORDER.indexOf(a) >= VERDICT_ORDER.indexOf(b) ? a : b
}

/**
 * Verdict prudent : jamais basé sur le seul score. Prend en compte la
 * complétude, les red flags, le poids des travaux et l'écart entre le
 * prix demandé et le prix maximum calculé.
 */
export function computeVerdict(property: Property): VerdictResult {
  const score = computeScore(property)
  const completeness = computeCompleteness(property)
  const redFlags = listRedFlags(property)
  const cost = acquisitionCost(property)
  const works = renovationBudget(property.renovations, property.finance.contingencyRate)
  const maxPrice = maxPurchasePriceFor(property)
  const asking = property.prices.negotiatedPrice ?? property.prices.askingPrice

  const reasons: string[] = []

  let level: VerdictLevel
  if (score.total === null) level = 'prudence'
  else if (score.total >= 80) level = 'tres-interessant'
  else if (score.total >= 65) level = 'interessant'
  else if (score.total >= 50) level = 'a-negocier'
  else if (score.total >= 35) level = 'prudence'
  else if (score.total >= 20) level = 'risque-eleve'
  else level = 'a-eviter'
  if (score.total === null) reasons.push('Aucun contrôle évalué pour le moment.')

  if (redFlags.length >= 3) {
    level = worst(level, 'a-eviter')
    reasons.push(`${redFlags.length} red flags : signaux majeurs.`)
  } else if (redFlags.length === 2) {
    level = worst(level, 'risque-eleve')
    reasons.push('2 red flags relevés.')
  } else if (redFlags.length === 1) {
    level = worst(level, 'prudence')
    reasons.push('1 red flag relevé : à faire expertiser avant toute offre.')
  }

  if (asking !== undefined && maxPrice !== undefined && asking > maxPrice) {
    const gap = maxPrice > 0 ? asking / maxPrice - 1 : 1
    if (gap > 0.15) {
      level = worst(level, 'prudence')
      reasons.push('Prix demandé nettement supérieur au prix maximum calculé.')
    } else {
      level = worst(level, 'a-negocier')
      reasons.push('Prix demandé supérieur au prix maximum calculé : à négocier.')
    }
  }

  if (asking && works.total > asking * 0.5) {
    level = worst(level, 'prudence')
    reasons.push('Budget travaux supérieur à 50 % du prix : projet lourd.')
  }

  if (completeness.ratio < 0.4 && level === 'tres-interessant') {
    level = 'interessant'
    reasons.push('Visite trop peu complète pour un verdict aussi favorable.')
  }

  const reliability = completeness.ratio < 0.4 ? 'low' : completeness.ratio < 0.7 ? 'medium' : 'high'
  const reliabilityMessage =
    reliability === 'low'
      ? 'Analyse encore peu fiable : de nombreux éléments restent à vérifier.'
      : reliability === 'medium'
        ? 'Analyse partielle : plusieurs éléments restent à vérifier.'
        : undefined

  if (cost.total === undefined) {
    reasons.push('Renseignez le prix pour affiner l’analyse financière.')
  }

  return { level, label: VERDICT_LABELS[level], reasons, reliability, reliabilityMessage }
}
