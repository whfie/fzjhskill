// IndexedDB 缓存管理 - 内存 + 持久化双层缓存
const DB_NAME = 'fzjhskill_cache';
const DB_VERSION = 1;
const STORE = 'data_store';
const memCache = new Map();
let dbPromise = null;

function openDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'key' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

export async function cacheGet(key) {
  if (memCache.has(key)) return memCache.get(key);
  try {
    const db = await openDB();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).get(key);
      req.onsuccess = () => {
        const rec = req.result;
        if (rec) {
          memCache.set(key, rec.data);
          resolve(rec.data);
        } else resolve(null);
      };
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}

export async function cacheSet(key, data) {
  memCache.set(key, data);
  try {
    const db = await openDB();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put({ key, data, ts: Date.now() });
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    return false;
  }
}

export async function cacheClearAll() {
  memCache.clear();
  try {
    const db = await openDB();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).clear();
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    return false;
  }
}

// 清理非当前版本的缓存键，避免版本迭代后 IndexedDB 无限增长
export async function cacheCleanOtherVersions(currentVersion) {
  if (!currentVersion) return;
  try {
    const db = await openDB();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      const store = tx.objectStore(STORE);
      const req = store.getAllKeys();
      req.onsuccess = () => {
        const suffix = `__v__${currentVersion}`;
        (req.result || []).forEach((k) => {
          if (typeof k === 'string' && k.includes('__v__') && !k.endsWith(suffix)) {
            store.delete(k);
          }
        });
      };
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // 清理失败不影响主流程
  }
}

// 清理浏览器 CacheStorage（Service Worker 缓存等）
export async function clearBrowserCacheStorage() {
  if (!('caches' in window)) return;
  try {
    const names = await caches.keys();
    await Promise.all(names.map((n) => caches.delete(n)));
  } catch {
    // 忽略
  }
}
