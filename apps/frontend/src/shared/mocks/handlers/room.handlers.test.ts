import { describe, expect, it } from 'vitest';

import type { JoinRoomResponse } from '@syfity/shared';

import { roomFixture } from '@/shared/mocks/fixtures/roomFixture';
import type { ApiResponse } from '@/shared/types/api';

const joinRoom = async (body: unknown) => {
  const response = await fetch('http://localhost:4000/api/v1/rooms/join', {
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
    method: 'POST',
  });
  const data = (await response.json()) as ApiResponse<JoinRoomResponse['data']>;

  return { data, status: response.status };
};

describe('room MSW handlers', () => {
  it('joins the fixture room by inviteCode', async () => {
    const { data, status } = await joinRoom({ inviteCode: roomFixture.room.inviteCode });

    expect(status).toBe(200);
    expect(data).toEqual({
      success: true,
      data: expect.objectContaining({
        playlist: roomFixture.playlist,
        room: roomFixture.room,
      }),
    });
  });

  it('joins the fixture room by roomId for protected route preview', async () => {
    const { data, status } = await joinRoom({ roomId: roomFixture.room.id });

    expect(status).toBe(200);
    expect(data).toEqual({
      success: true,
      data: expect.objectContaining({
        playlist: roomFixture.playlist,
        room: roomFixture.room,
      }),
    });
  });
});
