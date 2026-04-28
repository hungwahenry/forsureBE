export const STORAGE_PROVIDER_TOKEN = Symbol('STORAGE_PROVIDER_TOKEN');

export interface PutOptions {
  contentType: string;
  cacheControl?: string;
}

export interface StorageProvider {
  put(key: string, body: Buffer, opts: PutOptions): Promise<void>;
  delete(key: string): Promise<void>;
  publicUrl(key: string): string;
}
