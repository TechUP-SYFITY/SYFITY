// 시나리오의 사전 조건을 REST API로 만든다.
// DB 직접 시드보다 느리지만, 실제 서비스가 만드는 것과 같은 상태가 보장된다.
// (예: Host 참여 이력·초대 코드 생성 규칙을 테스트가 흉내 내지 않아도 된다)
import type { APIRequestContext } from '@playwright/test';

import { signAccessToken } from './auth';
import { API_URL, type TestUserKey } from './env';

const authHeaders = (user: TestUserKey) => ({
  cookie: `access_token=${signAccessToken(user)}`,
});

export interface CreatedRoom {
  id: string;
  name: string;
  inviteCode: string;
}

const unwrap = async <T>(response: {
  ok: () => boolean;
  status: () => number;
  text: () => Promise<string>;
}) => {
  const body = await response.text();
  if (!response.ok()) {
    throw new Error(`[e2e] API 요청 실패 (${response.status()}): ${body}`);
  }

  return (JSON.parse(body) as { data: T }).data;
};

export const createRoom = async (
  request: APIRequestContext,
  user: TestUserKey,
  name = 'E2E Room',
): Promise<CreatedRoom> => {
  const response = await request.post(`${API_URL}/rooms`, {
    data: { name },
    headers: authHeaders(user),
  });

  return unwrap<CreatedRoom>(response);
};

export const joinRoom = async (
  request: APIRequestContext,
  user: TestUserKey,
  inviteCode: string,
) => {
  const response = await request.post(`${API_URL}/room-memberships`, {
    data: { inviteCode },
    headers: authHeaders(user),
  });

  return unwrap<{ room: CreatedRoom }>(response);
};

export const addPlaylistItem = async (
  request: APIRequestContext,
  user: TestUserKey,
  roomId: string,
  videoId: string,
) => {
  const response = await request.post(`${API_URL}/rooms/${roomId}/playlist`, {
    data: { videoId },
    headers: authHeaders(user),
  });

  return unwrap<{ id: string; videoId: string; title: string }>(response);
};
