import { createClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';

import { SupabaseStorageClient } from './supabaseStorage.client';

vi.mock('@supabase/supabase-js', () => ({ createClient: vi.fn() }));

function mockStorageClient(overrides: Partial<{ signed: unknown; publicUrl: string }> = {}) {
  const bucketClient = {
    createSignedUploadUrl: vi
      .fn()
      .mockResolvedValue(
        overrides.signed ?? { data: { path: 'user/image.png', token: 'token' }, error: null },
      ),
    getPublicUrl: vi
      .fn()
      .mockReturnValue({
        data: { publicUrl: overrides.publicUrl ?? 'https://cdn.example/image.png' },
      }),
    remove: vi.fn().mockResolvedValue({ data: [], error: null }),
  };
  const from = vi.fn().mockReturnValue(bucketClient);
  vi.mocked(createClient).mockReturnValue({ storage: { from } } as never);
  return { from, bucketClient };
}

describe('SupabaseStorageClient', () => {
  it('버킷을 고정해 signed upload URL, public URL, 삭제를 Storage SDK에 위임한다', async () => {
    const { from, bucketClient } = mockStorageClient();
    const storage = new SupabaseStorageClient(
      'profile-images',
      'https://project.supabase.co',
      'secret',
    );

    await expect(storage.createSignedUploadUrl('user/image.png')).resolves.toEqual({
      path: 'user/image.png',
      token: 'token',
    });
    expect(storage.getPublicUrl('user/image.png')).toBe('https://cdn.example/image.png');
    await storage.remove('user/image.png');

    expect(from).toHaveBeenCalledWith('profile-images');
    expect(bucketClient.createSignedUploadUrl).toHaveBeenCalledWith('user/image.png');
    expect(bucketClient.getPublicUrl).toHaveBeenCalledWith('user/image.png');
    expect(bucketClient.remove).toHaveBeenCalledWith(['user/image.png']);
  });

  it('signed URL 발급 실패를 내부 서버 오류로 변환한다', async () => {
    mockStorageClient({ signed: { data: null, error: new Error('failed') } });
    const storage = new SupabaseStorageClient(
      'profile-images',
      'https://project.supabase.co',
      'secret',
    );

    await expect(storage.createSignedUploadUrl('user/image.png')).rejects.toMatchObject({
      status: 502,
      code: 'SERVER_INTERNAL_ERROR',
    });
  });
});
