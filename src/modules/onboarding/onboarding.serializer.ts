import type { StorageProvider } from '../../storage/storage.interface';

export interface AvatarUploadDto {
  key: string;
  url: string;
}

export function serializeAvatarUpload(
  storage: StorageProvider,
  key: string,
): AvatarUploadDto {
  return { key, url: storage.publicUrl(key) };
}
