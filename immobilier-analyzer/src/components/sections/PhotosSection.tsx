/** Photos : vue d'ensemble de toutes les photos du dossier. */
import type { SectionProps } from './types'
import { formatDate } from '../../utils/format'
import { findInspectionItem } from '../../data/inspectionSections'
import { storageService } from '../../services/storageService'
import PhotoPicker, { usePhotoUrl } from '../PhotoPicker'
import type { Photo } from '../../models/inspection'

function PhotoCard({
  photo,
  roomName,
  onCaption,
  onDelete,
}: {
  photo: Photo
  roomName?: string
  onCaption: (caption: string) => void
  onDelete: () => void
}) {
  const url = usePhotoUrl(photo.id)
  const context =
    roomName ??
    (photo.inspectionItemId ? findInspectionItem(photo.inspectionItemId)?.label : undefined) ??
    photo.category
  return (
    <div className="card p-2">
      {url ? (
        <img src={url} alt={photo.caption ?? 'Photo'} className="h-40 w-full rounded-lg object-cover" />
      ) : (
        <div className="flex h-40 items-center justify-center rounded-lg bg-gray-100 text-gray-400">…</div>
      )}
      <div className="mt-1 text-xs text-gray-500">
        {context ? `${context} · ` : ''}
        {formatDate(photo.createdAt)}
      </div>
      <input
        className="input mt-1 px-2 py-1.5 text-sm"
        placeholder="Légende…"
        value={photo.caption ?? ''}
        onChange={(e) => onCaption(e.target.value)}
      />
      <button className="no-print mt-1 text-xs text-red-700" onClick={onDelete}>
        Supprimer
      </button>
    </div>
  )
}

export default function PhotosSection({ property, update }: SectionProps) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-500">
        Les photos sont stockées localement (IndexedDB). Elles ne sont pas incluses dans les exports
        JSON : pensez à les sauvegarder par ailleurs si nécessaire.
      </p>
      <div className="card">
        <span className="label">Ajouter des photos générales</span>
        <PhotoPicker
          propertyId={property.id}
          photos={property.photos}
          photoIds={[]}
          onAdd={(photo) => update((p) => ({ ...p, photos: [...p.photos, photo] }))}
          onRemove={() => undefined}
        />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {property.photos.map((photo) => (
          <PhotoCard
            key={photo.id}
            photo={photo}
            roomName={property.rooms.find((r) => r.id === photo.roomId)?.name}
            onCaption={(caption) =>
              update((p) => ({
                ...p,
                photos: p.photos.map((ph) => (ph.id === photo.id ? { ...ph, caption } : ph)),
              }))
            }
            onDelete={() => {
              void storageService.deletePhotoBlob(photo.id)
              update((p) => ({
                ...p,
                photos: p.photos.filter((ph) => ph.id !== photo.id),
                rooms: p.rooms.map((r) => ({
                  ...r,
                  photoIds: r.photoIds.filter((id) => id !== photo.id),
                })),
              }))
            }}
          />
        ))}
      </div>
      {property.photos.length === 0 && (
        <p className="py-6 text-center text-sm text-gray-400">
          Aucune photo. Ajoutez-en ici, depuis une pièce, un critère de checklist ou une anomalie.
        </p>
      )}
    </div>
  )
}
