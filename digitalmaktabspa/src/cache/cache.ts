import { openDB } from "idb";

const dbPromise = openDB("api-cache", 1, {
  upgrade(db) {
    db.createObjectStore("requests");
  },
});

export async function saveToCache(
  key: IDBKeyRange | IDBValidKey | undefined,
  data: any
) {
  const db = await dbPromise;
  const valueWithTimestamp = {
    data,
    timestamp: Date.now(), // Store the current time
  };
  await db.put("requests", valueWithTimestamp, key);
}

export async function getFromCache(
  key: IDBKeyRange | IDBValidKey,
  maxAge = 900000
) {
  // 15 minutes default expiration
  const db = await dbPromise;
  const cachedData = await db.get("requests", key);

  if (!cachedData) return null; // No cache found

  const isExpired = Date.now() - cachedData.timestamp > maxAge;
  if (isExpired) {
    await db.delete("requests", key); // Remove expired cache
    return null;
  }

  return cachedData.data; // Return valid cached data
}
