/**
 * Couche de stockage. L'interface n'accède jamais directement à
 * IndexedDB : tout passe par storageService, dont l'adaptateur est
 * interchangeable (IndexedDB en production, mémoire dans les tests —
 * et plus tard un backend distant sans changer les composants).
 */
import type { Property } from '../models/property'
import { createEmptyProperty, normalizeProperty } from '../models/property'
import { createId } from '../utils/id'

export interface StorageAdapter {
  listProperties(): Promise<Property[]>
  getProperty(id: string): Promise<Property | undefined>
  putProperty(property: Property): Promise<void>
  deleteProperty(id: string): Promise<void>
  putPhotoBlob(id: string, blob: Blob): Promise<void>
  getPhotoBlob(id: string): Promise<Blob | undefined>
  deletePhotoBlob(id: string): Promise<void>
}

/* ---------- Adaptateur IndexedDB ---------- */

const DB_NAME = 'immobilier-analyzer'
const DB_VERSION = 1
const PROPERTIES_STORE = 'properties'
const PHOTOS_STORE = 'photos'

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(PROPERTIES_STORE)) {
        db.createObjectStore(PROPERTIES_STORE, { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains(PHOTOS_STORE)) {
        db.createObjectStore(PHOTOS_STORE)
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export class IndexedDbAdapter implements StorageAdapter {
  private dbPromise: Promise<IDBDatabase> | null = null

  private db(): Promise<IDBDatabase> {
    this.dbPromise = this.dbPromise ?? openDb()
    return this.dbPromise
  }

  private async store(name: string, mode: IDBTransactionMode) {
    const db = await this.db()
    return db.transaction(name, mode).objectStore(name)
  }

  async listProperties(): Promise<Property[]> {
    const store = await this.store(PROPERTIES_STORE, 'readonly')
    const all = await requestToPromise(store.getAll() as IDBRequest<Property[]>)
    return all.map((p) => normalizeProperty(p))
  }

  async getProperty(id: string): Promise<Property | undefined> {
    const store = await this.store(PROPERTIES_STORE, 'readonly')
    const raw = await requestToPromise(store.get(id) as IDBRequest<Property | undefined>)
    return raw ? normalizeProperty(raw) : undefined
  }

  async putProperty(property: Property): Promise<void> {
    const store = await this.store(PROPERTIES_STORE, 'readwrite')
    await requestToPromise(store.put(property))
  }

  async deleteProperty(id: string): Promise<void> {
    const store = await this.store(PROPERTIES_STORE, 'readwrite')
    await requestToPromise(store.delete(id))
  }

  async putPhotoBlob(id: string, blob: Blob): Promise<void> {
    const store = await this.store(PHOTOS_STORE, 'readwrite')
    await requestToPromise(store.put(blob, id))
  }

  async getPhotoBlob(id: string): Promise<Blob | undefined> {
    const store = await this.store(PHOTOS_STORE, 'readonly')
    return requestToPromise(store.get(id) as IDBRequest<Blob | undefined>)
  }

  async deletePhotoBlob(id: string): Promise<void> {
    const store = await this.store(PHOTOS_STORE, 'readwrite')
    await requestToPromise(store.delete(id))
  }
}

/* ---------- Adaptateur mémoire (tests, environnements sans IndexedDB) ---------- */

export class MemoryAdapter implements StorageAdapter {
  private properties = new Map<string, Property>()
  private photos = new Map<string, Blob>()

  async listProperties() {
    return [...this.properties.values()]
  }
  async getProperty(id: string) {
    return this.properties.get(id)
  }
  async putProperty(property: Property) {
    this.properties.set(property.id, property)
  }
  async deleteProperty(id: string) {
    this.properties.delete(id)
  }
  async putPhotoBlob(id: string, blob: Blob) {
    this.photos.set(id, blob)
  }
  async getPhotoBlob(id: string) {
    return this.photos.get(id)
  }
  async deletePhotoBlob(id: string) {
    this.photos.delete(id)
  }
}

/* ---------- Service ---------- */

export interface StorageService {
  getProperties(): Promise<Property[]>
  getProperty(id: string): Promise<Property | undefined>
  createProperty(title: string, city: string): Promise<Property>
  /** Enregistre un bien complet (créé par import ou restauré). */
  addProperty(property: Property): Promise<Property>
  updateProperty(property: Property): Promise<Property>
  deleteProperty(id: string): Promise<void>
  duplicateProperty(id: string): Promise<Property | undefined>
  savePhotoBlob(blob: Blob): Promise<string>
  getPhotoBlob(id: string): Promise<Blob | undefined>
  deletePhotoBlob(id: string): Promise<void>
}

export function createStorageService(adapter: StorageAdapter): StorageService {
  return {
    async getProperties() {
      const list = await adapter.listProperties()
      return list.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    },

    getProperty: (id) => adapter.getProperty(id),

    async createProperty(title, city) {
      const property = createEmptyProperty(createId(), title, city, new Date().toISOString())
      await adapter.putProperty(property)
      return property
    },

    async addProperty(property) {
      const normalized = normalizeProperty(property)
      await adapter.putProperty(normalized)
      return normalized
    },

    async updateProperty(property) {
      const updated = { ...property, updatedAt: new Date().toISOString() }
      await adapter.putProperty(updated)
      return updated
    },

    deleteProperty: (id) => adapter.deleteProperty(id),

    async duplicateProperty(id) {
      const original = await adapter.getProperty(id)
      if (!original) return undefined
      const now = new Date().toISOString()
      const copy: Property = {
        ...structuredClone(original),
        id: createId(),
        createdAt: now,
        updatedAt: now,
        general: { ...original.general, title: `${original.general.title} (copie)` },
      }
      await adapter.putProperty(copy)
      return copy
    },

    async savePhotoBlob(blob) {
      const id = createId()
      await adapter.putPhotoBlob(id, blob)
      return id
    },

    getPhotoBlob: (id) => adapter.getPhotoBlob(id),
    deletePhotoBlob: (id) => adapter.deletePhotoBlob(id),
  }
}

function defaultAdapter(): StorageAdapter {
  return typeof indexedDB !== 'undefined' ? new IndexedDbAdapter() : new MemoryAdapter()
}

/** Instance globale utilisée par l'application. */
export const storageService: StorageService = createStorageService(defaultAdapter())
