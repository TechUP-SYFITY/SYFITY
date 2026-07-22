import { http, HttpResponse } from 'msw';

import type {
  CreateRoomMembershipRequest,
  CreateRoomMembershipResponse,
  CreateRoomRequest,
  CreateRoomResponse,
  GetMyRoomsResponse,
  GetRoomResponse,
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
  http.get(`${API}/rooms/mine`, () => {
    const now = new Date();

    return HttpResponse.json({
      success: true,
      data: {
        rooms: [
          {
            closedAt: null,
            id: roomFixture.room.id,
            name: roomFixture.room.name,
            status: 'active',
            updatedAt: now.toISOString(),
          },
          {
            closedAt: new Date(now.getTime() - 24 * 60 * 60_000).toISOString(),
            id: 'closed-room-fixture',
            name: '지난 플레이리스트',
            status: 'closed',
            updatedAt: new Date(now.getTime() - 24 * 60 * 60_000).toISOString(),
          },
        ],
      },
    } satisfies GetMyRoomsResponse);
  }),
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
  http.post(`${API}/room-memberships`, async ({ request }) => {
    const body = (await request.json()) as Partial<CreateRoomMembershipRequest>;

    if (body.inviteCode !== roomFixture.room.inviteCode) {
      return notFound('ROOM_NOT_FOUND', 'Room not found');
    }

    return HttpResponse.json(
      {
        success: true,
        data: {
          room: roomFixture.room,
        },
      } satisfies CreateRoomMembershipResponse,
      { status: 201 },
    );
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

    const isClosed = 'status' in body && body.status === 'closed';
    return HttpResponse.json({
      success: true,
      data: {
        id: roomFixture.room.id,
        name: 'name' in body ? body.name : roomFixture.room.name,
        status: isClosed ? 'closed' : 'active',
        closedAt: isClosed ? new Date().toISOString() : null,
        updatedAt: new Date().toISOString(),
      },
    } satisfies UpdateRoomResponse);
  }),
];
