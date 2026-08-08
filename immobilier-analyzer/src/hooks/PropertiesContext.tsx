/**
 * État global des biens. Chaque modification passe par update() qui
 * met à jour l'état React ET persiste immédiatement via storageService :
 * la sauvegarde est automatique, il n'existe aucun bouton « Enregistrer ».
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import type { Property } from '../models/property'
import { storageService } from '../services/storageService'

interface PropertiesContextValue {
  properties: Property[]
  loading: boolean
  create(title: string, city: string): Promise<Property>
  add(property: Property): Promise<Property>
  update(id: string, updater: (property: Property) => Property): void
  remove(id: string): Promise<void>
  duplicate(id: string): Promise<Property | undefined>
  importMany(list: Property[]): Promise<void>
}

const PropertiesContext = createContext<PropertiesContextValue | null>(null)

export function PropertiesProvider({ children }: { children: ReactNode }) {
  const [properties, setProperties] = useState<Property[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    storageService
      .getProperties()
      .then((list) => {
        if (!cancelled) setProperties(list)
      })
      .catch((error) => console.error('Chargement impossible', error))
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const create = useCallback(async (title: string, city: string) => {
    const property = await storageService.createProperty(title, city)
    setProperties((prev) => [property, ...prev])
    return property
  }, [])

  const add = useCallback(async (property: Property) => {
    const saved = await storageService.addProperty(property)
    setProperties((prev) => [saved, ...prev.filter((p) => p.id !== saved.id)])
    return saved
  }, [])

  const update = useCallback((id: string, updater: (property: Property) => Property) => {
    setProperties((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p
        const updated = { ...updater(p), updatedAt: new Date().toISOString() }
        void storageService
          .updateProperty(updated)
          .catch((error) => console.error('Sauvegarde impossible', error))
        return updated
      }),
    )
  }, [])

  const remove = useCallback(async (id: string) => {
    await storageService.deleteProperty(id)
    setProperties((prev) => prev.filter((p) => p.id !== id))
  }, [])

  const duplicate = useCallback(async (id: string) => {
    const copy = await storageService.duplicateProperty(id)
    if (copy) setProperties((prev) => [copy, ...prev])
    return copy
  }, [])

  const importMany = useCallback(async (list: Property[]) => {
    for (const property of list) await storageService.addProperty(property)
    setProperties(await storageService.getProperties())
  }, [])

  return (
    <PropertiesContext.Provider
      value={{ properties, loading, create, add, update, remove, duplicate, importMany }}
    >
      {children}
    </PropertiesContext.Provider>
  )
}

export function useProperties(): PropertiesContextValue {
  const ctx = useContext(PropertiesContext)
  if (!ctx) throw new Error('useProperties doit être utilisé sous PropertiesProvider')
  return ctx
}

export function useProperty(id: string | undefined): Property | undefined {
  const { properties } = useProperties()
  return id ? properties.find((p) => p.id === id) : undefined
}
