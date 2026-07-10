import { http, HttpResponse } from 'msw';

import type {
  CloseRoomResponse,
  CreateRoomRequest,
  CreateRoomResponse,
  GetRoomResponse,
  JoinRoomRequest,
  JoinRoomResponse,
  RecentRoomsResponse,
  UpdateRoomRequest,
  UpdateRoomResponse,
} from '@syfity/shared';

import type { ApiFailureResponse } from '@/shared/types/api';

import { roomFixture } from '../fixtures/roomFixture';

const API = '*/api/v1';

const notFound = (code: string, message: string) =>
  HttpResponse.json({ success: false, error: { code, message } } satisfies ApiFailureResponse, {
    status: 404,
  });

export const roomHandlers = [
  http.get(`${API}/rooms/recent`, () =>
    HttpResponse.json({
      success: true,
      data: {
        rooms: [
          {
            id: roomFixture.room.id,
            inviteCode: roomFixture.room.inviteCode,
            lastJoinedAt: new Date().toISOString(),
            name: roomFixture.room.name,
          },
        ],
      },
    } satisfies RecentRoomsResponse),
  ),
  http.post(`${API}/rooms`, async ({ request }) => {
    const body = (await request.json()) as CreateRoomRequest;

    return HttpResponse.json({
      success: true,
      data: {
        createdAt: new Date().toISOString(),
        id: roomFixture.room.id,
        inviteCode: roomFixture.room.inviteCode,
        name: body.name,
        status: 'active',
      },
    } satisfies CreateRoomResponse);
  }),
  http.post(`${API}/rooms/join`, async ({ request }) => {
    const body = (await request.json()) as Partial<JoinRoomRequest>;

    if (body.inviteCode !== roomFixture.room.inviteCode) {
      return notFound('ROOM_NOT_FOUND', 'Room not found');
    }

    return HttpResponse.json({
      success: true,
      data: {
        members: roomFixture.members,
        playbackState: {
          ...roomFixture.playbackState,
          updatedAt: roomFixture.playbackState.updatedAt ?? new Date().toISOString(),
        },
        playlist: roomFixture.playlist,
        recentChats: roomFixture.chats.map((chat) => ({
          profileImage: null,
          ...chat,
        })),
        room: roomFixture.room,
      },
    } satisfies JoinRoomResponse);
  }),
  http.get(`${API}/rooms/:roomId`, ({ params }) => {
    if (params.roomId !== roomFixture.room.id) {
      return notFound('ROOM_NOT_FOUND', 'Room not found');
    }

    return HttpResponse.json({
      success: true,
      data: {
        ...roomFixture.room,
        createdAt: new Date().toISOString(),
      },
    } satisfies GetRoomResponse);
  }),
  http.patch(`${API}/rooms/:roomId`, async ({ params, request }) => {
    if (params.roomId !== roomFixture.room.id) {
      return notFound('ROOM_NOT_FOUND', 'Room not found');
    }

    const body = (await request.json()) as UpdateRoomRequest;

    return HttpResponse.json({
      success: true,
      data: {
        id: roomFixture.room.id,
        name: body.name,
        updatedAt: new Date().toISOString(),
      },
    } satisfies UpdateRoomResponse);
  }),
  http.post(`${API}/rooms/:roomId/close`, ({ params }) => {
    if (params.roomId !== roomFixture.room.id) {
      return notFound('ROOM_NOT_FOUND', 'Room not found');
    }

    return HttpResponse.json({
      success: true,
      data: { message: 'room closed' },
    } satisfies CloseRoomResponse);
  }),
];
