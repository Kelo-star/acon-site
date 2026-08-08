/**
 * Moteur de cohérence : signale les contradictions entre ce que déclare
 * l'annonce (ou une saisie) et ce qui a été constaté en visite ou lu
 * dans un document. Les deux informations coexistent toujours ;
 * on n'écrase rien, on signale.
 */
import type {
  FieldOrigin,
  Observation,
  Property,
  PropertyData,
} from '../types/property'
import { fieldLabel, formatValue } from './fields'

export interface ConsistencyIssue {
  field: keyof PropertyData
  label: string
  declaredValue: unknown
  declaredOrigin: FieldOrigin
  observedValue: unknown
  observedOrigin: Observation['origin']
  observationLabel: string
  message: string
}

type Normalized = { kind: 'boolean'; value: boolean } | { kind: 'number'; value: number } | { kind: 'text'; value: string }

function normalize(value: unknown): Normalized | undefined {
  if (typeof value === 'boolean') return { kind: 'boolean', value }
  if (typeof value === 'number') {
    return Number.isFinite(value) ? { kind: 'number', value } : undefined
  }
  if (typeof value === 'string') {
    const s = value.trim().toLowerCase()
    if (s === '') return undefined
    if (['oui', 'yes', 'true', 'vrai'].includes(s)) return { kind: 'boolean', value: true }
    if (['non', 'no', 'false', 'faux'].includes(s)) return { kind: 'boolean', value: false }
    const n = Number(s.replace(/\s/g, '').replace(',', '.'))
    if (s !== '' && Number.isFinite(n) && /^[\d\s.,-]+$/.test(s)) return { kind: 'number', value: n }
    return { kind: 'text', value: s }
  }
  return undefined
}

/** Deux valeurs sont en conflit si, une fois normalisées, elles diffèrent. */
export function valuesConflict(a: unknown, b: unknown): boolean {
  const na = normalize(a)
  const nb = normalize(b)
  if (!na || !nb) return false
  if (na.kind === 'number' && nb.kind === 'number') {
    const tolerance = Math.max(0.5, Math.abs(na.value) * 0.02)
    return Math.abs(na.value - nb.value) > tolerance
  }
  if (na.kind !== nb.kind) return String(na.value) !== String(nb.value)
  return na.value !== nb.value
}

const ORIGIN_LABELS: Record<string, string> = {
  listing: 'annoncé',
  manual: 'saisi',
  visit: 'constaté en visite',
  document: 'indiqué dans un document',
  computed: 'calculé',
}

/** Liste les incohérences entre annonce/saisie et observations. */
export function findInconsistencies(property: Property): ConsistencyIssue[] {
  const issues: ConsistencyIssue[] = []

  for (const obs of property.observations) {
    if (!obs.field) continue
    const declaredValue = property.data[obs.field]
    if (declaredValue === undefined) continue
    const declaredOrigin = property.provenance[obs.field]?.origin ?? 'manual'
    if (!valuesConflict(declaredValue, obs.value)) continue
    issues.push({
      field: obs.field,
      label: fieldLabel(obs.field),
      declaredValue,
      declaredOrigin,
      observedValue: obs.value,
      observedOrigin: obs.origin,
      observationLabel: obs.label,
      message: `${fieldLabel(obs.field)} : ${ORIGIN_LABELS[declaredOrigin]} « ${formatValue(
        obs.field,
        declaredValue,
      )} » mais ${ORIGIN_LABELS[obs.origin]} « ${formatValue(obs.field, obs.value)} »`,
    })
  }

  // Contradictions entre observations elles-mêmes (visite vs document).
  const byField = new Map<string, Observation[]>()
  for (const obs of property.observations) {
    if (!obs.field) continue
    const list = byField.get(obs.field) ?? []
    list.push(obs)
    byField.set(obs.field, list)
  }
  for (const [field, list] of byField) {
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const a = list[i]
        const b = list[j]
        if (a.origin === b.origin) continue
        if (!valuesConflict(a.value, b.value)) continue
        const key = field as keyof PropertyData
        issues.push({
          field: key,
          label: fieldLabel(key),
          declaredValue: a.value,
          declaredOrigin: a.origin,
          observedValue: b.value,
          observedOrigin: b.origin,
          observationLabel: b.label,
          message: `${fieldLabel(key)} : ${ORIGIN_LABELS[a.origin]} « ${formatValue(key, a.value)} » mais ${
            ORIGIN_LABELS[b.origin]
          } « ${formatValue(key, b.value)} »`,
        })
      }
    }
  }

  return issues
}
