const DB_NAME = "coex-media-cache";
const DB_VERSION = 2;
const STORE_NAME = "blobs";
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// Store raw ArrayBuffer (survives page reloads)
async function getCacheEntry(url: string): Promise<ArrayBuffer | null> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(url);
      req.onsuccess = () => {
        const entry = req.result;
        if (!entry) return resolve(null);
        if (Date.now() - entry.ts > MAX_AGE_MS) {
          const del = db.transaction(STORE_NAME, "readwrite").objectStore(STORE_NAME);
          del.delete(url);
          return resolve(null);
        }
        resolve(entry.buffer as ArrayBuffer);
      };
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

async function setCacheEntry(url: string, buffer: ArrayBuffer): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put({ buffer, ts: Date.now() }, url);
  } catch {
    // silent
  }
}

// L1: in-memory Map of URL -> blob URL (rebuilt from IndexedDB after reload)
const memCache = new Map<string, string>();

export async function fetchMediaAsBlobUrl(url: string): Promise<string> {
  // L1 memory
  const mem = memCache.get(url);
  if (mem) return mem;

  // L2 IndexedDB (stores ArrayBuffer, recreate blob URL)
  const buffer = await getCacheEntry(url);
  if (buffer) {
    const blob = new Blob([buffer]);
    const blobUrl = URL.createObjectURL(blob);
    memCache.set(url, blobUrl);
    return blobUrl;
  }

  // Network fetch
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Media fetch failed: ${res.status}`);
  const arrayBuf = await res.arrayBuffer();
  const blob = new Blob([arrayBuf]);
  const blobUrl = URL.createObjectURL(blob);

  // Save to both caches
  memCache.set(url, blobUrl);
  setCacheEntry(url, arrayBuf);

  return blobUrl;
}
