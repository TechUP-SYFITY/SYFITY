// YouTube 스텁 배선 검증.
//
// UI를 거치지 않고 API만 확인한다. 목적은 화면 동작이 아니라
// "E2E_MODE가 env → config → createYouTubeClient까지 실제로 전달되는가"이기 때문이다.
// 이 배선이 끊기면 이후 모든 Playlist·검색 시나리오가 실제 YouTube API를 때리게 된다.
import { expect, test } from '../fixtures/test';
import { signAccessToken } from '../support/auth';
import { API_URL } from '../support/env';

const authHeaders = () => ({ cookie: `access_token=${signAccessToken('host')}` });

test.describe('YouTube 스텁', () => {
  test('검색이 고정된 스텁 결과를 반환한다', async ({ request }) => {
    const response = await request.get(`${API_URL}/search`, {
      params: { q: '테스트 트랙 01' },
      headers: authHeaders(),
    });

    expect(response.ok()).toBe(true);
    expect(await response.json()).toMatchObject({
      success: true,
      data: {
        items: [
          {
            videoId: 'e2eTrack001',
            title: 'E2E 테스트 트랙 01',
            channelTitle: 'Syfity E2E Channel',
            duration: 181,
          },
        ],
      },
    });
  });

  test('음악 카테고리가 아닌 영상은 검색 결과에서 빠진다', async ({ request }) => {
    const response = await request.get(`${API_URL}/search`, {
      params: { q: 'E2E' },
      headers: authHeaders(),
    });

    const body = (await response.json()) as { data: { items: Array<{ videoId: string }> } };
    const videoIds = body.data.items.map((item) => item.videoId);

    expect(videoIds).not.toContain('e2eNonMusic');
    expect(videoIds).toContain('e2eTrack001');
  });

  test('일치하는 곡이 없으면 빈 목록을 반환한다', async ({ request }) => {
    const response = await request.get(`${API_URL}/search`, {
      params: { q: '카탈로그에 없는 검색어' },
      headers: authHeaders(),
    });

    expect(await response.json()).toEqual({ success: true, data: { items: [] } });
  });

  test('썸네일이 외부 요청 없는 data URI다', async ({ request }) => {
    const response = await request.get(`${API_URL}/search`, {
      params: { q: '테스트 트랙' },
      headers: authHeaders(),
    });

    const body = (await response.json()) as { data: { items: Array<{ thumbnailUrl: string }> } };

    expect(body.data.items.length).toBeGreaterThan(0);
    for (const item of body.data.items) {
      expect(item.thumbnailUrl).toMatch(/^data:image\//);
    }
  });
});
