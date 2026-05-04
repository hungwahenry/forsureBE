export const STORAGE_PROVIDER_TOKEN = Symbol('STORAGE_PROVIDER_TOKEN');

export interface PutOptions {
  contentType: string;
  cacheControl?: string;
}

export interface FetchedObject {
  body: Buffer;
  contentType: string;
}

export interface StorageProvider {
  put(key: string, body: Buffer, opts: PutOptions): Promise<void>;
  /** Fetch an object by key. Throws if missing. */
  get(key: string): Promise<FetchedObject>;
  delete(key: string): Promise<void>;
  publicUrl(key: string): string;
}
