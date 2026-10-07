export type PersistentStorageStatus = 'granted' | 'not-granted' | 'not-supported';

/** Ask the browser to retain local data more aggressively when it supports it. */
export async function requestPersistentStorage(): Promise<PersistentStorageStatus> {
  if (!('storage' in navigator) || typeof navigator.storage.persist !== 'function') return 'not-supported';
  return (await navigator.storage.persist()) ? 'granted' : 'not-granted';
}
