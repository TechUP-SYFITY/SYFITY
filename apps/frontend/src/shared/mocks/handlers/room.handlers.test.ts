import { describe, expect, it } from 'vitest';

import type {
  CreateRoomMembershipResponse,
  CreateRoomResponse,
  GetMyRoomsResponse,
} from '@syfity/shared';

import { roomFixture } from '@/shared/mocks/fixtures/roomFixture';
import type { ApiResponse } from '@/shared/types/api';

const createMembership = async (body: unknown) => {
  const response = await fetch('http://localhost:4000/api/v1/room-memberships', {
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
    method: 'POST',
  });
  const data = (await response.json()) as ApiResponse<CreateRoomMembershipResponse['data']>;

  return { data, status: response.status };
};

const createRoom = async (body: unknown) => {
  const response = await fetch('http://localhost:4000/api/v1/rooms', {
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
    method: 'POST',
  });
  const data = (await response.json()) as ApiResponse<CreateRoomResponse['data']>;

  return { data, status: response.status };
};

const getMyRooms = async () => {
  const response = await fetch('http://localhost:4000/api/v1/rooms/mine');
  const data = (await response.json()) as ApiResponse<GetMyRoomsResponse['data']>;

  return { data, status: response.status };
};

describe('room MSW handlers', () => {
  it('creates the fixture room so follow-up room entry can resolve', async () => {
    const { data, status } = await createRoom({ name: '테스트 방' });

    expect(status).toBe(200);
    expect(data).toEqual({
      success: true,
      data: expect.objectContaining({
        id: roomFixture.room.id,
        inviteCode: roomFixture.room.inviteCode,
        name: '테스트 방',
      }),
    });
  });

  it('creates fixture room membership by inviteCode', async () => {
    const { data, status } = await createMembership({ inviteCode: roomFixture.room.inviteCode });

    expect(status).toBe(201);
    expect(data).toEqual({
      success: true,
      data: expect.objectContaining({
        room: roomFixture.room,
      }),
    });
  });

  it('returns only active and closed rooms from my Room endpoint', async () => {
    const { data, status } = await getMyRooms();

    expect(status).toBe(200);
    expect(data.success).toBe(true);

    if (data.success) {
      expect(data.data.rooms.map((room) => room.status)).toEqual(['active', 'closed']);
    }
  });

  it('keeps roomId-only membership unsupported to match the backend contract', async () => {
    const { data, status } = await createMembership({ roomId: roomFixture.room.id });

    expect(status).toBe(404);
    expect(data).toEqual({
      success: false,
      error: {
        code: 'ROOM_NOT_FOUND',
        message: 'Room not found',
      },
    });
  });
});
