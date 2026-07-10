import { http, HttpResponse } from 'msw';

import type {
  AddPlaylistItemRequest,
  AddPlaylistItemResponse,
  DeletePlaylistItemResponse,
  GetPlaylistResponse,
  ReorderPlaylistRequest,
  ReorderPlaylistResponse,
} from '@syfity/shared';

import type { ApiFailureResponse } from '@/shared/types/api';
import type { PlaylistItem } from '@/shared/types/domain';

import { roomFixture } from '../fixtures/roomFixture';

const API = '*/api/v1';

let playlist: PlaylistItem[] = [...roomFixture.playlist];

const notFound = (code: string, message: string) =>
  HttpResponse.json({ success: false, error: { code, message } } satisfies ApiFailureResponse, {
    status: 404,
  });

const isFixtureRoom = (roomId: string | readonly string[] | undefined) =>
  roomId === roomFixture.room.id;

export const playlistHandlers = [
  http.get(`${API}/rooms/:roomId/playlist`, ({ params }) => {
    if (!isFixtureRoom(params.roomId)) {
      return notFound('ROOM_NOT_FOUND', 'Room not found');
    }

    return HttpResponse.json({
      success: true,
      data: { playlist },
    } satisfies GetPlaylistResponse);
  }),
  http.post(`${API}/rooms/:roomId/playlist`, async ({ params, request }) => {
    if (!isFixtureRoom(params.roomId)) {
      return notFound('ROOM_NOT_FOUND', 'Room not found');
    }

    const body = (await request.json()) as AddPlaylistItemRequest;
    const videoId = body.videoId ?? extractYoutubeVideoId(body.youtubeUrl) ?? 'mock-video';
    const createdItem: PlaylistItem = {
      addedBy: roomFixture.room.hostId,
      channelTitle: 'Mock Channel',
      duration: 180,
      id: `mock-${videoId}`,
      position: playlist.length + 1,
      status: 'available',
      thumbnailUrl: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
      title: body.youtubeUrl ?? videoId,
      videoId,
    };

    playlist = [...playlist, createdItem];

    return HttpResponse.json({
      success: true,
      data: createdItem,
    } satisfies AddPlaylistItemResponse);
  }),
  http.delete(`${API}/rooms/:roomId/playlist/:itemId`, ({ params }) => {
    if (!isFixtureRoom(params.roomId)) {
      return notFound('ROOM_NOT_FOUND', 'Room not found');
    }

    const itemId = String(params.itemId);
    const exists = playlist.some((item) => item.id === itemId);

    if (!exists) {
      return notFound('PLAYLIST_ITEM_NOT_FOUND', 'Playlist item not found');
    }

    playlist = playlist.filter((item) => item.id !== itemId);

    return HttpResponse.json({
      success: true,
      data: { message: 'playlist item deleted' },
    } satisfies DeletePlaylistItemResponse);
  }),
  http.patch(`${API}/rooms/:roomId/playlist/reorder`, async ({ params, request }) => {
    if (!isFixtureRoom(params.roomId)) {
      return notFound('ROOM_NOT_FOUND', 'Room not found');
    }

    const body = (await request.json()) as ReorderPlaylistRequest;
    const positionById = new Map(body.items.map((item) => [item.id, item.position]));

    playlist = [...playlist]
      .map((item) => ({
        ...item,
        position: positionById.get(item.id) ?? item.position,
      }))
      .sort((a, b) => a.position - b.position);

    return HttpResponse.json({
      success: true,
      data: { message: 'playlist reordered' },
    } satisfies ReorderPlaylistResponse);
  }),
];

function extractYoutubeVideoId(url: string | undefined) {
  if (!url) {
    return null;
  }

  const directMatch = url.match(/[?&]v=([^&]+)/);
  const shortMatch = url.match(/youtu\.be\/([^?&]+)/);
  return directMatch?.[1] ?? shortMatch?.[1] ?? null;
}
