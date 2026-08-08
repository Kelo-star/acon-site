/** Ligne de checklist : statut en un geste, détails dépliables. */
import { useState } from 'react'
import type { InspectionItem, InspectionResult, InspectionStatus, Severity } from '../models/inspection'
import { SEVERITY_LABELS } from '../models/inspection'
import type { Photo } from '../models/inspection'
import { NumberField, Segmented, TextAreaField } from './ui'
import PhotoPicker from './PhotoPicker'

const STATUS_OPTIONS: { value: InspectionStatus; label: string; tone: 'good' | 'average' | 'bad' | 'neutral' }[] = [
  { value: 'good', label: 'Bon', tone: 'good' },
  { value: 'average', label: 'Moyen', tone: 'average' },
  { value: 'bad', label: 'Mauvais', tone: 'bad' },
  { value: 'to-check', label: 'À vérifier', tone: 'neutral' },
  { value: 'not-applicable', label: 'N/A', tone: 'neutral' },
  { value: 'not-inspected', label: 'Non contrôlé', tone: 'neutral' },
]

interface ChecklistItemProps {
  item: InspectionItem
  result: InspectionResult | undefined
  propertyId: string
  photos: Photo[]
  onChange: (result: InspectionResult) => void
  onAddPhoto: (photo: Photo) => void
  onRemovePhoto: (photoId: string) => void
}

export default function ChecklistItem({
  item,
  result,
  propertyId,
  photos,
  onChange,
  onAddPhoto,
  onRemovePhoto,
}: ChecklistItemProps) {
  const [open, setOpen] = useState(false)
  const current: InspectionResult = result ?? { itemId: item.id, status: 'not-inspected' }
  const hasDetails =
    Boolean(current.comment) ||
    current.estimatedCost !== undefined ||
    current.redFlag ||
    (current.photoIds?.length ?? 0) > 0

  function patch(changes: Partial<InspectionResult>) {
    onChange({ ...current, ...changes })
  }

  return (
    <div className="border-b border-gray-100 py-3 last:border-b-0">
      <div className="mb-1.5 flex items-start justify-between gap-2">
        <div>
          <span className="text-sm font-medium text-gray-900">
            {item.label}
            {item.importance === 'critical' && <span className="ml-1 text-red-600" title="Point critique">•</span>}
            {current.redFlag && <span className="ml-1">🚩</span>}
          </span>
          {item.description && <p className="text-xs text-gray-500">{item.description}</p>}
          {item.possibleCost && (
            <p className="text-xs text-gray-400">Coût possible : {item.possibleCost}</p>
          )}
        </div>
        <button
          type="button"
          className={`shrink-0 text-xs ${hasDetails ? 'font-semibold text-blue-700' : 'text-gray-500'}`}
          onClick={() => setOpen((o) => !o)}
        >
          {open ? 'Réduire' : hasDetails ? 'Détails ●' : 'Détails'}
        </button>
      </div>
      <Segmented
        small
        value={current.status === 'not-inspected' && !result ? undefined : current.status}
        onChange={(status) => patch({ status })}
        options={STATUS_OPTIONS}
      />
      {open && (
        <div className="mt-3 space-y-3 rounded-lg bg-gray-50 p-3">
          <TextAreaField
            label="Commentaire"
            value={current.comment}
            onChange={(comment) => patch({ comment })}
            rows={2}
          />
          <div className="grid grid-cols-2 gap-3">
            <NumberField
              label="Coût estimé"
              unit="€"
              value={current.estimatedCost}
              onChange={(estimatedCost) => patch({ estimatedCost })}
            />
            <div>
              <span className="label">Gravité</span>
              <Segmented
                small
                value={current.severity}
                onChange={(severity) => patch({ severity: severity as Severity })}
                options={(Object.keys(SEVERITY_LABELS) as Severity[]).map((s) => ({
                  value: s,
                  label: SEVERITY_LABELS[s],
                  tone: s === 'critical' || s === 'high' ? 'bad' : s === 'medium' ? 'average' : 'neutral',
                }))}
              />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm font-medium text-red-700">
            <input
              type="checkbox"
              checked={current.redFlag ?? false}
              onChange={(e) => patch({ redFlag: e.target.checked })}
            />
            🚩 Red flag (anomalie majeure, jamais masquée par le score)
          </label>
          <PhotoPicker
            propertyId={propertyId}
            photos={photos}
            photoIds={current.photoIds ?? []}
            inspectionItemId={item.id}
            onAdd={(photo) => {
              onAddPhoto(photo)
              patch({ photoIds: [...(current.photoIds ?? []), photo.id] })
            }}
            onRemove={(photoId) => {
              onRemovePhoto(photoId)
              patch({ photoIds: (current.photoIds ?? []).filter((id) => id !== photoId) })
            }}
          />
        </div>
      )}
    </div>
  )
}
