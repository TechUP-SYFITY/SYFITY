export interface IObjectStorage {
  createSignedUploadUrl(path: string): Promise<{ path: string; token: string }>;
  getPublicUrl(path: string): string;
  remove(path: string): Promise<void>;
}
