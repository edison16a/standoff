import { CACHE_NAME, CACHE_PREFIX, type RemoteFile } from "./model-files";

export interface Fetched {
  bytes: Uint8Array<ArrayBuffer>;
  fromCache: boolean;
}

let cleared = false;

/**
 * Downloads a file with progress, keeping it in the browser's Cache
 * Storage so the next visit starts at once and works offline. Only the
 * download happens here: the file then lives on this computer, and
 * nothing from the camera is ever sent anywhere.
 */
export async function fetchCached(file: RemoteFile, onProgress: (loaded: number) => void, signal?: AbortSignal): Promise<Fetched> {
  const cache = await openCache();
  const hit = await cache?.match(file.url).catch(() => undefined);
  if (hit) {
    const bytes = new Uint8Array(await hit.arrayBuffer());
    if (bytes.byteLength > 0) {
      onProgress(bytes.byteLength);
      return { bytes, fromCache: true };
    }
  }
  const response = await fetch(file.url, { signal, mode: "cors", credentials: "omit" });
  if (!response.ok || !response.body) throw new Error(`Download failed with status ${response.status}.`);
  const bytes = await readAll(response.body.getReader(), onProgress);
  // A full disk or a private window can refuse to cache. The download still counts.
  await cache?.put(file.url, new Response(bytes, { headers: { "content-type": file.type } })).catch(() => undefined);
  return { bytes, fromCache: false };
}

async function readAll(reader: ReadableStreamDefaultReader<Uint8Array>, onProgress: (loaded: number) => void): Promise<Uint8Array<ArrayBuffer>> {
  const chunks: Uint8Array[] = [];
  let loaded = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    loaded += value.byteLength;
    onProgress(loaded);
  }
  const bytes = new Uint8Array(new ArrayBuffer(loaded));
  let at = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, at);
    at += chunk.byteLength;
  }
  return bytes;
}

async function openCache(): Promise<Cache | null> {
  if (typeof caches === "undefined") return null;
  try {
    if (!cleared) {
      cleared = true;
      // Runtimes from older versions of the package would only take up space.
      for (const name of await caches.keys()) if (name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME) await caches.delete(name);
    }
    return await caches.open(CACHE_NAME);
  } catch {
    return null;
  }
}

/** Whether a file is already on this computer, so the loader can say "ready" instead of "downloading". */
export async function isCached(file: RemoteFile): Promise<boolean> {
  const cache = await openCache();
  return !!(await cache?.match(file.url).catch(() => undefined));
}
