import type { LatLng, UiTrail } from './trail-data'

const DATABASE_NAME = 'wildloop-offline'
const STORE_NAME = 'trail-routes'

export interface OfflineTrail {
  id: number
  trail: UiTrail
  route: LatLng[]
  savedAt: string
}

function database(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null)
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, 2)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains('run-uploads')) db.createObjectStore('run-uploads', { keyPath: 'uploadId' })
      if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME, { keyPath: 'id' })
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

async function request<T>(mode: IDBTransactionMode, operation: (store: IDBObjectStore) => IDBRequest<T>): Promise<T | null> {
  const db = await database()
  if (!db) return null
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, mode)
    const result = operation(transaction.objectStore(STORE_NAME))
    result.onsuccess = () => resolve(result.result)
    result.onerror = () => reject(result.error)
    transaction.oncomplete = () => db.close()
  })
}

export async function saveTrailOffline(trail: UiTrail, route: LatLng[]): Promise<void> {
  if (route.length < 2) throw new Error('This trail has no verified route geometry to download')
  await request('readwrite', store => store.put({ id: trail.id, trail, route, savedAt: new Date().toISOString() }))
}

export async function removeOfflineTrail(id: number): Promise<void> {
  await request('readwrite', store => store.delete(id))
}

export async function offlineTrail(id: number): Promise<OfflineTrail | null> {
  return await request<OfflineTrail>('readonly', store => store.get(id))
}

export async function isTrailOffline(id: number): Promise<boolean> {
  return !!await offlineTrail(id)
}

