/**
 * Bouton « + Anomalie » : saisie ultra-rapide pendant la visite.
 * Quelques secondes suffisent : catégorie, description, gravité, photo.
 */
import { useState } from 'react'
import type { Anomaly, Photo, Severity } from '../models/inspection'
import { SEVERITY_LABELS } from '../models/inspection'
import { RENOVATION_CATEGORIES } from '../data/renovationCategories'
import { createId } from '../utils/id'
import { NumberField, Segmented, SelectField, TextAreaField, TextField } from './ui'
import PhotoPicker from './PhotoPicker'

interface AnomalyModalProps {
  propertyId: string
  photos: Photo[]
  roomNames: string[]
  onAddPhoto: (photo: Photo) => void
  onRemovePhoto: (photoId: string) => void
  onSave: (anomaly: Anomaly) => void
  onClose: () => void
}

export default function AnomalyModal({
  propertyId,
  photos,
  roomNames,
  onAddPhoto,
  onRemovePhoto,
  onSave,
  onClose,
}: AnomalyModalProps) {
  const [category, setCategory] = useState<string>('Autre')
  const [room, setRoom] = useState<string>()
  const [description, setDescription] = useState('')
  const [severity, setSeverity] = useState<Severity>('medium')
  const [estimatedCost, setEstimatedCost] = useState<number>()
  const [checkByPro, setCheckByPro] = useState(false)
  const [redFlag, setRedFlag] = useState(false)
  const [photoIds, setPhotoIds] = useState<string[]>([])

  function save() {
    if (!description.trim()) return
    onSave({
      id: createId(),
      category,
      room,
      description: description.trim(),
      severity,
      estimatedCost,
      checkByPro,
      redFlag,
      photoIds,
      createdAt: new Date().toISOString(),
    })
    onClose()
  }

  return (
    <div className="no-print fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center">
      <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white p-4 sm:rounded-2xl">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold">⚠️ Nouvelle anomalie</h2>
          <button className="btn" onClick={onClose}>
            Fermer
          </button>
        </div>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <SelectField
              label="Catégorie"
              value={category}
              onChange={(v) => setCategory(v ?? 'Autre')}
              options={RENOVATION_CATEGORIES.map((c) => ({ value: c, label: c }))}
            />
            <TextField
              label="Pièce"
              value={room}
              onChange={setRoom}
              placeholder={roomNames[0] ?? 'Ex. Cuisine'}
            />
          </div>
          <TextAreaField
            label="Description"
            value={description}
            onChange={setDescription}
            rows={3}
            placeholder="Ex. Fissure en escalier sur le pignon, ~2 m"
          />
          <div>
            <span className="label">Gravité</span>
            <Segmented
              value={severity}
              onChange={(s) => setSeverity(s as Severity)}
              options={(Object.keys(SEVERITY_LABELS) as Severity[]).map((s) => ({
                value: s,
                label: SEVERITY_LABELS[s],
                tone: s === 'critical' || s === 'high' ? 'bad' : s === 'medium' ? 'average' : 'neutral',
              }))}
            />
          </div>
          <NumberField label="Coût estimé" unit="€" value={estimatedCost} onChange={setEstimatedCost} />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={checkByPro} onChange={(e) => setCheckByPro(e.target.checked)} />
            À faire vérifier par un professionnel
          </label>
          <label className="flex items-center gap-2 text-sm font-medium text-red-700">
            <input type="checkbox" checked={redFlag} onChange={(e) => setRedFlag(e.target.checked)} />
            🚩 Red flag
          </label>
          <PhotoPicker
            propertyId={propertyId}
            photos={photos}
            photoIds={photoIds}
            category={category}
            onAdd={(photo) => {
              onAddPhoto(photo)
              setPhotoIds((ids) => [...ids, photo.id])
            }}
            onRemove={(photoId) => {
              onRemovePhoto(photoId)
              setPhotoIds((ids) => ids.filter((id) => id !== photoId))
            }}
          />
          <button className="btn btn-primary btn-lg w-full" onClick={save} disabled={!description.trim()}>
            Enregistrer l'anomalie
          </button>
        </div>
      </div>
    </div>
  )
}
