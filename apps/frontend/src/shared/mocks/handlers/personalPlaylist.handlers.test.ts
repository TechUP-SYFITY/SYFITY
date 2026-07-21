// 개인 Playlist MSW 핸들러가 docs/05-api-spec.md 7절·6.5의 계약을 따르는지 검증한다.
import { describe, expect, it } from 'vitest';

import type { ApiResponse } from '@/shared/types/api';

const BASE = 'http://localhost:4000/api/v1';

async function call<T>(path: string, init?: RequestInit) {
  const response = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  const data = response.status === 204 ? undefined : ((await response.json()) as ApiResponse<T>);

  return { data, status: response.status };
}

interface Summary {
  id: string;
  name: string;
  itemCount: number;
  totalDuration: number;
}

const createPlaylist = (name: string) =>
  call<Summary>('/personal-playlists', { body: JSON.stringify({ name }), method: 'POST' });

describe('personal playlist MSW handlers', () => {
  it('목록을 /personal-playlists 경로로 제공한다', async () => {
    const { data, status } = await call<{ playlists: Summary[] }>('/personal-playlists');

    expect(status).toBe(200);
    expect(data).toEqual({
      success: true,
      data: { playlists: expect.any(Array) },
    });
  });

  it('목록 항목은 itemCount와 totalDuration을 계산해서 내려준다', async () => {
    const { data } = await call<{ playlists: Summary[] }>('/personal-playlists');
    const playlists = data?.success ? data.data.playlists : [];
    const nightDrive = playlists.find((playlist) => playlist.id === 'pl-night-drive');

    expect(nightDrive).toMatchObject({ name: '밤 드라이브', itemCount: 4 });
    // 226 + 337 + 258 + 0(재생불가)
    expect(nightDrive?.totalDuration).toBe(821);
  });

  it('상세는 position 오름차순으로 items를 정렬해 내려준다', async () => {
    const { data, status } = await call<{ items: { position: number }[] }>(
      '/personal-playlists/pl-night-drive',
    );
    const positions = data?.success ? data.data.items.map((item) => item.position) : [];

    expect(status).toBe(200);
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
  });

  it('없는 플레이리스트는 docs/05 코드인 PERSONAL_PLAYLIST_NOT_FOUND로 404를 반환한다', async () => {
    const { data, status } = await call('/personal-playlists/does-not-exist');

    expect(status).toBe(404);
    expect(data).toEqual({
      success: false,
      error: { code: 'PERSONAL_PLAYLIST_NOT_FOUND', message: 'Playlist not found' },
    });
  });

  it('생성은 201과 함께 빈 플레이리스트 요약을 반환한다', async () => {
    const { data, status } = await createPlaylist('새 리스트');

    expect(status).toBe(201);
    expect(data).toMatchObject({
      success: true,
      data: { name: '새 리스트', itemCount: 0, totalDuration: 0 },
    });
  });

  it('곡 추가 후 상세에 반영되고, 삭제하면 다시 빠진다', async () => {
    const created = await createPlaylist('CRUD 검증용');
    const id = created.data?.success ? created.data.data.id : '';

    const added = await call<{ id: string }>(`/personal-playlists/${id}/items`, {
      body: JSON.stringify({ videoId: 'abc123' }),
      method: 'POST',
    });
    expect(added.status).toBe(201);
    const itemId = added.data?.success ? added.data.data.id : '';

    const afterAdd = await call<{ items: unknown[] }>(`/personal-playlists/${id}`);
    expect(afterAdd.data?.success && afterAdd.data.data.items).toHaveLength(1);

    const deleted = await call(`/personal-playlists/${id}/items/${itemId}`, { method: 'DELETE' });
    expect(deleted.status).toBe(204);

    const afterDelete = await call<{ items: unknown[] }>(`/personal-playlists/${id}`);
    expect(afterDelete.data?.success && afterDelete.data.data.items).toHaveLength(0);
  });

  it('순서 변경은 PATCH .../items 경로에서 position 순으로 재정렬한다', async () => {
    const created = await createPlaylist('정렬 검증용');
    const id = created.data?.success ? created.data.data.id : '';

    const first = await call<{ id: string }>(`/personal-playlists/${id}/items`, {
      body: JSON.stringify({ videoId: 'first' }),
      method: 'POST',
    });
    const second = await call<{ id: string }>(`/personal-playlists/${id}/items`, {
      body: JSON.stringify({ videoId: 'second' }),
      method: 'POST',
    });
    const firstId = first.data?.success ? first.data.data.id : '';
    const secondId = second.data?.success ? second.data.data.id : '';

    // docs/05: position은 0부터 연속
    const reordered = await call<{ items: { id: string }[] }>(`/personal-playlists/${id}/items`, {
      body: JSON.stringify({
        items: [
          { id: secondId, position: 0 },
          { id: firstId, position: 1 },
        ],
      }),
      method: 'PATCH',
    });

    expect(reordered.status).toBe(200);
    const orderedIds = reordered.data?.success
      ? reordered.data.data.items.map((entry) => entry.id)
      : [];
    expect(orderedIds).toEqual([secondId, firstId]);
  });

  it('플레이리스트 삭제는 204를 반환하고 목록에서 제거한다', async () => {
    const created = await createPlaylist('삭제 대상');
    const id = created.data?.success ? created.data.data.id : '';

    const deleted = await call(`/personal-playlists/${id}`, { method: 'DELETE' });
    expect(deleted.status).toBe(204);

    const after = await call(`/personal-playlists/${id}`);
    expect(after.status).toBe(404);
  });

  describe('Room 불러오기 (POST /rooms/:roomId/playlist-imports)', () => {
    it('personalPlaylistId를 받아 addedCount/duplicateCount/unavailableCount를 반환한다', async () => {
      const { data, status } = await call<{
        addedCount: number;
        duplicateCount: number;
        unavailableCount: number;
      }>('/rooms/preview-room/playlist-imports', {
        body: JSON.stringify({ personalPlaylistId: 'pl-night-drive' }),
        method: 'POST',
      });

      expect(status).toBe(200);
      // 밤 드라이브 4곡 = Night Changes(방에 이미 있음) + 정상 2곡 + 재생불가 1곡
      expect(data).toEqual({
        success: true,
        data: { addedCount: 2, duplicateCount: 1, unavailableCount: 1 },
      });
    });

    it('응답에 갱신된 playlist 배열을 담지 않는다 (소켓으로 전파)', async () => {
      const { data } = await call<Record<string, unknown>>('/rooms/preview-room/playlist-imports', {
        body: JSON.stringify({ personalPlaylistId: 'pl-focus-lofi' }),
        method: 'POST',
      });

      expect(data?.success && data.data).not.toHaveProperty('playlist');
    });

    it('없는 플레이리스트 불러오기는 404를 반환한다', async () => {
      const { status } = await call('/rooms/preview-room/playlist-imports', {
        body: JSON.stringify({ personalPlaylistId: 'nope' }),
        method: 'POST',
      });

      expect(status).toBe(404);
    });
  });
});
