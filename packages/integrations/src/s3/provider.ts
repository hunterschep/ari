import { addHoursIso, stableHash } from "@ari/shared";

export interface ObjectStorageProvider {
  createUploadUrl(input: { userId: string; fileName: string; contentType: string }): Promise<{ uploadUrl: string; storageKey: string; expiresAt: string }>;
  createDownloadUrl(input: { storageKey: string; expiresInSeconds?: number }): Promise<{ downloadUrl: string; expiresAt: string }>;
}

export class MockObjectStorageProvider implements ObjectStorageProvider {
  async createUploadUrl(input: { userId: string; fileName: string; contentType: string }) {
    const storageKey = `${input.userId}/${stableHash([input.fileName, input.contentType].join(":")).slice(0, 20)}-${input.fileName}`;
    return {
      storageKey,
      uploadUrl: `https://ari.local/upload/${encodeURIComponent(storageKey)}`,
      expiresAt: addHoursIso(1)
    };
  }

  async createDownloadUrl(input: { storageKey: string; expiresInSeconds?: number }) {
    return {
      downloadUrl: `https://ari.local/download/${encodeURIComponent(input.storageKey)}`,
      expiresAt: addHoursIso((input.expiresInSeconds ?? 3600) / 3600)
    };
  }
}
