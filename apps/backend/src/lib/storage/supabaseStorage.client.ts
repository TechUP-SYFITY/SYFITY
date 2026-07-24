import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { ERROR_CODES } from '@syfity/shared';

import type { IObjectStorage } from './objectStorage.interface';
import { AppError } from '../../errors/appError';

export class SupabaseStorageClient implements IObjectStorage {
  private readonly client: SupabaseClient;

  constructor(
    private readonly bucket: string,
    url: string,
    secretKey: string,
  ) {
    this.client = createClient(url, secretKey);
  }

  async createSignedUploadUrl(path: string): Promise<{ path: string; token: string }> {
    const { data, error } = await this.client.storage.from(this.bucket).createSignedUploadUrl(path);
    if (error || !data) {
      throw new AppError(502, ERROR_CODES.SERVER_INTERNAL_ERROR, '업로드 URL 발급에 실패했습니다.');
    }
    return { path: data.path, token: data.token };
  }

  getPublicUrl(path: string): string {
    return this.client.storage.from(this.bucket).getPublicUrl(path).data.publicUrl;
  }

  async remove(path: string): Promise<void> {
    const { error } = await this.client.storage.from(this.bucket).remove([path]);
    if (error) {
      throw new AppError(
        502,
        ERROR_CODES.SERVER_INTERNAL_ERROR,
        '프로필 이미지 삭제에 실패했습니다.',
      );
    }
  }
}
