import { http, HttpResponse } from 'msw';

import type { ApiFailureResponse } from '@/shared/types/api';
import type { PlaylistItem } from '@/shared/types/domain';

import {
  personalPlaylistSeeds,
  type PersonalPlaylistSeed,
} from '../fixtures/personalPlaylistFixture';
import { roomFixture } from '../fixtures/roomFixture';

const API = '*/api/v1';

// 인메모리 상태 (세션 동안 CRUD 반영)
let playlists: PersonalPlaylistSeed[] = personalPlaylistSeeds.map((seed) => ({
  ...seed,
  items: [...seed.items],
}));

let sequence = 0;
const nextId = (prefix: string) => `${prefix}-${(sequence += 1)}`;

const notFound = (code = 'PERSONAL_PLAYLIST_NOT_FOUND', message = 'Playlist not found') =>
  HttpResponse.json({ success: false, error: { code, message } } satisfies ApiFailureResponse, {
    status: 404,
  });

const toSummary = (seed: PersonalPlaylistSeed) => ({
  id: seed.id,
  name: seed.name,
  description: seed.description ?? null,
  coverUrl: seed.coverUrl ?? null,
  itemCount: seed.items.length,
  totalDuration: seed.items.reduce((sum, item) => sum + item.duration, 0),
  updatedAt: seed.updatedAt,
});

// docs/05 §7.1: 상세는 요약(playlist)과 곡 목록(items)을 분리한 중첩 구조로 응답한다.
const toDetail = (seed: PersonalPlaylistSeed) => ({
  playlist: toSummary(seed),
  items: [...seed.items].sort((a, b) => a.position - b.position),
});

const find = (id: string | readonly string[] | undefined) =>
  playlists.find((seed) => seed.id === id);

export const personalPlaylistHandlers = [
  http.get(`${API}/personal-playlists`, () =>
    HttpResponse.json({ success: true, data: { playlists: playlists.map(toSummary) } }),
  ),

  http.post(`${API}/personal-playlists`, async ({ request }) => {
    const body = (await request.json()) as {
      name: string;
      description?: string;
      coverUrl?: string;
    };
    const now = new Date().toISOString();
    const seed: PersonalPlaylistSeed = {
      id: nextId('pl'),
      name: body.name,
      description: body.description ?? null,
      coverUrl: body.coverUrl ?? null,
      updatedAt: now,
      items: [],
    };
    playlists = [seed, ...playlists];
    // docs/05 §7.1: 생성 응답은 { id, name, createdAt } 최소 필드만 반환한다.
    return HttpResponse.json(
      { success: true, data: { id: seed.id, name: seed.name, createdAt: now } },
      { status: 201 },
    );
  }),

  http.get(`${API}/personal-playlists/:id`, ({ params }) => {
    const seed = find(params.id);
    return seed ? HttpResponse.json({ success: true, data: toDetail(seed) }) : notFound();
  }),

  http.patch(`${API}/personal-playlists/:id`, async ({ params, request }) => {
    const seed = find(params.id);
    if (!seed) return notFound();
    const body = (await request.json()) as {
      name?: string;
      description?: string;
      coverUrl?: string;
    };
    if (body.name !== undefined) seed.name = body.name;
    if (body.description !== undefined) seed.description = body.description;
    if (body.coverUrl !== undefined) seed.coverUrl = body.coverUrl;
    seed.updatedAt = new Date().toISOString();
    // docs/05 §7.1: 이름 변경 응답은 { id, name, updatedAt } 최소 필드만 반환한다.
    return HttpResponse.json({
      success: true,
      data: { id: seed.id, name: seed.name, updatedAt: seed.updatedAt },
    });
  }),

  http.delete(`${API}/personal-playlists/:id`, ({ params }) => {
    const seed = find(params.id);
    if (!seed) return notFound();
    playlists = playlists.filter((p) => p.id !== seed.id);
    return new HttpResponse(null, { status: 204 });
  }),

  http.post(`${API}/personal-playlists/:id/items`, async ({ params, request }) => {
    const seed = find(params.id);
    if (!seed) return notFound();
    const body = (await request.json()) as { videoId?: string; youtubeUrl?: string };
    const videoId =
      body.videoId ?? extractYoutubeVideoId(body.youtubeUrl) ?? `mock-${sequence + 1}`;
    const created: PlaylistItem = {
      id: nextId('ppi'),
      videoId,
      title: body.youtubeUrl ?? `Mock Track ${seed.items.length + 1}`,
      channelTitle: 'Mock Channel',
      duration: 200,
      position: seed.items.length,
      status: 'available',
      addedBy: 'mock-user',
      thumbnailUrl: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
    };
    seed.items = [...seed.items, created];
    seed.updatedAt = new Date().toISOString();
    return HttpResponse.json({ success: true, data: created }, { status: 201 });
  }),

  http.delete(`${API}/personal-playlists/:id/items/:itemId`, ({ params }) => {
    const seed = find(params.id);
    if (!seed) return notFound();
    const itemId = String(params.itemId);
    if (!seed.items.some((it) => it.id === itemId)) {
      return notFound();
    }
    seed.items = seed.items.filter((it) => it.id !== itemId);
    return new HttpResponse(null, { status: 204 });
  }),

  http.patch(`${API}/personal-playlists/:id/items`, async ({ params, request }) => {
    const seed = find(params.id);
    if (!seed) return notFound();
    const body = (await request.json()) as { items: { id: string; position: number }[] };
    const positionById = new Map(body.items.map((it) => [it.id, it.position]));
    seed.items = [...seed.items]
      .map((it) => ({ ...it, position: positionById.get(it.id) ?? it.position }))
      .sort((a, b) => a.position - b.position);
    return HttpResponse.json({ success: true, data: { items: seed.items } });
  }),

  // Room으로 불러오기 — 중복/재생불가 스킵 후 건수 반환 (docs/05 §6.5).
  http.post(`${API}/rooms/:roomId/playlist-imports`, async ({ request }) => {
    const body = (await request.json()) as { personalPlaylistId: string };
    const seed = playlists.find((p) => p.id === body.personalPlaylistId);
    if (!seed) return notFound();

    const roomVideoIds = new Set(roomFixture.playlist.map((it) => it.videoId));
    let addedCount = 0;
    let duplicateCount = 0;
    let unavailableCount = 0;

    for (const it of seed.items) {
      if (it.status === 'unavailable' || it.duration === 0) {
        unavailableCount += 1;
      } else if (roomVideoIds.has(it.videoId)) {
        duplicateCount += 1;
      } else {
        addedCount += 1;
      }
    }

    return HttpResponse.json({
      success: true,
      data: { addedCount, duplicateCount, unavailableCount },
    });
  }),
];

function extractYoutubeVideoId(url: string | undefined) {
  if (!url) return null;
  const directMatch = url.match(/[?&]v=([^&]+)/);
  const shortMatch = url.match(/youtu\.be\/([^?&]+)/);
  return directMatch?.[1] ?? shortMatch?.[1] ?? null;
}
