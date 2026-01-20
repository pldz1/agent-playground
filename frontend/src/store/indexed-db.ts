const DB_NAME = "ai-agent-store";
const DB_VERSION = 1;
const STORE_NAME = "keyvalue";

const hasIndexedDb = typeof indexedDB !== "undefined";

let dbPromise: Promise<IDBDatabase> | null = null;
const memoryStore = new Map<string, string>();

const openDatabase = async (): Promise<IDBDatabase> => {
  if (!hasIndexedDb) {
    throw new Error("IndexedDB is not available in this environment.");
  }

  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => {
        dbPromise = null;
        reject(request.error ?? new Error("Failed to open IndexedDB database."));
      };
    });
  }

  return dbPromise;
};

export const getItem = async (key: string): Promise<string | null> => {
  if (!hasIndexedDb) {
    return memoryStore.has(key) ? memoryStore.get(key)! : null;
  }

  const db = await openDatabase();

  return new Promise<string | null>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(key);

    request.onsuccess = () => {
      resolve((request.result as string | undefined) ?? null);
    };

    request.onerror = () => {
      reject(request.error ?? new Error(`Failed to read key "${key}" from IndexedDB.`));
    };
  });
};

export const setItem = async (key: string, value: string): Promise<void> => {
  if (!hasIndexedDb) {
    memoryStore.set(key, value);
    return;
  }

  const db = await openDatabase();

  return new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    store.put(value, key);

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => {
      reject(transaction.error ?? new Error(`Failed to write key "${key}" to IndexedDB.`));
    };
    transaction.onabort = () => {
      reject(transaction.error ?? new Error(`IndexedDB transaction aborted for key "${key}".`));
    };
  });
};

export const removeItem = async (key: string): Promise<void> => {
  if (!hasIndexedDb) {
    memoryStore.delete(key);
    return;
  }

  const db = await openDatabase();

  return new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    store.delete(key);

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => {
      reject(transaction.error ?? new Error(`Failed to delete key "${key}" from IndexedDB.`));
    };
    transaction.onabort = () => {
      reject(transaction.error ?? new Error(`IndexedDB transaction aborted for key "${key}".`));
    };
  });
};
