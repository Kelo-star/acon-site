/** Travaux : lignes budgétées, imprévus, totaux. */
import { useState } from 'react'
import type { SectionProps } from './types'
import type { RenovationLine, RenovationPriority, RenovationStatus, SelectedBudget } from '../../models/renovation'
import {
  CONTINGENCY_RATES,
  RENOVATION_PRIORITY_LABELS,
  RENOVATION_STATUS_LABELS,
} from '../../models/renovation'
import { RENOVATION_CATEGORIES } from '../../data/renovationCategories'
import { renovationBudget, renovationLineAmount } from '../../services/calculations'
import { createId } from '../../utils/id'
import { formatEUR, formatPercent } from '../../utils/format'
import { NumberField, Segmented, SelectField, Stat, TextField } from '../ui'

function LineEditor({
  line,
  onChange,
  onDelete,
}: {
  line: RenovationLine
  onChange: (line: RenovationLine) => void
  onDelete: () => void
}) {
  const patch = (changes: Partial<RenovationLine>) => onChange({ ...line, ...changes })
  return (
    <details className="rounded-lg border border-gray-200 p-3">
      <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-2 text-sm">
        <span className="font-semibold">
          {line.category}
          {line.description ? ` — ${line.description}` : ''}
        </span>
        <span className="flex items-center gap-2">
          <span className="chip bg-gray-200 text-gray-700">{RENOVATION_PRIORITY_LABELS[line.priority]}</span>
          <strong>{formatEUR(renovationLineAmount(line))}</strong>
        </span>
      </summary>
      <div className="mt-3 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <SelectField
            label="Catégorie"
            value={line.category}
            onChange={(v) => patch({ category: v ?? 'Autre' })}
            options={RENOVATION_CATEGORIES.map((c) => ({ value: c, label: c }))}
          />
          <TextField label="Description" value={line.description || undefined} onChange={(v) => patch({ description: v ?? '' })} />
        </div>
        <div>
          <span className="label">Priorité</span>
          <Segmented
            small
            value={line.priority}
            onChange={(priority) => patch({ priority: priority as RenovationPriority })}
            options={(Object.keys(RENOVATION_PRIORITY_LABELS) as RenovationPriority[]).map((p) => ({
              value: p,
              label: RENOVATION_PRIORITY_LABELS[p],
              tone: p === 'immediate' ? 'bad' : p === 'lt-1-an' ? 'average' : 'neutral',
            }))}
          />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <NumberField label="Budget bas" unit="€" value={line.budgetLow} onChange={(v) => patch({ budgetLow: v })} />
          <NumberField label="Budget probable" unit="€" value={line.budgetExpected} onChange={(v) => patch({ budgetExpected: v })} />
          <NumberField label="Budget haut" unit="€" value={line.budgetHigh} onChange={(v) => patch({ budgetHigh: v })} />
        </div>
        <div>
          <span className="label">Hypothèse retenue dans les totaux</span>
          <Segmented
            small
            value={line.selectedBudget}
            onChange={(selectedBudget) => patch({ selectedBudget: selectedBudget as SelectedBudget })}
            options={[
              { value: 'low', label: 'Basse' },
              { value: 'expected', label: 'Probable' },
              { value: 'high', label: 'Haute' },
            ]}
          />
        </div>
        <div>
          <span className="label">Statut</span>
          <Segmented
            small
            value={line.status}
            onChange={(status) => patch({ status: status as RenovationStatus })}
            options={(Object.keys(RENOVATION_STATUS_LABELS) as RenovationStatus[]).map((s) => ({
              value: s,
              label: RENOVATION_STATUS_LABELS[s],
            }))}
          />
        </div>
        <button className="btn btn-danger" onClick={onDelete}>
          Supprimer la ligne
        </button>
      </div>
    </details>
  )
}

export default function RenovationSection({ property, update }: SectionProps) {
  const [newCategory, setNewCategory] = useState('Autre')
  const budget = renovationBudget(property.renovations, property.finance.contingencyRate)

  function addLine() {
    const line: RenovationLine = {
      id: createId(),
      category: newCategory,
      description: '',
      priority: 'lt-1-an',
      selectedBudget: 'expected',
      status: 'suppose',
    }
    update((p) => ({ ...p, renovations: [...p.renovations, line] }))
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        <Stat label="Travaux identifiés" value={formatEUR(budget.subtotal)} />
        <Stat label={`Imprévus (${formatPercent(property.finance.contingencyRate)})`} value={formatEUR(budget.contingency)} />
        <Stat label="Budget travaux total" value={formatEUR(budget.total)} accent />
      </div>

      <div className="card space-y-2">
        <span className="label">Réserve pour imprévus</span>
        <Segmented
          small
          value={String(property.finance.contingencyRate)}
          onChange={(v) =>
            update((p) => ({ ...p, finance: { ...p.finance, contingencyRate: Number(v) } }))
          }
          options={CONTINGENCY_RATES.map((rate) => ({
            value: String(rate),
            label: formatPercent(rate),
          }))}
        />
        <p className="text-xs text-gray-500">
          Appliquée automatiquement au total des travaux identifiés (défaut : 15 %).
        </p>
      </div>

      <div className="card space-y-3">
        <h2 className="section-title">Lignes de travaux</h2>
        {property.renovations.length === 0 && (
          <p className="text-sm text-gray-500">Aucune ligne pour le moment.</p>
        )}
        {property.renovations.map((line) => (
          <LineEditor
            key={line.id}
            line={line}
            onChange={(updated) =>
              update((p) => ({
                ...p,
                renovations: p.renovations.map((l) => (l.id === updated.id ? updated : l)),
              }))
            }
            onDelete={() =>
              update((p) => ({ ...p, renovations: p.renovations.filter((l) => l.id !== line.id) }))
            }
          />
        ))}
        <div className="flex gap-2">
          <SelectField
            label="Catégorie de la nouvelle ligne"
            value={newCategory}
            onChange={(v) => setNewCategory(v ?? 'Autre')}
            options={RENOVATION_CATEGORIES.map((c) => ({ value: c, label: c }))}
          />
          <button className="btn btn-primary self-end" onClick={addLine}>
            + Ajouter
          </button>
        </div>
      </div>
    </div>
  )
}
