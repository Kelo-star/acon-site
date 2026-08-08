/**
 * Ajout et affichage de photos. Les fichiers sont stockés dans IndexedDB
 * (jamais en base64 dans le document), seules les métadonnées vivent dans
 * le bien.
 */
import { useEffect, useRef, useState } from 'react'
import type { Photo } from '../models/inspection'
import { storageService } from '../services/storageService'

export function usePhotoUrl(photoId: string): string | undefined {
  const [url, setUrl] = useState<string>()
  useEffect(() => {
    let objectUrl: string | undefined
    let cancelled = false
    storageService.getPhotoBlob(photoId).then((blob) => {
      if (blob && !cancelled) {
        objectUrl = URL.createObjectURL(blob)
        setUrl(objectUrl)
      }
    })
    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [photoId])
  return url
}

function Thumb({ photo, onDelete }: { photo: Photo; onDelete?: () => void }) {
  const url = usePhotoUrl(photo.id)
  return (
    <figure className="relative">
      {url ? (
        <img src={url} alt={photo.caption ?? 'Photo'} className="h-20 w-20 rounded-lg object-cover" />
      ) : (
        <div className="flex h-20 w-20 items-center justify-center rounded-lg bg-gray-200 text-xs text-gray-500">
          …
        </div>
      )}
      {onDelete && (
        <button
          type="button"
          onClick={onDelete}
          aria-label="Supprimer la photo"
          className="no-print absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-xs text-white"
        >
          ×
        </button>
      )}
      {photo.caption && (
        <figcaption className="mt-0.5 w-20 truncate text-[10px] text-gray-500">{photo.caption}</figcaption>
      )}
    </figure>
  )
}

interface PhotoPickerProps {
  propertyId: string
  photos: Photo[]
  photoIds: string[]
  onAdd: (photo: Photo) => void
  onRemove: (photoId: string) => void
  category?: string
  roomId?: string
  inspectionItemId?: string
}

export default function PhotoPicker({
  propertyId,
  photos,
  photoIds,
  onAdd,
  onRemove,
  category,
  roomId,
  inspectionItemId,
}: PhotoPickerProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const attached = photos.filter((p) => photoIds.includes(p.id))

  async function handleFiles(files: FileList | null) {
    if (!files) return
    for (const file of Array.from(files)) {
      const id = await storageService.savePhotoBlob(file)
      onAdd({
        id,
        propertyId,
        roomId,
        inspectionItemId,
        category,
        createdAt: new Date().toISOString(),
      })
    }
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div className="flex flex-wrap items-start gap-2">
      {attached.map((photo) => (
        <Thumb
          key={photo.id}
          photo={photo}
          onDelete={() => {
            void storageService.deletePhotoBlob(photo.id)
            onRemove(photo.id)
          }}
        />
      ))}
      <button
        type="button"
        className="no-print flex h-20 w-20 flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 text-gray-500 hover:border-blue-500"
        onClick={() => inputRef.current?.click()}
      >
        <span className="text-xl">📷</span>
        <span className="text-[10px]">Photo</span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        className="hidden"
        onChange={(e) => void handleFiles(e.target.files)}
      />
    </div>
  )
}
