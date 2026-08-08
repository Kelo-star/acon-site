/**
 * Visite : infos pratiques, mode « Visite express » (~25 contrôles
 * essentiels), pièces libres et liste des anomalies saisies.
 */
import { useState } from 'react'
import type { SectionProps } from './types'
import type { VisitInfo } from '../../models/property'
import type { Room } from '../../models/inspection'
import { SEVERITY_LABELS } from '../../models/inspection'
import { EXPRESS_ITEM_IDS } from '../../data/expressChecklist'
import { DEFAULT_ROOM_NAMES } from '../../data/renovationCategories'
import { findInspectionItem } from '../../data/inspectionSections'
import { createId } from '../../utils/id'
import { formatEUR } from '../../utils/format'
import ChecklistItem from '../ChecklistItem'
import PhotoPicker from '../PhotoPicker'
import { NumberField, Segmented, TextAreaField, TextField } from '../ui'

export default function VisitSection({ property, update }: SectionProps) {
  const [showExpress, setShowExpress] = useState(false)
  const [newRoomName, setNewRoomName] = useState('')

  const setVisit = <K extends keyof VisitInfo>(key: K, value: VisitInfo[K]) =>
    update((p) => ({ ...p, visit: { ...p.visit, [key]: value } }))

  const expressItems = EXPRESS_ITEM_IDS.map(findInspectionItem).filter(
    (i): i is NonNullable<typeof i> => Boolean(i),
  )
  const secondVisitItems = expressItems.filter((item) => {
    const status = property.inspection[item.id]?.status
    return status === 'to-check' || status === 'bad'
  })

  function addRoom(name: string) {
    const trimmed = name.trim()
    if (!trimmed) return
    const room: Room = { id: createId(), name: trimmed, photoIds: [] }
    update((p) => ({ ...p, rooms: [...p.rooms, room] }))
    setNewRoomName('')
  }

  function patchRoom(roomId: string, changes: Partial<Room>) {
    update((p) => ({
      ...p,
      rooms: p.rooms.map((r) => (r.id === roomId ? { ...r, ...changes } : r)),
    }))
  }

  return (
    <div className="space-y-4">
      <div className="card space-y-3">
        <h2 className="section-title">Informations de visite</h2>
        <div className="grid grid-cols-2 gap-3">
          <label>
            <span className="label">Date de visite</span>
            <input
              className="input"
              type="date"
              value={property.visit.visitDate ?? ''}
              onChange={(e) => setVisit('visitDate', e.target.value || undefined)}
            />
          </label>
          <NumberField label="Durée" unit="min" value={property.visit.visitDuration} onChange={(v) => setVisit('visitDuration', v)} />
          <TextField label="Agence" value={property.visit.agency} onChange={(v) => setVisit('agency', v)} />
          <TextField label="Agent" value={property.visit.agentName} onChange={(v) => setVisit('agentName', v)} />
          <TextField label="Téléphone agent" type="tel" value={property.visit.agentPhone} onChange={(v) => setVisit('agentPhone', v)} />
          <TextField label="Personnes présentes" value={property.visit.peoplePresent} onChange={(v) => setVisit('peoplePresent', v)} />
        </div>
      </div>

      <div className="card space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="section-title">⚡ Visite express</h2>
          <button className="btn" onClick={() => setShowExpress((s) => !s)}>
            {showExpress ? 'Masquer' : `Lancer (${expressItems.length} contrôles)`}
          </button>
        </div>
        <p className="text-sm text-gray-500">
          Les contrôles essentiels en un seul écran. Les réponses alimentent la checklist complète de
          l'onglet Technique.
        </p>
        {showExpress && (
          <div>
            {expressItems.map((item) => (
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
        )}
        {secondVisitItems.length > 0 && (
          <div className="rounded-lg bg-amber-50 p-3 text-sm">
            <p className="mb-1 font-semibold text-amber-900">
              À approfondir lors d'une deuxième visite :
            </p>
            <ul className="list-disc pl-5 text-amber-900">
              {secondVisitItems.map((item) => (
                <li key={item.id}>
                  {item.label}
                  {property.inspection[item.id]?.status === 'bad' ? ' (mauvais état)' : ' (à vérifier)'}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="card space-y-3">
        <h2 className="section-title">Pièces</h2>
        <div className="flex flex-wrap gap-1.5">
          {DEFAULT_ROOM_NAMES.map((name) => (
            <button key={name} className="chip bg-gray-200 text-gray-700 hover:bg-blue-100" onClick={() => addRoom(name)}>
              + {name}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            className="input"
            placeholder="Nom personnalisé (ex. Chambre côté rue)"
            value={newRoomName}
            onChange={(e) => setNewRoomName(e.target.value)}
          />
          <button className="btn shrink-0" onClick={() => addRoom(newRoomName)} disabled={!newRoomName.trim()}>
            Ajouter
          </button>
        </div>
        {property.rooms.map((room) => (
          <details key={room.id} className="rounded-lg border border-gray-200 p-3">
            <summary className="cursor-pointer font-semibold">
              {room.name}
              {room.surface ? ` · ${room.surface} m²` : ''}
            </summary>
            <div className="mt-3 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <TextField label="Nom" value={room.name} onChange={(v) => patchRoom(room.id, { name: v ?? '' })} />
                <NumberField label="Surface" unit="m²" value={room.surface} onChange={(v) => patchRoom(room.id, { surface: v })} />
                <NumberField label="Hauteur" unit="m" value={room.height} onChange={(v) => patchRoom(room.id, { height: v })} />
              </div>
              <div>
                <span className="label">Luminosité</span>
                <Segmented
                  small
                  value={room.luminosity}
                  onChange={(v) => patchRoom(room.id, { luminosity: v })}
                  options={[
                    { value: 'good', label: 'Bonne', tone: 'good' },
                    { value: 'average', label: 'Moyenne', tone: 'average' },
                    { value: 'bad', label: 'Faible', tone: 'bad' },
                  ]}
                />
              </div>
              <div>
                <span className="label">État général</span>
                <Segmented
                  small
                  value={room.condition}
                  onChange={(v) => patchRoom(room.id, { condition: v })}
                  options={[
                    { value: 'good', label: 'Bon', tone: 'good' },
                    { value: 'average', label: 'Moyen', tone: 'average' },
                    { value: 'bad', label: 'Mauvais', tone: 'bad' },
                  ]}
                />
              </div>
              <TextAreaField label="Notes" value={room.notes} onChange={(v) => patchRoom(room.id, { notes: v })} rows={2} />
              <PhotoPicker
                propertyId={property.id}
                photos={property.photos}
                photoIds={room.photoIds}
                roomId={room.id}
                onAdd={(photo) => {
                  update((p) => ({ ...p, photos: [...p.photos, photo] }))
                  patchRoom(room.id, { photoIds: [...room.photoIds, photo.id] })
                }}
                onRemove={(photoId) => {
                  update((p) => ({ ...p, photos: p.photos.filter((ph) => ph.id !== photoId) }))
                  patchRoom(room.id, { photoIds: room.photoIds.filter((id) => id !== photoId) })
                }}
              />
              <button
                className="btn btn-danger"
                onClick={() => update((p) => ({ ...p, rooms: p.rooms.filter((r) => r.id !== room.id) }))}
              >
                Supprimer la pièce
              </button>
            </div>
          </details>
        ))}
      </div>

      <div className="card space-y-3">
        <h2 className="section-title">Anomalies relevées</h2>
        {property.anomalies.length === 0 ? (
          <p className="text-sm text-gray-500">
            Aucune anomalie. Utilisez le bouton rouge « + Anomalie » dès que quelque chose vous semble
            suspect pendant la visite.
          </p>
        ) : (
          property.anomalies.map((anomaly) => (
            <div key={anomaly.id} className="rounded-lg border border-gray-200 p-3 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                {anomaly.redFlag && <span>🚩</span>}
                <strong>{anomaly.category}</strong>
                {anomaly.room && <span className="text-gray-500">· {anomaly.room}</span>}
                <span
                  className={`chip ${
                    anomaly.severity === 'critical' || anomaly.severity === 'high'
                      ? 'bg-red-100 text-red-800'
                      : anomaly.severity === 'medium'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  {SEVERITY_LABELS[anomaly.severity]}
                </span>
                {anomaly.estimatedCost !== undefined && <span>{formatEUR(anomaly.estimatedCost)}</span>}
                {anomaly.checkByPro && <span className="chip bg-blue-100 text-blue-800">Avis pro requis</span>}
              </div>
              <p className="mt-1">{anomaly.description}</p>
              <button
                className="no-print mt-2 text-xs text-red-700"
                onClick={() =>
                  update((p) => ({ ...p, anomalies: p.anomalies.filter((a) => a.id !== anomaly.id) }))
                }
              >
                Supprimer
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
