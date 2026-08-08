/** Technique : la checklist complète, par catégorie (accordéons). */
import type { SectionProps } from './types'
import { INSPECTION_SECTIONS } from '../../data/inspectionSections'
import ChecklistItem from '../ChecklistItem'

export default function TechnicalSection({ property, update }: SectionProps) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-500">
        Chaque section peut rester incomplète : la complétude de la visite est suivie dans l'onglet
        Analyse. Le point rouge (•) signale les critères critiques.
      </p>
      {INSPECTION_SECTIONS.map((section) => {
        const answered = section.items.filter((item) => {
          const status = property.inspection[item.id]?.status
          return status && status !== 'not-inspected'
        }).length
        return (
          <details key={section.id} className="card">
            <summary className="flex cursor-pointer items-center justify-between font-semibold">
              <span>
                {section.icon} {section.title}
              </span>
              <span
                className={`chip ${
                  answered === section.items.length
                    ? 'bg-green-100 text-green-800'
                    : answered > 0
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-gray-200 text-gray-600'
                }`}
              >
                {answered}/{section.items.length}
              </span>
            </summary>
            {section.description && <p className="mt-1 text-xs text-gray-500">{section.description}</p>}
            <div className="mt-2">
              {section.items.map((item) => (
                <ChecklistItem
                  key={item.id}
                  item={item}
                  result={property.inspection[item.id]}
                  propertyId={property.id}
                  photos={property.photos}
                  onChange={(result) =>
                    update((p) => ({ ...p, inspection: { ...p.inspection, [item.id]: result } }))
                  }
                  onAddPhoto={(photo) => update((p) => ({ ...p, photos: [...p.photos, photo] }))}
                  onRemovePhoto={(photoId) =>
                    update((p) => ({ ...p, photos: p.photos.filter((ph) => ph.id !== photoId) }))
                  }
                />
              ))}
            </div>
          </details>
        )
      })}
    </div>
  )
}
